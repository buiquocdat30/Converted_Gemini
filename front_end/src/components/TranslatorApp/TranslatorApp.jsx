import React, { useState, useCallback, useEffect } from "react";
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
import ModelSelector from "../ModelSelector/ModelSelector";
import { useSession } from "../../context/SessionContext";

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
  onChapterAdded,
  deleteChapter,
  setModel,
  isDarkMode,
  currentStory,
}) => {
  const {
    selectedKeys: sessionSelectedKeys,
    currentKey: sessionCurrentKey,
    selectedModel: sessionSelectedModel,
    updateSelectedKeys,
    updateCurrentKey,
    updateSelectedModel,
  } = useSession();

  const [currentApiKey, setCurrentApiKey] = useState(sessionCurrentKey || apiKey || ""); //key đã nhập
  const [translatedChapters, setTranslatedChapters] = useState([]); //đã dịch
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng
  const [tempKey, setTempKey] = useState(sessionCurrentKey || apiKey || ""); //kiểm soát key
  const [isMenuOpen, setIsMenuOpen] = useState(false); //kiểm soát topmenu
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [addChapterMode, setAddChapterMode] = useState("manual"); // "manual" hoặc "file"
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);
  const [shouldRefresh, setShouldRefresh] = useState(false); // Thêm state mới
  const [selectedKeys, setSelectedKeys] = useState(sessionSelectedKeys || []); // Thêm state để lưu danh sách key đã chọn
  const [tempModel, setTempModel] = useState(sessionSelectedModel || model); // State model tạm thời
  console.log("Đây là truyện hiện tại",currentStory)

  // Đồng bộ session state với local state
  useEffect(() => {
    if (sessionCurrentKey && sessionCurrentKey !== currentApiKey) {
      setCurrentApiKey(sessionCurrentKey);
      setTempKey(sessionCurrentKey);
    }
  }, [sessionCurrentKey, currentApiKey]);

  useEffect(() => {
    if (sessionSelectedKeys && sessionSelectedKeys.length !== selectedKeys.length) {
      setSelectedKeys(sessionSelectedKeys);
    }
  }, [sessionSelectedKeys, selectedKeys]);

  useEffect(() => {
    if (sessionSelectedModel && sessionSelectedModel !== tempModel) {
      setTempModel(sessionSelectedModel);
    }
  }, [sessionSelectedModel, tempModel]);

  // Thêm useEffect để xử lý re-render
  useEffect(() => {
    if (shouldRefresh) {
      // Reset state để tránh re-render vô hạn
      setShouldRefresh(false);
      // Có thể thêm logic re-render ở đây nếu cần
    }
  }, [shouldRefresh]);

  // Đồng bộ model khi model cha thay đổi
  useEffect(() => {
    if (model && model !== tempModel && !sessionSelectedModel) {
      setTempModel(model);
    }
  }, [model, tempModel, sessionSelectedModel]);

  //Chọn chương để Nhảy
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

  // Hàm xử lý khi người dùng chọn keys
  const handleKeysSelected = (keys) => {
    console.log("🔑 Keys đã được chọn:", keys);
    setSelectedKeys(keys);
    updateSelectedKeys(keys);
  };

  // Hàm xử lý khi người dùng thay đổi key hiện tại
  const handleCurrentKey = (key) => {
    setCurrentApiKey(key);
    updateCurrentKey(key);
  };

  // Khi nhận kết quả dịch từ ChapterList
  const handleTranslationResult = async (
    index,
    translated,
    translatedTitle,
    timeTranslation = 0
  ) => {
    try {
      const chapter = chapters[index];
      console.log("📝 Lưu kết quả dịch:", {
        index,
        chapterNumber: chapter?.chapterNumber,
        hasTranslatedTitle: !!translatedTitle,
        hasTranslatedContent: !!translated,
        timeTranslation: timeTranslation,
      });

      // Cập nhật state local
      setTranslatedChapters((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...chapter,
          translatedContent: translated,
          translatedTitle: translatedTitle,
          status: "TRANSLATED",
        };
        return updated;
      });

      // Lưu vào database
      if (storyId && chapter.chapterNumber) {
        await onUpdateChapter(
          storyId,
          chapter.chapterNumber,
          translatedTitle || chapter.chapterName,
          translated || chapter.content,
          timeTranslation // 👉 Thêm thời gian dịch
        );
      }

      // Chuyển sang chương vừa dịch
      setCurrentIndex(index);

      // Thông báo thành công
      toast.success(`Đã dịch xong chương ${chapter.chapterNumber}`);
    } catch (error) {
      console.error("❌ Lỗi khi lưu kết quả dịch:", error);
      toast.error("Lỗi khi lưu kết quả dịch: " + error.message);
    }
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
      apiKey: selectedKeys.length > 0 ? selectedKeys : currentApiKey, // Ưu tiên selectedKeys
      model: tempModel,
      onTranslationResult: (
        idx,
        translated,
        translatedTitle,
        timeTranslation
      ) => {
        handleTranslationResult(
          idx,
          translated,
          translatedTitle,
          timeTranslation
        );
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
            translated &&
            translated.length > 0 &&
            translated !== fakeChapter.content
          ) {
            toast.success("✅ Key hợp lệ!");
            setCurrentApiKey(tempKey);
            updateCurrentKey(tempKey);
          } else {
            toast.error("❌ Key không hợp lệ hoặc có vấn đề!");
          }
        },
        onSelectChapter: () => {},
        setProgress: () => {},
        setResults: () => {},
        setErrorMessages: () => {},
        setTranslatedCount: () => {},
        setTotalProgress: () => {},
      });
    } catch (error) {
      console.error("Lỗi khi kiểm tra key:", error);
      toast.error("❌ Lỗi khi kiểm tra key: " + error.message);
    }
  };

  // Tách modal thành component riêng để tránh re-render
  const AddChapterModal = React.memo(
    ({ isOpen, onClose, onAdd, onCloseComplete }) => {
      const [localTitle, setLocalTitle] = useState("");
      const [localContent, setLocalContent] = useState("");
      const [localFile, setLocalFile] = useState(null);
      const [localMode, setLocalMode] = useState("manual");
      const [processedChapters, setProcessedChapters] = useState([]);
      const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);
      const [isProcessingFile, setIsProcessingFile] = useState(false);
      const [selectedChapters, setSelectedChapters] = useState(new Set()); // Thêm state để lưu các chương được chọn

      // Hàm xử lý khi chọn/bỏ chọn một chương
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
        if (selectedChapters.size === processedChapters.length) {
          // Nếu đã chọn hết thì bỏ chọn hết
          setSelectedChapters(new Set());
        } else {
          // Nếu chưa chọn hết thì chọn hết
          setSelectedChapters(
            new Set(processedChapters.map((_, index) => index))
          );
        }
      };

      // Reset selected chapters khi đóng modal hoặc chuyển mode
      const resetSelections = () => {
        setSelectedChapters(new Set());
        setSelectedChapterIndex(null);
        setProcessedChapters([]);
      };

      const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLocalFile(file);
        setIsProcessingFile(true);
        resetSelections();

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
          if (selectedChapters.size === 0) {
            toast.error("Vui lòng chọn ít nhất một chương!");
            return;
          }

          onAdd({
            mode: localMode,
            file: localFile,
            selectedChapters: selectedChapters,
            processedChapters: processedChapters,
            setSelectedChapters: setSelectedChapters,
          });
        }
      };

      if (!isOpen) return null;

      return (
        <div
          className="modal-overlay modal-add-chapter"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <div
            className="modal-content modal-add-chapter-content"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <button
                type="button"
                className="modal-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetSelections();
                  onClose();
                }}
              >
                ✕
              </button>
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
                    <div className="processing-indicator">
                      Đang xử lý file...
                    </div>
                  )}
                  {processedChapters.length > 0 && (
                    <div className="chapter-list">
                      <div className="chapter-list-header">
                        <h4>Chọn chương muốn thêm:</h4>
                        <button
                          type="button"
                          className="select-all-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAll();
                          }}
                        >
                          {selectedChapters.size === processedChapters.length
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="modal-chapter-select">
                        {processedChapters.map((chapter, index) => (
                          <div
                            key={index}
                            className={`modal-chapter-item ${
                              selectedChapters.has(index) ? "selected" : ""
                            }`}
                            onClick={() => handleChapterSelect(index)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedChapters.has(index)}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="modal-chapter-number">
                              Chương {index + 1}:
                            </span>
                            <span className="modal-chapter-title">
                              {chapter.title}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="selected-count">
                        Đã chọn {selectedChapters.size} /{" "}
                        {processedChapters.length} chương
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-buttons">
                <button
                  type="submit"
                  disabled={
                    isProcessingFile ||
                    (localMode === "file" && selectedChapters.size === 0)
                  }
                >
                  {localMode === "file" && selectedChapters.size > 0
                    ? `Thêm ${selectedChapters.size} chương`
                    : "Thêm chương"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSelections();
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
    }
  );

  // Xử lý thêm chương mới
  const handleAddChapter = useCallback(
    async (data) => {
      if (data.mode === "manual") {
        if (!data.title.trim() || !data.content.trim()) {
          toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung chương!");
          return;
        }

        // Kiểm tra trùng tên chương
        const isTitleDuplicate = chapters.some(
          (chapter) =>
            chapter.chapterName.toLowerCase() === data.title.toLowerCase()
        );
        if (isTitleDuplicate) {
          toast.error("❌ Tên chương đã tồn tại! Vui lòng chọn tên khác.");
          setIsAddChapterModalOpen(true);
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
          if (!token) {
            toast.error("Vui lòng đăng nhập lại!");
            return;
          }

          await addChapter({
            storyId: storyId,
            chapterNumber: newChapter.chapterNumber,
            chapterName: newChapter.chapterName,
            rawText: newChapter.rawText,
          });

          // Chỉ đóng modal và hiển thị thông báo thành công khi thêm chương thành công
          setIsAddChapterModalOpen(false);
          toast.success("✅ Đã thêm chương mới!");
          onChapterAdded?.();
        } catch (error) {
          console.error("Lỗi khi thêm chương:", error);
          if (error.response?.status === 401) {
            toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
          } else {
            toast.error("❌ Lỗi khi thêm chương mới!");
          }
          // Không đóng modal khi có lỗi
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

          // Kiểm tra trùng lặp trước khi thêm
          const existingTitles = new Set(
            chapters.map((ch) => ch.chapterName.toLowerCase())
          );
          const duplicateTitles = [];
          const validChapters = new Set();

          // Lọc ra các chương không trùng
          for (let i = 0; i < data.processedChapters.length; i++) {
            const chapter = data.processedChapters[i];
            const chapterTitle = chapter.title.toLowerCase();

            if (existingTitles.has(chapterTitle)) {
              duplicateTitles.push(chapter.title);
            } else {
              validChapters.add(i);
            }
          }

          if (duplicateTitles.length > 0) {
            toast.error(
              `❌ Các chương sau đã tồn tại: ${duplicateTitles.join(", ")}`
            );
            // Sử dụng setSelectedChapters được truyền từ AddChapterModal
            data.setSelectedChapters(validChapters);
            return;
          }

          // Tìm chapterNumber lớn nhất hiện tại
          const maxChapterNumber = chapters.reduce(
            (max, chapter) => Math.max(max, chapter.chapterNumber),
            0
          );

          let successCount = 0;
          // Thêm từng chương đã chọn với chapterNumber tăng dần
          for (let i = 0; i < data.selectedChapters.size; i++) {
            const index = Array.from(data.selectedChapters)[i];
            const chapter = data.processedChapters[index];
            const newChapter = {
              storyId: storyId,
              chapterName:
                chapter.title || data.file.name.replace(/\.[^/.]+$/, ""),
              rawText: chapter.content,
              chapterNumber: maxChapterNumber + i + 1,
            };

            try {
              await addChapter({
                storyId: storyId,
                chapterNumber: newChapter.chapterNumber,
                chapterName: newChapter.chapterName,
                rawText: newChapter.rawText,
              });
              successCount++;
            } catch (error) {
              console.error(
                `Lỗi khi thêm chương ${newChapter.chapterName}:`,
                error
              );
              toast.error(`❌ Lỗi khi thêm chương "${newChapter.chapterName}"`);
            }
          }

          if (successCount > 0) {
            setIsAddChapterModalOpen(false);
            toast.success(`✅ Đã thêm ${successCount} chương mới từ file!`);
            onChapterAdded?.();
          }
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
    [chapters, addChapter, storyId, getAuthToken, onChapterAdded, updateCurrentKey]
  );

  return (
    <div className="translator-app-wrapper">
      <h2
        className="translator-app-title"
        onClick={() => (window.location.href = "/")}
        
      >
        {/* Ưu tiên lấy tên truyện từ currentStory.name, nếu không có thì lấy từ chương đầu tiên, nếu không có thì fallback */}
        📘 {currentStory?.name || (chapters && chapters[0] && (chapters[0].storyName || chapters[0].name)) || "Gemini Converte"}
        
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
        onCloseComplete={() => {
          setShouldRefresh(true);
          onChapterAdded?.(); // Gọi callback để tải lại dữ liệu
        }}
      />

      {/* Modal nhập key */}
      {isMenuOpen && (
        <div className="modal-overlay modal-key-model">
          <div className="modal-content modal-key-model-content">
            <button
              className="modal-close-button"
              onClick={() => setIsMenuOpen(false)}
            >
              ✕
            </button>
            <h3>📘 Menu key</h3>
            <div className="top-menu-body">
              <ConverteKeyInput
                apiKey={tempKey}
                setApiKey={setTempKey}
                onCurrentKey={handleCurrentKey}
                onKeysSelected={handleKeysSelected}
              />
              <ModelSelector
                selectedModel={tempModel}
                onModelChange={(newModel) => {
                  setTempModel(newModel);
                  updateSelectedModel(newModel);
                }}
                isDarkMode={isDarkMode}
              />
            </div>
            <div className="modal-buttons">
              <button className="select-key-modal-btn"
                onClick={() => {
                  if (selectedKeys.length > 0) {
                    setCurrentApiKey(selectedKeys);
                    updateCurrentKey(selectedKeys[0]);
                  } else {
                    setCurrentApiKey(tempKey);
                    updateCurrentKey(tempKey);
                  }
                  setModel && setModel(tempModel);
                  updateSelectedModel(tempModel);
                  setIsMenuOpen(false);
                }}
              >
                Áp dụng
              </button>
              <button className="cancel-key-modal-btn" onClick={() => setIsMenuOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="content">
        <div className="chapter-list-container">
          <ChapterList
            chapters={mergedChapters}
            apiKey={selectedKeys.length > 0 ? selectedKeys : currentApiKey}
            model={tempModel}
            onTranslationResult={handleTranslationResult}
            onSelectChapter={handleChapterChange}
            onSelectJumbChapter={handleSelectJumbChapter}
            currentIndex={currentIndex}
            storyId={storyId}
            deleteChapter={deleteChapter}
            onChapterAdded={onChapterAdded}
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
