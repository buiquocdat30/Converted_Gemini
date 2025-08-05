import React, { useState, useEffect, useContext } from "react";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";
import { cleanContentForExport } from "../../utils/fileHandlers";
import { AuthContext } from "../../context/ConverteContext";
import "./TranslateViewer.css";

const TranslateViewer = ({
  chapters,
  onUpdateChapter,
  currentIndex,
  onChangeIndex,
  selectedChapterIndex,
  onRetranslate,
}) => {
  const { stories } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [exportType, setExportType] = useState('txt');

  const [history, setHistory] = useState([
      chapters[currentIndex]?.translated ||
      chapters[currentIndex]?.content ||
      "",
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentContent = history[historyIndex];

  // Lấy danh sách chương đã dịch từ ConverteContext
  const getTranslatedChapters = () => {
    // Lấy story hiện tại từ ConverteContext
    const currentStory = stories?.find(story => story.id === chapters[0]?.storyId);
    
    console.log('🔍 [DEBUG] ExportModal - Dữ liệu từ ConverteContext:', {
      stories: stories,
      currentStory: currentStory,
      chapters: chapters,
      storyId: chapters[0]?.storyId,
      hasStories: !!stories,
      hasCurrentStory: !!currentStory,
      currentStoryChapters: currentStory?.chapters
    });
    
    if (!currentStory || !currentStory.chapters) {
      // Fallback: sử dụng chapters prop nếu không có dữ liệu từ ConverteContext
      const fallbackChapters = chapters
        .map((ch, i) => ({
          title: ch.translatedTitle || ch.chapterName || `Chương ${i + 1}`,
          content: ch.translatedContent?.trim(),
          index: i,
          chapterNumber: ch.chapterNumber || i + 1
        }))
        .filter((ch) => ch.content); // Chỉ lấy chương có nội dung dịch
      
      console.log('🔍 [DEBUG] ExportModal - Sử dụng fallback chapters:', fallbackChapters);
      console.log('🔍 [DEBUG] ExportModal - Raw chapters data:', chapters.map(ch => ({
        chapterNumber: ch.chapterNumber,
        chapterName: ch.chapterName,
        translatedTitle: ch.translatedTitle,
        translatedContent: ch.translatedContent ? `${ch.translatedContent.substring(0, 50)}...` : null,
        hasTranslatedContent: !!ch.translatedContent?.trim()
      })));
      return fallbackChapters;
    }

    // Sử dụng dữ liệu từ ConverteContext
    const contextChapters = currentStory.chapters
      .map((ch, i) => ({
        title: ch.translatedTitle || ch.chapterName || `Chương ${i + 1}`,
        content: ch.translatedContent?.trim(),
        index: i,
        chapterNumber: ch.chapterNumber || i + 1
      }))
      .filter((ch) => ch.content); // Chỉ lấy chương có nội dung dịch
    
    console.log('🔍 [DEBUG] ExportModal - Sử dụng ConverteContext chapters:', contextChapters);
    return contextChapters;
  };

  const translatedChapters = getTranslatedChapters();

  console.log('🔍 [DEBUG] ExportModal - translatedChapters:', translatedChapters);
  console.log('🔍 [DEBUG] ExportModal - chapters prop:', chapters);
  console.log('🔍 [DEBUG] ExportModal - stories from context:', stories);

  // Hàm quản lý chọn/bỏ chọn một chương
  const handleChapterSelect = (index) => {
    setSelectedChapters((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return newSelected;
    });
  };

  // Hàm chọn/bỏ chọn tất cả chương
  const handleSelectAll = () => {
    if (selectedChapters.size === translatedChapters.length) {
      // Nếu đã chọn hết thì bỏ chọn hết
      setSelectedChapters(new Set());
    } else {
      // Nếu chưa chọn hết thì chọn hết
      setSelectedChapters(new Set(translatedChapters.map(ch => ch.index)));
    }
  };

  // Hàm xuất file
  const handleExport = () => {
    if (selectedChapters.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 chương đã dịch để xuất.');
      return;
    }

    const selectedChaptersData = Array.from(selectedChapters)
      .map(index => chapters[index])
      .filter(ch => ch?.translatedContent?.trim());
    
    if (selectedChaptersData.length === 0) {
      toast.error('Không có chương nào đã dịch trong các chương đã chọn.');
      return;
    }
    
    const chaptersToExport = selectedChaptersData.map(ch => ({
      title: ch.translatedTitle || ch.chapterName || `Chương ${ch.chapterNumber}`,
      content: ch.translatedContent.trim()
    }));

    // Tạo nội dung file
    const fullText = chaptersToExport
      .map((ch) => {
        const cleanedContent = cleanContentForExport(ch.content);
        return `${ch.title}\n\n${cleanedContent}`;
      })
      .join('\n\n');

    // Tạo tên file
    let fileName = selectedChaptersData.length === 1 
      ? chaptersToExport[0].title.replace(/[^a-zA-Z0-9\s]/g, '_')
      : `Selected_${selectedChaptersData.length}_chapters`;

    // Thêm đuôi file
    fileName += exportType === 'epub' ? '.epub' : '.txt';

    // Tạo và lưu file
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName);

    // Thông báo thành công
    toast.success(`✅ Đã xuất ${selectedChaptersData.length} chương đã chọn thành file ${exportType.toUpperCase()}!`);
    setShowExportModal(false);
  };

  useEffect(() => {
    const chapter = chapters[currentIndex];

    // Lấy nội dung và tiêu đề từ chapter hiện tại
    const newContent = chapter?.translatedContent || chapter?.content || "";
    const title = chapter?.translatedTitle || chapter?.chapterName || chapter?.title || `Chương ${currentIndex + 1}`;

    setHistory([newContent]);
    setHistoryIndex(0);
    setIsEditing(false);
  }, [chapters, currentIndex, selectedChapterIndex]);

  // Thêm event listener cho phím mũi tên
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Chỉ xử lý khi không đang edit và không focus vào input/textarea
      if (isEditing) return;
      
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentIndex > 0) {
            console.log('🔄 Chuyển chương bằng phím tắt ←');
            goToChapter(-1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentIndex < chapters.length - 1) {
            console.log('🔄 Chuyển chương bằng phím tắt →');
            goToChapter(1);
          }
          break;
        default:
          break;
      }
    };

    // Thêm event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup khi component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, chapters.length, isEditing]);

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

  const goToChapter = (offset) => {
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < chapters.length) {
      if (
        isEditing &&
        !window.confirm("❗Bạn chưa lưu thay đổi. Vẫn muốn chuyển chương?")
      ) {
        return;
      }
      
      // 🚀 Scroll đến phần nội dung chương
      const viewerElement = document.querySelector('.translation-viewer');
      if (viewerElement) {
        viewerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback: scroll về đầu trang
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // Chuyển chương sau khi scroll
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
          <button onClick={() => setShowExportModal(true)}>📄 Xuất Text</button>
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

      {/* ExportModal trực tiếp bên trong TranslateViewer */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowExportModal(false)}
            >
              ✕
            </button>
            <h3>Chọn chương muốn xuất:</h3>

            <div className="export-modal-content">
              {/* Header với nút chọn tất cả */}
              <div className="chapter-list-header">
                <h4>Danh sách chương đã dịch:</h4>
                <button
                  type="button"
                  className="select-all-button"
                  onClick={handleSelectAll}
                >
                  {selectedChapters.size === translatedChapters.length
                    ? "Bỏ chọn tất cả"
                    : "Chọn tất cả"}
                </button>
              </div>

              {/* Danh sách chương */}
              <div className="modal-chapter-select">
                {translatedChapters.map((chapter) => (
                  <div
                    key={chapter.index}
                    className={`modal-chapter-item ${
                      selectedChapters.has(chapter.index) ? "selected" : ""
                    }`}
                    onClick={() => handleChapterSelect(chapter.index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapters.has(chapter.index)}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="modal-chapter-number">
                      Chương {chapter.chapterNumber}:
                    </span>
                    <span className="modal-chapter-title">
                      {chapter.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Counter */}
              <div className="selected-count">
                Đã chọn {selectedChapters.size} / {translatedChapters.length} chương
              </div>

              {/* Loại file */}
              <div className="export-section">
                <h4>📄 Loại file:</h4>
                <div className="export-options">
                  <label className="export-option">
                    <input
                      type="radio"
                      name="exportType"
                      value="txt"
                      checked={exportType === 'txt'}
                      onChange={(e) => setExportType(e.target.value)}
                    />
                    <span>📄 Text (.txt)</span>
                  </label>
                  <label className="export-option">
                    <input
                      type="radio"
                      name="exportType"
                      value="epub"
                      checked={exportType === 'epub'}
                      onChange={(e) => setExportType(e.target.value)}
                    />
                    <span>📘 EPUB (.epub)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="modal-buttons">
              <button
                type="submit"
                onClick={handleExport}
                disabled={selectedChapters.size === 0}
              >
                {selectedChapters.size > 0
                  ? `Xuất ${selectedChapters.size} chương`
                  : "Xuất file"}
              </button>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslateViewer;
