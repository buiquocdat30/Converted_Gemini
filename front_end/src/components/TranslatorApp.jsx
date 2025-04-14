import React, { useState } from "react";
import ChapterList from "./ChapterList";
import TranslateViewer from "./TranslateViewer";

const TranslatorApp = ({ apiKey, chapters, setChapters, onUpdateChapter }) => {
  const [translatedChapters, setTranslatedChapters] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng


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
        translated:newContent,
      };
      return updated;
    });
    
  };

  const mergedChapters = chapters.map((ch, i) => ({
    ...ch,
    ...translatedChapters[i],
  }));
  
  return (
    <div style={{ display: "flex", gap: 30 }}>
      <div style={{ flex: 1 }}>
        <ChapterList
          chapters={mergedChapters}
          apiKey={apiKey}
          onTranslationResult={handleTranslationResult}
          onSelectChapter={(idx) => setCurrentIndex(idx)} // 👈 truyền hàm chọn chương
     
        />
      </div>
      <div style={{ flex: 2 }}>
        <TranslateViewer
          chapters={translatedChapters}
          onUpdateChapter={handleEditChapter}
          currentIndex={currentIndex} // 👈 truyền index xuống
        onChangeIndex={(idx) => setCurrentIndex(idx)} // 👈 để TranslateViewer chuyển chương
        />
      </div>
    </div>
  );
};

export default TranslatorApp;
