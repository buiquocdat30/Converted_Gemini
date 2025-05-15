import React, { useState, useContext } from "react";
import UploadForm from "../components/UploadForm/UploadForm";
import TranslatorApp from "../components/TranslatorApp/TranslatorApp";
import StoryInfoForm from "../components/StoryInfoForm/StoryInfoForm";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import "../pages/pageCSS/Translate.css";

const Translate = () => {
  const { isLoggedIn } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("new");
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [currentStory, setCurrentStory] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleParsedChapters = (parsedChapters, key, model, file) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    setChapters(parsedChapters);
    setApiKey(key);
    setModel(model);
    setFileName(file.name);
  };

  const handleUpdateChapterContent = (index, newContent) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, content: newContent } : ch))
    );
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
      const response = await axios.put(
        `http://localhost:8000/user/library/${currentStory.id}`,
        storyInfo,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCurrentStory(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi cập nhật truyện:", error);
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
            {/* TODO: Thêm danh sách truyện đang dịch và chức năng load truyện */}
            <p>Danh sách truyện đang dịch sẽ được hiển thị ở đây</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Translate;
