import React, { useState } from "react";
import { saveAs } from "file-saver";
import "../css/TranslateViewer.css";

const TranslationViewer = ({ chapters }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState([chapters[0].content || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentContent = history[historyIndex];

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleChange = (e) => {
    const newContent = e.target.value;
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newContent]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    alert("📋 Đã sao chép nội dung chương!");
  };

  const handleExport = (type) => {
    const fullText = chapters
      .map((ch, i) =>
        i === currentIndex ? currentContent : ch.content || ""
      )
      .join("\n\n");

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, type === "epub" ? "translated.epub" : "translated.txt");
  };

  const goToChapter = (offset) => {
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < chapters.length) {
      setCurrentIndex(newIndex);
      const newContent = chapters[newIndex].content || "";
      setHistory([newContent]);
      setHistoryIndex(0);
      setIsEditing(false);
    }
  };

  return (
    <div className="translation-viewer">
      <div className="menu-bar">
        <button onClick={() => goToChapter(-1)} disabled={currentIndex === 0}>
          ◀ Back
        </button>
        <button onClick={() => goToChapter(1)} disabled={currentIndex === chapters.length - 1}>
          Next ▶
        </button>
        <button onClick={handleEdit}>✏️ Sửa</button>
        <button onClick={handleCopy}>📋 Copy</button>
        <button onClick={handleUndo} disabled={historyIndex === 0}>
          ↩ Undo
        </button>
        <button onClick={handleRedo} disabled={historyIndex === history.length - 1}>
          ↪ Redo
        </button>
        <button onClick={() => handleExport("epub")}>📘 Xuất EPUB</button>
        <button onClick={() => handleExport("txt")}>📄 Xuất Text</button>
      </div>

      <h3>
        {chapters[currentIndex]?.title || `Chương ${currentIndex + 1}`}
      </h3>

      {isEditing ? (
        <textarea
          value={currentContent}
          onChange={handleChange}
          style={{ width: "100%", height: 300 }}
        />
      ) : (
        <div className="translated-content">{currentContent}</div>
      )}
    </div>
  );
};

export default TranslationViewer;
