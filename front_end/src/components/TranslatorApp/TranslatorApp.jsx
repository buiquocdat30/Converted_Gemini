import React, { useState } from "react";
import ChapterList from "../ChapterList/ChapterList";
import TranslateViewer from "../TranslateViewer/TranslateViewer";
import ConverteKeyInput from "../ConverteKeyInput/ConverteKeyInput";
import { translateSingleChapter } from "../../services/translateSingleChapter.jsx";
import "./TranslatorApp.css";

const TranslatorApp = ({
  apiKey,
  chapters,
  setChapters,
  model,
  onUpdateChapter,
  onSelectChapter,
}) => {
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || ""); //key đã nhập
  const [translatedChapters, setTranslatedChapters] = useState([]); //đã dịch
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng
  const [tempKey, setTempKey] = useState(apiKey || ""); //kiểm soát key
  const [isMenuOpen, setIsMenuOpen] = useState(false); //kiểm soát topmenu

  //Chọn chương để Nhảy
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);

  //hàm chọn chương để Nhảy
  const handleSelectJumbChapter = (index) => {
    setSelectedChapterIndex(index);
  };

  // Hàm xử lý khi chuyển chương
  const handleChapterChange = (newIndex) => {
    setCurrentIndex(newIndex);
    // Tính toán trang mới dựa trên index
    const chaptersPerPage = 10;
    const newPage = Math.floor(newIndex / chaptersPerPage) + 1;
    // Gọi callback để cập nhật trang trong ChapterList
    onSelectChapter?.(newIndex, newPage);
  };

  // Khi nhận kết quả dịch từ ChapterList
  const handleTranslationResult = (index, translated, translatedTitle) => {
    setTranslatedChapters((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...(chapters[index] || {}), // lấy từ chương gốc nếu chưa có
        translated, // thêm bản dịch mới
        translatedTitle,
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

  //hàm check key
  const handleCheckKey = async () => {
    if (!tempKey) return;

    try {
      const fakeChapter = {
        title: "Key Check",
        content: "This is a test. Please check if the key is valid.",
      };

      await translateSingleChapter({
        index: 0,
        chapters: [fakeChapter],
        apiKey: tempKey,
        onTranslationResult: (_, translated) => {
          if (
            translated.toLowerCase().includes("kiểm tra") ||
            translated.toLowerCase().includes("dịch")
          ) {
            alert("✅ Key hợp lệ và có thể sử dụng.");
          } else {
            alert("⚠️ Key không trả kết quả dịch rõ ràng.");
          }
        },
        onSelectChapter: () => {}, // tránh lỗi
        setProgress: () => {},
        setResults: () => {},
        setErrorMessages: () => {},
        setTranslatedCount: () => {},
        setTotalProgress: () => {},
      });
    } catch (err) {
      console.error("Lỗi khi kiểm tra key:", err);
      alert("❌ Key không hợp lệ hoặc đã vượt hạn mức.");
    }
  };

  return (
    <div className="translator-app-wrapper">
      <h2
        className="translator-app-title"
        onClick={() => (window.location.href = "/")}
      >
        📘 Gemini Converte{" "}
      </h2>
      {/* Nút tròn để mở menu */}
      <div
        className="menu-toggle-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        🔑
      </div>
      <div className={`top-menu ${isMenuOpen ? "open" : ""}`}>
        <h3>📘 Menu key</h3>
        <div className="top-menu-body">
          <button onClick={() => (window.location.href = "/")}>
            🏠 Trang chủ
          </button>
          <ConverteKeyInput apiKey={tempKey} setApiKey={setTempKey} />
          <div className="converter-key-container">
            <button
              className="confirm-key-btn"
              onClick={handleCurrentKey}
              disabled={!tempKey || currentApiKey === tempKey}
            >
              🔑 Nhập key
            </button>
            <button className="check-key-btn" onClick={handleCheckKey}>
              🔑 Kiểm tra key
            </button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="content">
        <div className="chapter-list-container">
          <ChapterList
            chapters={mergedChapters}
            apiKey={currentApiKey}
            model={model}
            onTranslationResult={handleTranslationResult}
            onSelectChapter={handleChapterChange}
            onSelectJumbChapter={handleSelectJumbChapter}
            currentIndex={currentIndex}
          />
        </div>
        <div className="translate-viewer-container">
          <TranslateViewer
            chapters={mergedChapters}
            onUpdateChapter={handleEditChapter}
            currentIndex={currentIndex}
            onChangeIndex={handleChapterChange}
            selectedChapterIndex={selectedChapterIndex}
          />
        </div>
      </div>
    </div>
  );
};

export default TranslatorApp;
