import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import "../css/TranslateViewer.css";

const TranslateViewer = ({ chapters, onUpdateChapter,currentIndex, onChangeIndex }) => {
  const [localIndex, setLocalIndex] = useState(currentIndex); // Đổi tên state thành localIndex
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState([
    chapters[0]?.translated || chapters[0]?.content || ""
  ]);
  
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentContent = history[historyIndex];

   // Sử dụng useEffect để đồng bộ với props currentIndex
   useEffect(() => {
    setLocalIndex(currentIndex); // Cập nhật localIndex khi props currentIndex thay đổi
    const newContent =
      chapters[currentIndex]?.translated ||
      chapters[currentIndex]?.content ||
      "";
    setHistory([newContent]);
    setHistoryIndex(0);
    setIsEditing(false);
  }, [chapters, currentIndex]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateChapter(localIndex, currentContent); // gọi hàm cha
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
    const fullText = chapters
      .map((ch, i) => (i === localIndex  ? currentContent : ch.content || ""))
      .join("\n\n");

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, type === "epub" ? "translated.epub" : "translated.txt");
  };
  console.log('toàn bộ các chương',currentContent)
  const goToChapter = (offset) => {
    const newIndex = localIndex  + offset;
    if (newIndex >= 0 && newIndex < chapters.length) {
      // nếu đang chỉnh sửa thì hỏi người dùng trước
      if (
        isEditing &&
        !window.confirm("❗Bạn chưa lưu thay đổi. Vẫn muốn chuyển chương?")
      ) {
        return;
      }
      setLocalIndex(newIndex);
      const newContent = chapters[newIndex].content || "";
      setHistory([newContent]);
      setHistoryIndex(0);
      setIsEditing(false);
      onChangeIndex?.(newIndex); // 👈 sử dụng prop
    }
  };

  return (
    <div className="translation-viewer">
      <div className="menu-bar">
        <div className="chapter-index">
          Chương {currentIndex + 1} / {chapters.length}
        </div>
        <div className="row">
          <button onClick={() => goToChapter(-1)} disabled={localIndex  === 0}>
            ◀ Back
          </button>
          <button
            onClick={() => goToChapter(1)}
            disabled={localIndex  === chapters.length - 1}
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
          {chapters[localIndex]?.title || `Chương ${localIndex  + 1}`}
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
