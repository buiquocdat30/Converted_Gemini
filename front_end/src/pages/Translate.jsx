import React, { useState, useContext, useEffect } from "react";
import UploadForm from "../components/UploadForm/UploadForm";
import TranslatorApp from "../components/TranslatorApp/TranslatorApp";
import StoryInfoForm from "../components/StoryInfoForm/StoryInfoForm";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import "../pages/pageCSS/Translate.css";

const Translate = () => {
  const { isLoggedIn, stories, fetchStories } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("new");
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [currentStory, setCurrentStory] = useState(null);
  const [fileName, setFileName] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const storyId = searchParams.get("storyId");
    const tab = searchParams.get("tab");
    
    if (storyId && tab === "translating") {
      setActiveTab("translating");
      loadTranslatingStory(storyId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStories();
    }
  }, [isLoggedIn]);

  const loadTranslatingStory = async (storyId) => {
    try {
      const token = localStorage.getItem("auth-token");
      console.log("🔍 Đang tải truyện với ID:", storyId);
      const response = await axios.get(
        `http://localhost:8000/user/library/${storyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const story = response.data;
      console.log("📚 Dữ liệu truyện nhận được:", story);
      setCurrentStory(story);

      // Chuyển đổi dữ liệu chương từ UserLibraryChapter sang định dạng phù hợp
      const formattedChapters = story.chapters.map(chapter => ({
        title: chapter.chapterName,
        content: chapter.rawText,
        translated: chapter.translation?.currentText || "",
        translatedTitle: chapter.chapterName,
        chapterNumber: chapter.chapterNumber
      }));
      console.log("📝 Chương đã được format:", formattedChapters);
      setChapters(formattedChapters);
    } catch (error) {
      console.error("❌ Lỗi khi tải truyện đang dịch:", error);
    }
  };

  const handleParsedChapters = (parsedChapters, key, model, file) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    setChapters(parsedChapters);
    setApiKey(key);
    setModel(model);
    setFileName(file.name);
  };

  const handleUpdateChapterContent = async (index, newContent) => {
    try {
      const token = localStorage.getItem("auth-token");
      const chapter = chapters[index];
      
      // Cập nhật nội dung chương trong database
      await axios.put(
        `http://localhost:8000/user/library/chapter/${chapter.id}/translation`,
        {
          currentText: newContent
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Cập nhật state local
      setChapters((prev) =>
        prev.map((ch, i) => (i === index ? { ...ch, translated: newContent } : ch))
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật nội dung chương:", error);
    }
  };

  const handleSaveStory = async (storyInfo) => {
    try {
      const token = localStorage.getItem("auth-token");
      const response = await axios.post(
        "http://localhost:8000/user/library",
        {
          ...storyInfo,
          chapters: chapters.map((ch) => ({
            title: ch.title,
            content: ch.content,
            translated: ch.translated || "",
            translatedTitle: ch.translatedTitle || ch.title,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCurrentStory(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lưu truyện:", error);
      throw error;
    }
  };

  const handleUpdateStory = async (storyInfo) => {
    try {
      const token = localStorage.getItem("auth-token");
      console.log("🔄 Đang cập nhật truyện:", currentStory.id);
      console.log("📋 Thông tin cập nhật:", storyInfo);
      
      const response = await axios.put(
        `http://localhost:8000/user/library/${currentStory.id}`,
        storyInfo,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("✅ Cập nhật thành công:", response.data);
      setCurrentStory(response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật truyện:", error);
      throw error;
    }
  };

  const renderTranslatorContent = () => {
    if (chapters.length === 0) {
      return <UploadForm onFileParsed={handleParsedChapters} />;
    }

    return (
      <>
        <TranslatorApp
          apiKey={apiKey}
          chapters={chapters}
          model={model}
          setChapters={setChapters}
          onUpdateChapter={handleUpdateChapterContent}
        />
        <StoryInfoForm
          story={currentStory}
          onSave={activeTab === "new" ? handleSaveStory : handleUpdateStory}
          isEditing={activeTab === "translating"}
          fileName={fileName}
          onStorySaved={(storyInfo) => setCurrentStory(storyInfo)}
        />
      </>
    );
  };

  if (!isLoggedIn) {
    return (
      <div>
        {chapters.length === 0 ? (
          <UploadForm onFileParsed={handleParsedChapters} />
        ) : (
          <TranslatorApp
            apiKey={apiKey}
            chapters={chapters}
            model={model}
            setChapters={setChapters}
            onUpdateChapter={handleUpdateChapterContent}
          />
        )}
      </div>
    );
  }

  return (
    <div className="translate-page">
      <div className="translate-tabs">
        <button
          className={`tab-button ${activeTab === "new" ? "active" : ""}`}
          onClick={() => setActiveTab("new")}
        >
          Dịch truyện mới
        </button>
        <button
          className={`tab-button ${
            activeTab === "translating" ? "active" : ""
          }`}
          onClick={() => setActiveTab("translating")}
        >
          Truyện đang dịch
        </button>
      </div>
      <div className="tab-content">
        {activeTab === "new" ? (
          renderTranslatorContent()
        ) : (
          <div className="translating-stories">
            {currentStory ? (
              <>
                {console.log("📚 Truyện hiện tại:", currentStory)}
                {console.log("📝 Danh sách chương:", chapters)}
                {renderTranslatorContent()}
              </>
            ) : (
              <p>Vui lòng chọn một truyện để tiếp tục dịch</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Translate;
