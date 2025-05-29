import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import "./TranslateViewer.css";

const TranslateViewer = ({
  chapters,
  onUpdateChapter,
  currentIndex,
  onChangeIndex,
  selectedChapterIndex,
  onRetranslate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  console.log('vị trí chương hiện tại:',currentIndex)
  const [history, setHistory] = useState([
      chapters[currentIndex]?.translated ||
      chapters[currentIndex]?.content ||
      "",
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentContent = history[historyIndex];

  useEffect(() => {
    console.log("TranslateViewer - Current Index:", currentIndex);
    const chapter = chapters[currentIndex];
    console.log("TranslateViewer - Chapter data:", chapter);

    // Lấy nội dung và tiêu đề từ chapter hiện tại
    const newContent = chapter?.translated || chapter?.content || "";
    const title = chapter?.chapterName || chapter?.title || `Chương ${currentIndex + 1}`;

    console.log(`📌 Nội dung tiêu đề chương: ${currentIndex + 1}: ${title}`);
    console.log(`📌 Nội dung chương:`, newContent);

    setHistory([newContent]);
    setHistoryIndex(0);
    setIsEditing(false);
  }, [chapters, currentIndex, selectedChapterIndex]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const chapter = chapters[currentIndex];
    // Nếu chưa có bản dịch thì lưu vào rawText, ngược lại lưu vào translated
    if (!chapter.translated) {
      onUpdateChapter(currentIndex, currentContent, 'rawText');
    } else {
      onUpdateChapter(currentIndex, currentContent, 'translated');
    }
    setIsEditing(false);
    toast.success("💾 Đã lưu nội dung chương!");
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
    toast.success("📋 Đã sao chép nội dung chương!");
  };

  const handleExport = (type) => {
    // Lọc ra các chương đã dịch
    const translatedChapters = chapters
      .map((ch, i) => ({
        title: ch.chapterName || `Chương ${i + 1}`,
        content: ch.translated?.trim(),
      }))
      .filter((ch) => ch.content); // Chỉ lấy chương có nội dung dịch

    if (translatedChapters.length === 0) {
      toast.error("Không có chương nào đã được dịch để xuất.");
      return;
    }

    // Tạo nội dung file
    const fullText = translatedChapters
      .map((ch) => `${ch.title}\n\n${ch.content}`)
      .join("\n\n");

    // Tạo tên file
    let fileName = "translated";
    if (translatedChapters.length === 1) {
      fileName = translatedChapters[0].title;
    } else {
      const [first, second] = translatedChapters;
      fileName = `${first.title} - ${second.title}`;
    }

    // Thêm đuôi file
    fileName += type === "epub" ? ".epub" : ".txt";

    // Tạo và lưu file
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, fileName);
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
      <h3>📝Nội dung chương</h3>
      <div className="menu-bar">
        <div className="chapter-index">
          Chương {chapters[currentIndex]?.chapterNumber || currentIndex + 1} / {chapters.length}
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
         
        </div>
        <div className="row">
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
          <button 
            onClick={() => onUpdateChapter(currentIndex, currentContent, 'translated')}
            disabled={!chapters[currentIndex]?.translated}
          >
            💾 Lưu 
          </button>
          <button 
            onClick={() => {
              // Gọi hàm dịch lại chương hiện tại
              if (onRetranslate) {
                onRetranslate(currentIndex);
              }
            }}
            disabled={!chapters[currentIndex]?.translated}
          >
            🔄 Dịch lại
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
            console.log("📌 vị trí chương đang hiển thị:", chapter);
            const translatedTitle = chapter?.translatedTitle;
            const displayTitle =
              translatedTitle ||
              chapter?.chapterName ||
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
          <div className="translated-content">
            {currentContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslateViewer;
