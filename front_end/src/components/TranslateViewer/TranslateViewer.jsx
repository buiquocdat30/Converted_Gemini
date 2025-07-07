import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";
import { cleanContentForExport } from "../../utils/fileHandlers";
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
 
  const [history, setHistory] = useState([
      chapters[currentIndex]?.translated ||
      chapters[currentIndex]?.content ||
      "",
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentContent = history[historyIndex];

  useEffect(() => {
    const chapter = chapters[currentIndex];

    // Lấy nội dung và tiêu đề từ chapter hiện tại
    const newContent = chapter?.translatedContent || chapter?.content || "";
    const title = chapter?.translatedTitle || chapter?.chapterName || chapter?.title || `Chương ${currentIndex + 1}`;

    setHistory([newContent]);
    setHistoryIndex(0);
    setIsEditing(false);
  }, [chapters, currentIndex, selectedChapterIndex]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const chapter = chapters[currentIndex];
    // Log để kiểm tra cấu trúc dữ liệu
    console.log("📖 Thông tin chapter hiện tại:", {
      chapter,
      currentIndex,
      chapterNumber: chapter?.chapterNumber,
      chapterKeys: chapter ? Object.keys(chapter) : [],
      allChapters: chapters.map(ch => ({
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        chapterName: ch.chapterName,
        keys: Object.keys(ch)
      }))
    });

    // Lấy chapterNumber từ currentIndex + 1 nếu không có trong chapter
    const chapterNumber = chapter?.chapterNumber || (currentIndex + 1);
    
    // Nếu chưa có bản dịch thì lưu vào content, ngược lại lưu vào translatedContent
    if (!chapter.translatedContent) {
      onUpdateChapter(chapter.storyId, chapterNumber, chapter.chapterName || chapter.title, currentContent, chapter.duration || 0);
    } else {
      onUpdateChapter(chapter.storyId, chapterNumber, chapter.translatedTitle || chapter.title, currentContent, chapter.duration || 0);
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
        title: ch.translatedTitle || ch.chapterName || `Chương ${i + 1}`,
        content: ch.translatedContent?.trim(),
      }))
      .filter((ch) => ch.content); // Chỉ lấy chương có nội dung dịch

    if (translatedChapters.length === 0) {
      toast.error("Không có chương nào đã được dịch để xuất.");
      return;
    }

    // Tạo nội dung file với nội dung đã được lọc sạch
    const fullText = translatedChapters
      .map((ch) => {
        const cleanedContent = cleanContentForExport(ch.content);
        return `${ch.title}\n\n${cleanedContent}`;
      })
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
    
    toast.success(`✅ Đã xuất file ${type.toUpperCase()} thành công! (Đã loại bỏ phần glossary)`);
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
          Chương {chapters[currentIndex]?.chapterNumber || 0} / {chapters.length}
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
            onClick={() => {
              const chapter = chapters[currentIndex];
              const chapterNumber = chapter?.chapterNumber || (currentIndex + 1);
              onUpdateChapter(chapter.storyId, chapterNumber, chapter.translatedTitle || chapter.title, currentContent, chapter.duration || 0);
            }}
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

        {/* Hiển thị glossary nếu có */}
        {chapters[currentIndex]?.glossary && (
          <div className="chapter-glossary" style={{ marginTop: 24, background: "#f8f8f8", padding: 12, borderRadius: 8 }}>
            <h4 style={{ margin: 0, color: '#2d6a4f' }}>📚 THƯ VIỆN TỪ MỚI:</h4>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
              {chapters[currentIndex].glossary}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslateViewer;
