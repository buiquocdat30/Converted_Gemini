import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import "../css/TranslateViewer.css";

const TranslateViewer = ({
  chapters,
  onUpdateChapter,
  currentIndex,
  onChangeIndex,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState([
    chapters[currentIndex]?.translated || chapters[currentIndex]?.content || "",
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentContent = history[historyIndex];

  useEffect(() => {
    const chapter = chapters[currentIndex];
    const newContent = chapter?.translated || chapter?.content || "";
    console.log(`📌 Nội dung chương: ${newContent}`);
    const title =
      chapter?.translatedTitle ||
      chapter?.title ||
      `Chương ${currentIndex + 1}`;

    console.log(`📌 Nội dung tiêu đề chương: ${currentIndex + 1}: ${title}`);

    setHistory([newContent]);
    setHistoryIndex(0);
    setIsEditing(false);
  }, [chapters, currentIndex]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateChapter(currentIndex, currentContent);
    setIsEditing(false);
    alert("💾 Đã lưu nội dung chương!");
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
    const chapter = chapters[currentIndex];
    const title =
      chapter?.translatedTitle ||
      chapter?.title ||
      `Chương ${currentIndex + 1}`;
    console.log(title);
    const fullText =
      `${title}\n\n` +
      chapters
        .map((ch, i) =>
          i === currentIndex
            ? currentContent
            : ch.translated || ch.content || ""
        )
        .join("\n\n");

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, type === "epub" ? "translated.epub" : "translated.txt");
  };

  const goToChapter = (offset) => {
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < chapters.length) {
      if (
        isEditing &&
        !window.confirm("❗Bạn chưa lưu thay đổi. Vẫn muốn chuyển chương?")
      ) {
        return;
      }
      onChangeIndex?.(newIndex);
    }
  };

  return (
    <div className="translation-viewer">
      <div className="menu-bar">
        <div className="chapter-index">
          Chương {currentIndex + 1} / {chapters.length}
        </div>
        <div className="row">
          <button onClick={() => goToChapter(-1)} disabled={currentIndex === 0}>
            ◀ Back
          </button>
          <button
            onClick={() => goToChapter(1)}
            disabled={currentIndex === chapters.length - 1}
          >
            Next ▶
          </button>
        </div>
        <div className="row">
          {!isEditing ? (
            <button onClick={handleEdit}>✏️ Sửa</button>
          ) : (
            <button onClick={handleSave}>✅ Hoàn tất</button>
          )}
          <button onClick={handleCopy}>📋 Copy</button>
          <button onClick={handleUndo} disabled={historyIndex === 0}>
            ↩ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
          >
            ↪ Redo
          </button>
        </div>
        <div className="row">
          <button onClick={() => handleExport("epub")}>📘 Xuất EPUB</button>
          <button onClick={() => handleExport("txt")}>📄 Xuất Text</button>
        </div>
      </div>

      <div className="viewr-content">
        <h3 className="viewr-content-title">
          {(() => {
            const chapter = chapters[currentIndex];
            const displayTitle =
              chapter?.translatedTitle ||
              chapter?.title ||
              `Chương ${currentIndex + 1}`;
            console.log("📌 Tiêu đề chương đang hiển thị:", displayTitle);
            return displayTitle;
          })()}
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
    </div>
  );
};

export default TranslateViewer;
