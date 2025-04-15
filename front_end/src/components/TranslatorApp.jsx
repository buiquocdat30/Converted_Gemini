import React, { useState } from "react";
import ChapterList from "./ChapterList";
import TranslateViewer from "./TranslateViewer";
import ConverteKeyInput from "./ConverteKeyInput";
import "../css/TranslatorApp.css";

const TranslatorApp = ({ apiKey, chapters, setChapters, onUpdateChapter }) => {
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || "");
  const [translatedChapters, setTranslatedChapters] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng
  const [tempKey, setTempKey] = useState(apiKey || "");

  // Khi nhận kết quả dịch từ ChapterList
  const handleTranslationResult = (index, translated) => {
    setTranslatedChapters((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...(chapters[index] || {}), // lấy từ chương gốc nếu chưa có
        translated, // thêm bản dịch mới
      };
      return updated;
    });
    setCurrentIndex(index); // 👈 chuyển sang chương vừa dịch
  };

  // Khi người dùng sửa lại nội dung trong TranslateViewer
  const handleEditChapter = (index, newContent) => {
    setTranslatedChapters((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...(chapters[index] || {}),
        translated: newContent,
      };
      return updated;
    });
  };

  const handleCurrentKey = () => {
    setCurrentApiKey(tempKey);
  };

  const mergedChapters = chapters.map((ch, i) => ({
    ...ch,
    ...translatedChapters[i],
  }));

  return (
    <div className="wrapper">
      <div className="top-menu">
        <h2>📘 Gemini Converte</h2>
        <div className="top-menu-body">
          <button onClick={() => (window.location.href = "/")}>
            🏠 Trang chủ
          </button>
          <ConverteKeyInput
            apiKey={tempKey}
            setApiKey={setTempKey}
          />
          <button  className="confirm-key-btn" onClick={handleCurrentKey}
          disabled={!tempKey || currentApiKey === tempKey}>
          🔑 Nhập key
          </button>
          
        </div>
      </div>

      {/* Main layout */}
      <div className="content">
        <div className="chapter-list-container">
          <ChapterList
            chapters={mergedChapters}
            apiKey={currentApiKey}
            onTranslationResult={handleTranslationResult}
            onSelectChapter={(idx) => setCurrentIndex(idx)} // 👈 truyền hàm chọn chương
          />
        </div>
        <div className="translate-viewer-container">
          <TranslateViewer
            // chapters={translatedChapters}
            chapters={mergedChapters} 
            onUpdateChapter={handleEditChapter}
            currentIndex={currentIndex} // 👈 truyền index xuống
            onChangeIndex={(idx) => setCurrentIndex(idx)} // 👈 để TranslateViewer chuyển chương
          />
        </div>
      </div>
    </div>
  );
};

export default TranslatorApp;
