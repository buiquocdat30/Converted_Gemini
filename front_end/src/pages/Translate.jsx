import React, { useState, useContext, useEffect } from "react";
import UploadForm from "../components/UploadForm/UploadForm";
import TranslatorApp from "../components/TranslatorApp/TranslatorApp";
import StoryInfoForm from "../components/StoryInfoForm/StoryInfoForm";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import UserStoryCard from "../components/UserStoryCard/UserStoryCard";
import "../pages/pageCSS/Translate.css";

const Translate = () => {
  const {
    isLoggedIn,
    stories,
    fetchStories,
    editStories,
    hideStories,
    deleteStories,
    addChapter,
    getAuthToken,
  } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("new");
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [currentStory, setCurrentStory] = useState(null);
  const [fileName, setFileName] = useState("");
  const [searchParams] = useSearchParams();
  const [translatingStories, setTranslatingStories] = useState([]);

  useEffect(() => {
    const storyId = searchParams.get("storyId");
    if (storyId) {
      loadTranslatingStory(storyId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStories();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (stories) {
      // Lọc các truyện đang dịch (isComplete == false)
      const translatingStories = stories.filter((story) => !story.isComplete);
      setTranslatingStories(translatingStories);
    }
  }, [stories]);

  // Tải truyện đang dịch dựa vào storyId từ URL
  const loadTranslatingStory = async (storyId) => {
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        console.error("❌ Không tìm thấy token xác thực");
        alert("Vui lòng đăng nhập lại để tiếp tục");
        return;
      }

      const response = await axios.get(
        `http://localhost:8000/user/library/${storyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data) {
        console.error("❌ Không nhận được dữ liệu truyện");
        alert("Không thể tải thông tin truyện. Vui lòng thử lại sau.");
        return;
      }

      const story = response.data;
      console.log("📚 Dữ liệu truyện nhận được:", story);

      // Log chi tiết từng chương để debug
      if (story.chapters && Array.isArray(story.chapters)) {
        story.chapters.forEach((chapter, index) => {
          console.log(`📖 Chương ${index + 1}:`, {
            id: chapter.id,
            chapterName: chapter.chapterName,
            chapterNumber: chapter.chapterNumber,
            rawText: chapter.rawText,
            translation: chapter.translation,
          });
        });
      }

      if (!story.chapters || !Array.isArray(story.chapters)) {
        console.error("❌ Dữ liệu chương không hợp lệ:", story.chapters);
        alert("Dữ liệu chương không hợp lệ. Vui lòng thử lại sau.");
        return;
      }

      setCurrentStory(story);

      // Chuyển đổi dữ liệu chương từ UserLibraryChapter sang định dạng phù hợp
      const formattedChapters = story.chapters.map((chapter) => {
        // Log để debug
        console.log("🔄 Đang format chương:", {
          id: chapter.id,
          chapterName: chapter.chapterName,
          chapterNumber: chapter.chapterNumber,
          rawText: chapter.rawText,
          translation: chapter.translation,
        });

        return {
          id: chapter.id,
          chapterName: chapter.chapterName,
          title: chapter.chapterName,
          // Nếu có bản dịch thì dùng translatedContent, không thì dùng rawText
          content: chapter.translation
            ? chapter.translation.translatedContent
            : chapter.rawText || "",
          translated: chapter.translation?.translatedContent || "",
          translatedTitle:
            chapter.translation?.translatedTitle || chapter.chapterName,
          chapterNumber: chapter.chapterNumber,
          // Thêm rawText để có thể truy cập nội dung gốc khi cần
          rawText: chapter.rawText || "",
        };
      });

      console.log("📝 Chương đã được format:", formattedChapters);
      setChapters(formattedChapters);
    } catch (error) {
      console.error("❌ Lỗi khi tải truyện đang dịch:", error);
      console.error("Chi tiết lỗi:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = "Không thể tải thông tin truyện. ";
      if (error.response?.status === 401) {
        errorMessage += "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.status === 404) {
        errorMessage += "Không tìm thấy truyện.";
      } else if (error.response?.status === 500) {
        errorMessage += "Lỗi server. Vui lòng thử lại sau.";
      }

      alert(errorMessage);
    }
  };

  // Xử lý khi chuyển tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Nếu chuyển sang tab "new", xóa storyId khỏi URL
    if (tab === "new") {
      const newUrl = window.location.pathname;
      window.history.pushState({}, "", newUrl);
      setCurrentStory(null);
      setChapters([]);
    }
  };

  // Xử lý khi nhận được chapters từ UploadForm
  const handleParsedChapters = (parsedChapters, key, model) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    setChapters(parsedChapters);
    setApiKey(key);
    setModel(model);
  };

  // Cập nhật nội dung chương đã dịch
  const handleUpdateChapterContent = async (index, newContent) => {
    try {
      const token = localStorage.getItem("auth-token");
      const chapter = chapters[index];

      // Cập nhật nội dung chương trong database
      await axios.put(
        `http://localhost:8000/user/library/chapter/${chapter.id}/translation`,
        {
          currentText: newContent,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Cập nhật state local
      setChapters((prev) =>
        prev.map((ch, i) =>
          i === index ? { ...ch, translated: newContent } : ch
        )
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật nội dung chương:", error);
    }
  };

  // Lưu truyện mới
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

  // Cập nhật thông tin truyện
  const handleUpdateStoryInfo = async (storyInfo) => {
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

  // Cập nhật một trường cụ thể của truyện
  const handleUpdateStoryField = (storyId, field, value) => {
    editStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    setTranslatingStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
      )
    );
  };

  // Ẩn truyện (xóa mềm)
  const handleHideStory = async (storyId) => {
    await hideStories(storyId);
    // Cập nhật state local sau khi ẩn thành công
    setTranslatingStories((prevStories) =>
      prevStories.filter((story) => story.id !== storyId)
    );
  };

  // Xóa truyện vĩnh viễn (xóa cứng)
  const handleDeleteStory = async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStories(storyId);
      // Cập nhật state local sau khi xóa thành công
      setTranslatingStories((prevStories) =>
        prevStories.filter((story) => story.id !== storyId)
      );
    }
  };

  // Xử lý khi click vào một truyện
  const handleStoryClick = (storyId) => {
    setActiveTab("translating"); // Set tab translating active
    loadTranslatingStory(storyId);
  };

  // Thêm hàm để tải lại dữ liệu sau khi thêm chương
  const handleChapterAdded = async () => {
    if (currentStory?.id) {
      await loadTranslatingStory(currentStory.id);
    }
  };

  // Render nội dung Translator
  const renderTranslatorContent = () => {
    if (activeTab === "new") {
      return (
        <UploadForm
          onParsedChapters={handleParsedChapters}
          onSaveStory={handleSaveStory}
        />
      );
    } else {
      return (
        <TranslatorApp
          apiKey={apiKey}
          chapters={chapters}
          setChapters={setChapters}
          model={model}
          onUpdateChapter={handleUpdateChapterContent}
          onSelectChapter={() => {}}
          addChapter={addChapter}
          storyId={currentStory?.id}
          getAuthToken={getAuthToken}
          onChapterAdded={handleChapterAdded}
        />
      );
    }
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
            currentStory={currentStory}
            getAuthToken={getAuthToken}
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
          onClick={() => handleTabChange("new")}
        >
          Dịch truyện mới
        </button>
        <button
          className={`tab-button ${
            activeTab === "translating" ? "active" : ""
          }`}
          onClick={() => handleTabChange("translating")}
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
              renderTranslatorContent()
            ) : (
              <div className="stories-grid">
                {translatingStories.length === 0 ? (
                  <p>Chưa có truyện nào đang dịch</p>
                ) : (
                  translatingStories.map((story) => (
                    <div
                      className="tr-story-card"
                      key={story.id}
                      onClick={() => handleStoryClick(story.id)}
                    >
                      <UserStoryCard
                        story={story}
                        onHide={() => handleHideStory(story.id)}
                        onDelete={() => handleDeleteStory(story.id)}
                        onUpdate={handleUpdateStoryField}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Translate;
