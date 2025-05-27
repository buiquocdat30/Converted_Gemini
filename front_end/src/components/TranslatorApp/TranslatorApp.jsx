import React, { useState, useCallback } from "react";
import ChapterList from "../ChapterList/ChapterList";
import TranslateViewer from "../TranslateViewer/TranslateViewer";
import ConverteKeyInput from "../ConverteKeyInput/ConverteKeyInput";
import { translateSingleChapter } from "../../services/translateSingleChapter.jsx";
import "./TranslatorApp.css";
import { toast } from "react-hot-toast";
import {
  handleEpubFile,
  handleTxtFile,
  checkFileFormatFromText,
} from "../../utils/fileHandlers";

const TranslatorApp = ({
  apiKey,
  chapters,
  setChapters,
  model,
  onUpdateChapter,
  onSelectChapter,
  addChapter,
  storyId,
  getAuthToken,
}) => {
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || ""); //key đã nhập
  const [translatedChapters, setTranslatedChapters] = useState([]); //đã dịch
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng
  const [tempKey, setTempKey] = useState(apiKey || ""); //kiểm soát key
  const [isMenuOpen, setIsMenuOpen] = useState(false); //kiểm soát topmenu
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [addChapterMode, setAddChapterMode] = useState("manual"); // "manual" hoặc "file"

  //Chọn chương để Nhảy
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);

  //hàm chọn chương để Nhảy
  const handleSelectJumbChapter = (index) => {
    setSelectedChapterIndex(index);
  };

  // Hàm xử lý khi chuyển chương
  const handleChapterChange = (newIndex) => {
    console.log("TranslatorApp - Index mới:", newIndex);
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
  const handleEditChapter = (index, newContent, type = "translated") => {
    setTranslatedChapters((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...(chapters[index] || {}),
        [type]: newContent,
      };
      return updated;
    });
  };

  // Hàm xử lý dịch lại chương
  const handleRetranslate = (index) => {
    translateSingleChapter({
      index,
      chapters,
      apiKey: currentApiKey,
      model,
      onTranslationResult: (idx, translated, translatedTitle) => {
        handleTranslationResult(idx, translated, translatedTitle);
        // Sau khi dịch xong, tự động lưu vào translated
        handleEditChapter(idx, translated, "translated");
      },
      onSelectChapter: () => {},
      setProgress: () => {},
      setResults: () => {},
      setErrorMessages: () => {},
      setTranslatedCount: () => {},
      setTotalProgress: () => {},
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

  // Tách modal thành component riêng để tránh re-render
  const AddChapterModal = React.memo(({ isOpen, onClose, onAdd }) => {
    const [localTitle, setLocalTitle] = useState("");
    const [localContent, setLocalContent] = useState("");
    const [localFile, setLocalFile] = useState(null);
    const [localMode, setLocalMode] = useState("manual");
    const [processedChapters, setProcessedChapters] = useState([]);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    // Hàm xử lý khi chọn file
    const handleFileSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setLocalFile(file);
      setIsProcessingFile(true);
      setProcessedChapters([]);
      setSelectedChapterIndex(null);

      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });

        const fileExt = file.name.split(".").pop().toLowerCase();
        let chapters;

        if (fileExt === "epub") {
          chapters = await handleEpubFile(
            content,
            null,
            (error) => toast.error(error),
            (success) => toast.success(success),
            null,
            null,
            null,
            null,
            null
          );
        } else if (fileExt === "txt") {
          const result = checkFileFormatFromText(content);
          if (!result.valid) {
            toast.error("File không đúng định dạng chương!");
            return;
          }
          chapters = result.chapters;
        } else {
          toast.error("Chỉ hỗ trợ file EPUB và TXT!");
          return;
        }

        if (!chapters || chapters.length === 0) {
          toast.error("Không tìm thấy chương nào trong file!");
          return;
        }

        setProcessedChapters(chapters);
        toast.success(`Đã tìm thấy ${chapters.length} chương trong file!`);
      } catch (error) {
        console.error("Lỗi khi xử lý file:", error);
        toast.error(error.message || "Lỗi khi xử lý file!");
      } finally {
        setIsProcessingFile(false);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (localMode === "manual") {
        if (!localTitle.trim() || !localContent.trim()) {
          toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung chương!");
          return;
        }
        onAdd({
          title: localTitle,
          content: localContent,
          mode: localMode,
        });
      } else {
        if (!localFile) {
          toast.error("Vui lòng chọn file!");
          return;
        }
        if (selectedChapterIndex === null) {
          toast.error("Vui lòng chọn chương muốn thêm!");
          return;
        }
        const selectedChapter = processedChapters[selectedChapterIndex];
        onAdd({
          title: selectedChapter.title,
          content: selectedChapter.content,
          mode: localMode,
          file: localFile,
        });
      }
    };

    if (!isOpen) return null;

    return (
      <div
        className="modal-overlay"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <h3>Thêm chương mới</h3>
            <div className="add-chapter-tabs">
              <button
                type="button"
                className={localMode === "manual" ? "active" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalMode("manual");
                  setProcessedChapters([]);
                  setSelectedChapterIndex(null);
                }}
              >
                Nhập thủ công
              </button>
              <button
                type="button"
                className={localMode === "file" ? "active" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalMode("file");
                }}
              >
                Từ file
              </button>
            </div>

            {localMode === "manual" ? (
              <>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề chương"
                  value={localTitle}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    setLocalTitle(e.target.value);
                  }}
                />
                <textarea
                  placeholder="Nhập nội dung chương"
                  value={localContent}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    setLocalContent(e.target.value);
                  }}
                  rows={10}
                />
              </>
            ) : (
              <div className="file-input-container">
                <input
                  type="file"
                  accept=".txt,.epub"
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleFileSelect}
                  disabled={isProcessingFile}
                />
                {isProcessingFile && (
                  <div className="processing-indicator">Đang xử lý file...</div>
                )}
                {processedChapters.length > 0 && (
                  <div className="chapter-list">
                    <h4>Chọn chương muốn thêm:</h4>
                    <div className="chapter-select">
                      {processedChapters.map((chapter, index) => (
                        <div
                          key={index}
                          className={`chapter-item ${
                            selectedChapterIndex === index ? "selected" : ""
                          }`}
                          onClick={() => setSelectedChapterIndex(index)}
                        >
                          <span className="chapter-number">
                            Chương {index + 1}:
                          </span>
                          <span className="chapter-title">{chapter.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-buttons">
              <button type="submit" disabled={isProcessingFile}>
                Thêm chương
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  });

  // Xử lý thêm chương mới
  const handleAddChapter = useCallback(
    async (data) => {
      if (data.mode === "manual") {
        if (!data.title.trim() || !data.content.trim()) {
          toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung chương!");
          return;
        }

        const newChapter = {
          storyId: storyId,
          chapterName: data.title,
          rawText: data.content,
          chapterNumber: chapters.length + 1,
        };

        try {
          const token = getAuthToken();
          console.log("đây là token", token);
          if (!token) {
            toast.error("Vui lòng đăng nhập lại!");
            return;
          }

          console.log("đây là thông tin chương mới addChapter", newChapter);
          await addChapter({
            storyId: storyId,
            chapterNumber: newChapter.chapterNumber,
            chapterName: newChapter.chapterName,
            rawText: newChapter.rawText,
          });

          const updatedChapters = [...chapters, newChapter];
          setChapters(updatedChapters);

          const updatedTranslatedChapters = [...translatedChapters];
          updatedTranslatedChapters[chapters.length] = {
            ...newChapter,
            translated: data.content,
            translatedTitle: data.title,
          };
          setTranslatedChapters(updatedTranslatedChapters);

          setIsAddChapterModalOpen(false);
          toast.success("✅ Đã thêm chương mới!");
        } catch (error) {
          console.error("Lỗi khi thêm chương:", error);
          if (error.response?.status === 401) {
            toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
          } else {
            toast.error("❌ Lỗi khi thêm chương mới!");
          }
        }
      } else {
        // Xử lý thêm chương từ file
        if (!data.file) {
          toast.error("Vui lòng chọn file!");
          return;
        }

        try {
          const token = getAuthToken();
          if (!token) {
            toast.error("Vui lòng đăng nhập lại!");
            return;
          }

          // Đọc nội dung file
          const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(data.file);
          });

          // Xử lý file dựa vào định dạng
          const fileExt = data.file.name.split(".").pop().toLowerCase();
          let processedChapters;

          if (fileExt === "epub") {
            // Xử lý file EPUB
            processedChapters = await handleEpubFile(
              content,
              null, // setChapters không cần thiết ở đây
              (error) => toast.error(error),
              (success) => toast.success(success),
              null, // setChapterCount không cần thiết
              null, // setTotalWords không cần thiết
              null, // setAverageWords không cần thiết
              null, // setBooks không cần thiết
              null // setAuthor không cần thiết
            );
          } else if (fileExt === "txt") {
            // Xử lý file TXT
            const result = checkFileFormatFromText(content);
            if (!result.valid) {
              toast.error("File không đúng định dạng chương!");
              return;
            }
            processedChapters = result.chapters;
          } else {
            toast.error("Chỉ hỗ trợ file EPUB và TXT!");
            return;
          }

          if (!processedChapters || processedChapters.length === 0) {
            toast.error("Không tìm thấy chương nào trong file!");
            return;
          }

          // Lấy chương đầu tiên từ file
          const chapter = processedChapters[0];

          const newChapter = {
            storyId: storyId,
            chapterName:
              chapter.title || data.file.name.replace(/\.[^/.]+$/, ""),
            rawText: chapter.content,
            chapterNumber: chapters.length + 1,
          };

          console.log("Thông tin chương mới từ file:", newChapter);

          // Gọi API thêm chương
          await addChapter({
            storyId: storyId,
            chapterNumber: newChapter.chapterNumber,
            chapterName: newChapter.chapterName,
            rawText: newChapter.rawText,
          });

          // Cập nhật state local
          const updatedChapters = [...chapters, newChapter];
          setChapters(updatedChapters);

          const updatedTranslatedChapters = [...translatedChapters];
          updatedTranslatedChapters[chapters.length] = {
            ...newChapter,
            translated: chapter.content,
            translatedTitle: chapter.title || newChapter.chapterName,
          };
          setTranslatedChapters(updatedTranslatedChapters);

          setIsAddChapterModalOpen(false);
          toast.success("✅ Đã thêm chương mới từ file!");
        } catch (error) {
          console.error("Lỗi khi thêm chương từ file:", error);
          if (error.response?.status === 401) {
            toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
          } else {
            toast.error(error.message || "❌ Lỗi khi thêm chương mới từ file!");
          }
        }
      }
    },
    [chapters, translatedChapters, addChapter, storyId, getAuthToken]
  );

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
        <span className="tooltip-text">Nhập key</span>
      </div>
      {/* Nút thêm chương */}
      <div
        className="menu-toggle-button add-chapter-button"
        onClick={(e) => {
          e.stopPropagation();
          setIsAddChapterModalOpen(true);
        }}
      >
        ➕<span className="tooltip-text">Thêm chương</span>
      </div>

      <AddChapterModal
        isOpen={isAddChapterModalOpen}
        onClose={() => setIsAddChapterModalOpen(false)}
        onAdd={handleAddChapter}
      />

      {/* Modal nhập key */}
      {isMenuOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
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
            <div className="modal-buttons">
              <button onClick={() => setIsMenuOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

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
            onRetranslate={handleRetranslate}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(TranslatorApp);
