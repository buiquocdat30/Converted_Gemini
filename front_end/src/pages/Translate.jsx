import React, { useState, useContext, useEffect, useCallback, useMemo } from "react";
import UploadForm from "../components/UploadForm/UploadForm";
import StoryInfoForm from "../components/StoryInfoForm/StoryInfoForm";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import UserStoryCard from "../components/UserStoryCard/UserStoryCard";
import "../pages/pageCSS/Translate.css";
import { FaBook, FaHistory, FaSpinner } from "react-icons/fa";
import { toast } from "react-hot-toast";
import db, { addChapters, getChaptersByStoryIdAndRange, clearChapters } from '../services/indexedDBService';
import {
  handleEpubFile,
  handleTxtFile,
  checkFileFormatFromText,
} from "../utils/fileHandlers";
import { useSession } from "../context/SessionContext";
import ChapterList from "../components/ChapterList/ChapterList";
import TranslateViewer from "../components/TranslateViewer/TranslateViewer";
import ConverteKeyInput from "../components/ConverteKeyInput/ConverteKeyInput";
import ModelSelector from "../components/ModelSelector/ModelSelector";
import { translateSingleChapter } from "../services/translateSingleChapter";


const Translate = () => {
  const {
    isLoggedIn,
    stories,
    fetchStories,
    editStories,
    hideStories,
    deleteStories,
    addChapter,
    deleteChapter,
    getAuthToken,
    updateChapterContent,
    isDarkMode,
    createStory,
  } = useContext(AuthContext);
  const {
    selectedKeys: sessionSelectedKeys,
    currentKey: sessionCurrentKey,
    selectedModel: sessionSelectedModel,
    updateSelectedKeys,
    updateCurrentKey,
    updateSelectedModel,
  } = useSession();
  const [activeTab, setActiveTab] = useState("new");
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState(sessionCurrentKey || "");
  const [model, setModel] = useState(sessionSelectedModel || "gemini-2.0-flash");
  const [currentStory, setCurrentStory] = useState(null);
  const [fileName, setFileName] = useState("");
  const [searchParams] = useSearchParams();
  const [translatingStories, setTranslatingStories] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    console.log('[Translate.jsx] 📊 Loading state changed:', loading);
  }, [loading]);
  const [error, setError] = useState(null);

  // Thêm state cho phân trang chương
  const [currentPage, setCurrentPage] = useState(1);
  const chaptersPerPage = 10; // Giữ nguyên 10 chương mỗi trang như ChapterList
  const [totalStoryChapters, setTotalStoryChapters] = useState(0); // Thêm state để lưu tổng số chương của truyện

  const handleSelectJumbChapter = useCallback((index) => {
    setSelectedChapterIndex(index);
  }, []);

  // Tải truyện đang dịch dựa vào storyId từ URL
  const loadTranslatingStory = useCallback(async (storyId, page, limit) => {
    setError(null);
    setLoading(true); // Bật loading ngay khi bắt đầu tải (dù từ cache hay BE)

    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        console.error("❌ Không tìm thấy token xác thực");
        alert("Vui lòng đăng nhập lại để tiếp tục");

        setLoading(false);

        return;
      }

      console.log(`[Translate.jsx] 🚀 Đang tải truyện: storyId=${storyId}, page=${page}, limit=${limit}`);


      const startChapterNumber = (page - 1) * limit + 1;
      const endChapterNumber = page * limit;

      // 1. Cố gắng lấy chương từ IndexedDB trước
      let cachedChapters = await getChaptersByStoryIdAndRange(storyId, startChapterNumber, endChapterNumber);
      console.log(`[Translate.jsx] 📥 cachedChapters:`, cachedChapters); // Giữ log này để kiểm tra nội dung

      if (cachedChapters && cachedChapters.length > 0) {
        console.log(`[Translate.jsx] ✅ Tìm thấy ${cachedChapters.length} chương trong IndexedDB cho trang ${page}, story ${storyId}. Hiển thị từ cache.`);
        const formattedCachedChapters = cachedChapters.map((chapter) => ({
          id: chapter.id,
          chapterName: chapter.chapterName,
          title: chapter.chapterName,
          content: chapter.translatedContent || chapter.rawText || "",
          translated: chapter.translatedContent || "",
          translatedTitle: chapter.translatedTitle || chapter.chapterName,
          chapterNumber: chapter.chapterNumber,
          rawText: chapter.rawText || "",
          status: chapter.status,
          hasError: chapter.hasError,
          translationError: chapter.translationError,
        }));
        setChapters(formattedCachedChapters);
        console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ cache:`, formattedCachedChapters.map(ch => ch.chapterName));
        setLoading(false); // Tắt loading ngay lập tức nếu dữ liệu từ cache có sẵn

        // Tiếp tục gọi Backend để lấy dữ liệu mới nhất trong nền (không await)
        axios.get(
          `http://localhost:8000/user/library/${storyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).then(storyInfoResponse => {
          if (storyInfoResponse.data) {
            setCurrentStory(storyInfoResponse.data);
          }
        }).catch(error => console.error("❌ Lỗi khi lấy thông tin truyện trong nền:", error));

        axios.get(
          `http://localhost:8000/user/library/${storyId}/chapters?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).then(chaptersResponse => {
          console.log("[Translate.jsx] 📥 Phản hồi chương từ BE (nền):", chaptersResponse.data);
          setTotalStoryChapters(chaptersResponse.data.totalChaptersCount || 0);
          const rawChapters = chaptersResponse.data && Array.isArray(chaptersResponse.data.chapters)
            ? chaptersResponse.data.chapters
            : [];
          const formattedChapters = rawChapters.map((chapter) => ({
            id: chapter.id,
            chapterName: chapter.chapterName,
            title: chapter.chapterName,
            content: chapter.translation
              ? chapter.translation.translatedContent
              : chapter.rawText || "",
            translated: chapter.translation?.translatedContent || "",
            translatedTitle:
              chapter.translation?.translatedTitle || chapter.chapterName,
            chapterNumber: chapter.chapterNumber,
            rawText: chapter.rawText || "",
            status: chapter.status,
            hasError: chapter.hasError,
            translationError: chapter.translationError,
          }));

          const needsUpdate = !cachedChapters || cachedChapters.length !== formattedChapters.length || 
                              !cachedChapters.every((c, i) => 
                                c.translatedContent === formattedChapters[i].translatedContent && 
                                c.translatedTitle === formattedChapters[i].translatedTitle &&
                                c.rawText === formattedChapters[i].rawText
                              );

          if (needsUpdate) {
            console.log(`[Translate.jsx] 🔄 Dữ liệu từ Backend khác hoặc không có cache. Cập nhật IndexedDB và UI (nền).`);
            db.transaction('rw', db.chapters, async () => {
              await db.chapters.where({ storyId: storyId })
                        .and(chapter => chapter.chapterNumber >= startChapterNumber && chapter.chapterNumber <= endChapterNumber)
                        .delete();
              await db.chapters.bulkAdd(formattedChapters);
            }).then(() => {
              console.log(`[Translate.jsx] ✅ Cập nhật IndexedDB thành công trong transaction (nền).`);
              setChapters(formattedChapters); // Cập nhật chapters với dữ liệu từ BE
              console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (nền):`, formattedChapters.map(ch => ch.chapterName));
            }).catch(dbError => console.error("❌ Lỗi Transaction IndexedDB (nền):", dbError));

          } else {
            console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật (nền).`);
            setChapters(formattedChapters); // Dữ liệu khớp, nhưng vẫn cần cập nhật state chapters với dữ liệu từ BE để đảm bảo tính đồng bộ
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (dữ liệu khớp cache, nền):`, formattedChapters.map(ch => ch.chapterName));
          }
        }).catch(error => console.error("❌ Lỗi khi tải chương từ Backend trong nền:", error));

        return; // Thoát khỏi hàm nếu đã tải từ cache
      } else {
        console.log(`[Translate.jsx] ⏳ Không tìm thấy chương trong IndexedDB cho trang ${page}, story ${storyId}. Đang tải từ Backend.`);
        // Phần này sẽ chờ backend response và xử lý như bình thường
        const storyInfoResponse = await axios.get(
          `http://localhost:8000/user/library/${storyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!storyInfoResponse.data) {
          console.error("❌ Không nhận được dữ liệu truyện");
          alert("Không thể tải thông tin truyện. Vui lòng thử lại sau.");
          setLoading(false);
          return;
        }
        setCurrentStory(storyInfoResponse.data);

        const chaptersResponse = await axios.get(
          `http://localhost:8000/user/library/${storyId}/chapters?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("[Translate.jsx] 📥 Phản hồi chương từ BE:", chaptersResponse.data);

        const rawChapters = chaptersResponse.data && Array.isArray(chaptersResponse.data.chapters)
          ? chaptersResponse.data.chapters
          : [];

        setTotalStoryChapters(chaptersResponse.data.totalChaptersCount || 0);
        console.log(`[Translate.jsx] 📊 totalStoryChapters đã cập nhật thành: ${chaptersResponse.data.totalChaptersCount || 0}`);

        if (rawChapters.length === 0) {
          console.warn("⚠️ Truyện không có chương nào hoặc dữ liệu chương trống.", storyId);
        }

        const formattedChapters = rawChapters.map((chapter) => ({
          id: chapter.id,
          chapterName: chapter.chapterName,
          title: chapter.chapterName,
          content: chapter.translation
            ? chapter.translation.translatedContent
            : chapter.rawText || "",
          translated: chapter.translation?.translatedContent || "",
          translatedTitle:
            chapter.translation?.translatedTitle || chapter.chapterName,
          chapterNumber: chapter.chapterNumber,
          rawText: chapter.rawText || "",
          status: chapter.status,
          hasError: chapter.hasError,
          translationError: chapter.translationError,
        }));

        const needsUpdate = !cachedChapters || cachedChapters.length !== formattedChapters.length || 
                            !cachedChapters.every((c, i) => 
                              c.translatedContent === formattedChapters[i].translatedContent && 
                              c.translatedTitle === formattedChapters[i].translatedTitle &&
                              c.rawText === formattedChapters[i].rawText
                            );

        if (needsUpdate) {
          console.log(`[Translate.jsx] 🔄 Dữ liệu từ Backend khác hoặc không có cache. Cập nhật IndexedDB và UI.`);
          try {
            console.log(`[Translate.jsx] 🔑 Đang chạy transaction để cập nhật IndexedDB.`);
            await db.transaction('rw', db.chapters, async () => {
              await db.chapters.where({ storyId: storyId })
                        .and(chapter => chapter.chapterNumber >= startChapterNumber && chapter.chapterNumber <= endChapterNumber)
                        .delete();
              await db.chapters.bulkAdd(formattedChapters);
            });
            console.log(`[Translate.jsx] ✅ Cập nhật IndexedDB thành công trong transaction.`);
            setChapters(formattedChapters); // Cập nhật chapters với dữ liệu từ BE
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend:`, formattedChapters.map(ch => ch.chapterName));
          } catch (dbError) {
            console.error("❌ Lỗi Transaction IndexedDB:", dbError);
            setChapters(formattedChapters); // Fallback: vẫn update UI với BE data
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (fallback):`, formattedChapters.map(ch => ch.chapterName));
          }

        } else {
          console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật.`);
          setChapters(formattedChapters); // Dữ liệu khớp, nhưng vẫn cần cập nhật state chapters với dữ liệu từ BE để đảm bảo tính đồng bộ
          console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (dữ liệu khớp cache):`, formattedChapters.map(ch => ch.chapterName));
        }

        setLoading(false); // Tắt loading sau khi toàn bộ quá trình tải từ Backend hoàn tất
      }
      console.timeEnd('Load and Display Chapters');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("❌ Lỗi khi tải truyện đang dịch:", error);
      console.error("Chi tiết lỗi:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = "Không thể tải thông tin truyện. ";
      if (error.response?.status === 401) {
        errorMessage += "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.status === 404) {
        errorMessage += "Không tìm thấy truyện.";
      } else if (error.response?.status === 500) {
        errorMessage += "Lỗi server. Vui lòng thử lại sau.";
      }

      alert(errorMessage);

      setLoading(false);
      setError(error);

    }
  }, [setLoading, setError, setChapters, setCurrentStory, setTotalStoryChapters, db, getChaptersByStoryIdAndRange, axios]);

  const [currentApiKey, setCurrentApiKey] = useState(sessionCurrentKey || apiKey || ""); //key đã nhập
  const [translatedChapters, setTranslatedChapters] = useState([]); //đã dịch
  const [currentIndex, setCurrentIndex] = useState(0); // 👈 thêm state để điều hướng
  const [tempKey, setTempKey] = useState(sessionCurrentKey || apiKey || ""); //kiểm soát key
  const [isMenuOpen, setIsMenuOpen] = useState(false); //kiểm soát topmenu
  const [isAddChapterModalOpen, setIsAddChapterModal] = useState(false);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);
  const [shouldRefresh, setShouldRefresh] = useState(false); // Thêm state mới
  const [selectedKeys, setSelectedKeys] = useState(sessionSelectedKeys || []); // Thêm state để lưu danh sách key đã chọn
  // tempModel luôn là object model
  const [tempModel, setTempModel] = useState(sessionSelectedModel || model);
  // Thêm state lưu danh sách models
  const [allModels, setAllModels] = useState([]);

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

  // Khi nhận model mới từ ModelSelector, lưu object model
  const handleModelChange = (modelObj) => {
    setTempModel(modelObj);
    updateSelectedModel(modelObj);
  };

  // Nhận models từ ModelSelector
  const handleModelSelectorChange = (modelObj, modelsList) => {
    console.log('[TranslatorApp] handleModelSelectorChange', modelObj, modelsList);
    setTempModel(modelObj);
    updateSelectedModel(modelObj);
    if (Array.isArray(modelsList) && modelsList.length > 0) {
      setAllModels(modelsList);
    }
  };

  // Nếu tempModel là string, tra cứu lại object model từ allModels
  useEffect(() => {
    if (typeof tempModel === 'string' && allModels.length > 0) {
      const found = allModels.find(m => m.value === tempModel);
      if (found) {
        setTempModel(found);
        console.log('[TranslatorApp] Đã convert model string sang object:', found);
      }
    }
  }, [tempModel, allModels]);

  // useEffect đồng bộ lại khi sessionSelectedModel hoặc model prop thay đổi
  useEffect(() => {
    if (sessionSelectedModel && sessionSelectedModel.value !== tempModel?.value) {
      setTempModel(sessionSelectedModel);
    }
  }, [sessionSelectedModel, tempModel]);

  useEffect(() => {
    if (model && model.value !== tempModel?.value && !sessionSelectedModel) {
      setTempModel(model);
    }
  }, [model, tempModel, sessionSelectedModel]);

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

  // Thêm hàm để tải lại dữ liệu sau khi thêm chương
  const handleChapterAddedCallback = useCallback(async () => {
    if (currentStory?.id) {
      // Tải lại chương hiện tại để cập nhật danh sách
      await loadTranslatingStory(currentStory.id, currentPage, chaptersPerPage);
    }
  }, [currentStory?.id, currentPage, chaptersPerPage, loadTranslatingStory]);

  // Hàm xử lý khi chuyển trang trong ChapterList
  const handlePageChangeInChapterList = useCallback(async (newPage) => {
    setCurrentPage(newPage);
    if (currentStory?.id) {
      await loadTranslatingStory(currentStory.id, newPage, chaptersPerPage);
    }
  }, [currentStory?.id, chaptersPerPage, loadTranslatingStory]);

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
          setIsAddChapterModal(true);
          return;
        }

        const newChapter = {
          storyId: currentStory?.id,
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
            storyId: currentStory?.id,
            chapterNumber: newChapter.chapterNumber,
            chapterName: newChapter.chapterName,
            rawText: newChapter.rawText,
          });

          // Chỉ đóng modal và hiển thị thông báo thành công khi thêm chương thành công
          setIsAddChapterModal(false);
          toast.success("✅ Đã thêm chương mới!");
          handleChapterAddedCallback?.(); // Sử dụng hàm callback mới
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
              storyId: currentStory?.id,
              chapterName:
                chapter.title || data.file.name.replace(/\.[^/.]+$/, ""),
              rawText: chapter.content,
              chapterNumber: maxChapterNumber + i + 1,
            };

            try {
              await addChapter({
                storyId: currentStory?.id,
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
            setIsAddChapterModal(false);
            toast.success(`✅ Đã thêm ${successCount} chương mới từ file!`);
            handleChapterAddedCallback?.(); // Sử dụng hàm callback mới
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
    [chapters, addChapter, currentStory?.id, getAuthToken, handleChapterAddedCallback, updateCurrentKey]
  );

  // Tối ưu mergedChapters bằng useMemo
  const mergedChapters = useMemo(() => {
    return chapters.map((ch, i) => ({
      ...ch,
      ...translatedChapters[i],
    }));
  }, [chapters, translatedChapters]);

  // Tối ưu các callback bằng useCallback
  const handleTranslationResult = useCallback(async (
    index,
    translated,
    translatedTitle,
    timeTranslation = 0
  ) => {
    try {
      console.log("📝 [TranslatorApp] handleTranslationResult được gọi:", {
        index,
        hasTranslatedContent: !!translated,
        hasTranslatedTitle: !!translatedTitle,
        timeTranslation
      });
      
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
      if (currentStory?.id && chapter.chapterNumber) {
        console.log("💾 [TranslatorApp] Bắt đầu lưu vào database:", {
          storyId: currentStory?.id,
          chapterNumber: chapter.chapterNumber,
          translatedTitle: translatedTitle || chapter.chapterName,
          hasTranslatedContent: !!translated
        });
        
        await updateChapterContent(
          currentStory?.id,
          chapter.chapterNumber,
          translatedTitle || chapter.chapterName,
          translated || chapter.content,
          timeTranslation
        );
        
        console.log("✅ [TranslatorApp] Đã lưu vào database thành công");
      } else {
        console.warn("⚠️ [TranslatorApp] Không thể lưu database:", {
          storyId: currentStory?.id,
          chapterNumber: chapter?.chapterNumber
        });
      }

      // Chuyển sang chương vừa dịch
      setCurrentIndex(index);

      // Thông báo thành công
      //toast.success(`Đã dịch xong chương ${chapter.chapterNumber}`);
    } catch (error) {
      console.error("❌ Lỗi khi lưu kết quả dịch:", error);
      toast.error("Lỗi khi lưu kết quả dịch: " + error.message);
    }
  }, [chapters, currentStory?.id, updateChapterContent]);

  const handleChapterChange = useCallback((newIndex) => {
    console.log("TranslatorApp - Index mới:", newIndex);
    setCurrentIndex(newIndex);
    console.log(`[TranslatorApp] 📜 Đang cuộn về đầu trang cho chương ${newIndex + 1}...`); // Thêm log này
    // Cuộn về đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Tính toán trang mới dựa trên index
    const chaptersPerPage = 10;
    const newPage = Math.floor(newIndex / chaptersPerPage) + 1;
    // Gọi callback để cập nhật trang trong ChapterList
    handlePageChangeInChapterList(newPage);
  }, [currentStory?.id, chaptersPerPage, loadTranslatingStory, handlePageChangeInChapterList]);

  // Thêm log kiểm tra re-render và props truyền vào ChapterList
  useEffect(() => {
    console.log('[TranslatorApp] RENDER ChapterList', {
      mergedChapters,
      apiKey: selectedKeys.length > 0 ? selectedKeys : currentApiKey,
      model: tempModel,
      //models: allModels,
      currentIndex,
      // 🚀 Thêm currentPage, chaptersPerPage, onPageChange vào console log
      currentPage, 
      chaptersPerPage,
      storyId: currentStory?.id,
      totalStoryChapters, // Truyền totalStoryChapters vào console log
    });
  });

  // Log chapters prop trong TranslatorApp
  useEffect(() => {
    console.log('[TranslatorApp] 📊 Chapters prop received:', chapters);
    if (chapters && chapters.length > 0) {
      console.log('[TranslatorApp] ✅ Chapters prop not empty. First chapter:', chapters[0]);
    }
  }, [chapters]);

  // Memo hóa các props truyền vào ChapterList
  const memoizedModel = useMemo(() => tempModel, [tempModel?.value]);
  const memoizedApiKey = useMemo(
    () => (selectedKeys.length > 0 ? selectedKeys : currentApiKey),
    [JSON.stringify(selectedKeys), currentApiKey]
  );
  const memoizedChapters = useMemo(() => mergedChapters, [mergedChapters]);

  useEffect(() => {
    const storyId = searchParams.get("storyId");
    const tab = searchParams.get("tab");

    // Nếu có tab trong URL, set active tab
    if (tab === "translating") {
      setActiveTab("translating");
    }

    if (storyId) {
      loadTranslatingStory(storyId, currentPage, chaptersPerPage);
    }
  }, [searchParams, loadTranslatingStory]); // Đã loại bỏ currentPage và chaptersPerPage khỏi dependencies

  useEffect(() => {
    if (isLoggedIn) {
      fetchStories();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (stories) {
      // Lọc các truyện đang dịch (isComplete == false)
      const translatingStories = stories.filter((story) => !story.isComplete);
      setTranslatingStories(translatingStories);
    }
  }, [stories]);

  // Xử lý khi chuyển tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Nếu chuyển sang tab "new", xóa storyId khỏi URL
    if (tab === "new") {
      const newUrl = window.location.pathname;
      window.history.pushState({}, "", newUrl);
      setCurrentStory(null);
      setChapters([]);
      // Reset currentPage về 1 khi chuyển tab
      setCurrentPage(1);
    }
  };

  // Xử lý khi nhận được chapters từ UploadForm
  const handleParsedChapters = (parsedChapters, key, model) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    setChapters(parsedChapters);
    setCurrentApiKey(key);
    updateCurrentKey(key);
    setTempModel(model);
    updateSelectedModel(model);
    // Khi parse file mới, reset currentPage về 1
    setCurrentPage(1);
  };

  // Cập nhật nội dung chương đã dịch
  const handleUpdateChapterContent = async (storyId, chapterNumber, translatedTitle, translatedContent, timeTranslation = 0) => {
    try {
      // Log để debug
      console.log("📝 Cập nhật nội dung chương:", {
        storyId,
        chapterNumber,
        hasTranslatedTitle: !!translatedTitle,
        hasTranslatedContent: !!translatedContent,
        timeTranslation: timeTranslation
      });

      // Kiểm tra tham số bắt buộc
      if (!storyId) throw new Error("Thiếu storyId");
      if (!chapterNumber) throw new Error("Thiếu chapterNumber");
      
      // Gọi API cập nhật
      const response = await updateChapterContent(
        storyId,
        chapterNumber,
        translatedTitle,
        translatedContent,
        timeTranslation
      );

      // Sau khi cập nhật thành công, xóa chương này khỏi cache Redis ở backend
      // Bằng cách gọi lại hàm loadTranslatingStory để nó lấy dữ liệu mới từ DB
      // và cập nhật lại cache
      await loadTranslatingStory(storyId, currentPage, chaptersPerPage);

      console.log("✅ Cập nhật thành công:", response);
      return response;
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật nội dung chương:", {
        error: err.message,
        storyId,
        chapterNumber,
        status: err.response?.status,
        data: err.response?.data
      });
      throw err;
    }
  };

  // Lưu truyện mới
  const handleSaveStory = async (storyInfo) => {
    try {
      console.time('Save Story to Backend'); // Start timer for saving story
      const chaptersToSend = chapters.map((ch) => ({
        chapterName: ch.chapterName,
        rawText: ch.content,
      }));
      console.log(`[Translate.jsx] 📦 Đang gửi ${chaptersToSend.length} chương lên Backend...`);

      const response = await createStory(
        {...storyInfo, chapters: chaptersToSend}
      );
      console.timeEnd('Save Story to Backend'); // End timer for saving story
      setCurrentStory(response);
      // Sau khi lưu truyện thành công, chuyển sang tab "translating" và load truyện đó
      navigate(`/translate?storyId=${response.id}&tab=translating`);
      setActiveTab("translating");
      // Tải lại chapters cho truyện vừa lưu (trang 1)
      loadTranslatingStory(response.id, 1, chaptersPerPage);
      return response;
    } catch (error) {
      console.error("Lỗi khi lưu truyện:", error);
      throw error;
    }
  };

  // Cập nhật thông tin truyện
  const handleUpdateStoryInfo = async (storyInfo) => {
    try {
      console.log("🔄 Đang cập nhật truyện:", currentStory.id);
      console.log("📋 Thông tin cập nhật:", storyInfo);

      const response = await editStories(
        currentStory.id,
        Object.keys(storyInfo)[0],
        Object.values(storyInfo)[0]
      );
      console.log("✅ Cập nhật thành công:", response.data);
      // Cập nhật currentStory với dữ liệu mới
      setCurrentStory(prev => ({...prev, ...storyInfo}));
      return response.data;
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật truyện:", error);
      throw error;
    }
  };

  // Cập nhật một trường cụ thể của truyện
  const handleUpdateStoryField = (storyId, field, value) => {
    editStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    setTranslatingStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
      )
    );
    // Nếu đang xem truyện đó, cập nhật luôn currentStory
    if (currentStory && currentStory.id === storyId) {
      setCurrentStory(prev => ({...prev, [field]: value}));
    }
  };

  // Ẩn truyện (xóa mềm)
  const handleHideStory = async (storyId) => {
    await hideStories(storyId);
    // Cập nhật state local sau khi ẩn thành công
    setTranslatingStories((prevStories) =>
      prevStories.filter((story) => story.id !== storyId)
    );
    // Nếu truyện đang được chọn là truyện bị ẩn, reset currentStory và chapters
    if (currentStory && currentStory.id === storyId) {
      setCurrentStory(null);
      setChapters([]);
      navigate("/translate"); // Quay về trang chính của tab translating
    }
  };

  // Xóa truyện vĩnh viễn (xóa cứng)
  const handleDeleteStory = async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStories(storyId);

      // Xóa cache IndexedDB cho truyện này
      await clearChapters(storyId);

      // Cập nhật state local sau khi xóa thành công
      setTranslatingStories((prevStories) =>
        prevStories.filter((story) => story.id !== storyId)
      );
      // Nếu truyện đang được chọn là truyện bị xóa, reset currentStory và chapters
      if (currentStory && currentStory.id === storyId) {
        setCurrentStory(null);
        setChapters([]);
        navigate("/translate"); // Quay về trang chính của tab translating
      }
    }
  };

  // Xử lý khi click vào một truyện
  const handleStoryClick = (storyId) => {
    console.time('Load and Display Chapters'); // Start timer
    // Cập nhật URL với storyId
    navigate(`/translate?storyId=${storyId}&tab=translating`);
    // Set tab translating active
    setActiveTab("translating");
    // Load truyện được chọn (trang 1)
    loadTranslatingStory(storyId, 1, chaptersPerPage);
  };

  // Thêm hàm để tải lại dữ liệu sau khi thêm chương
  const handleChapterAdded = async () => {
    if (currentStory?.id) {
      // Tải lại chương hiện tại để cập nhật danh sách
      await loadTranslatingStory(currentStory.id, currentPage, chaptersPerPage);
    }
  };

  // Render nội dung Translator
  const renderTranslatorContent = () => {
    if (activeTab === "new") {
      return (
        <UploadForm
          onParsedChapters={handleParsedChapters}
          onSaveStory={handleSaveStory}
        />
      );
    } else {
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
            setIsAddChapterModal(true);
          }}
        >
          ➕<span className="tooltip-text">Thêm chương</span>
        </div>
  
        <AddChapterModal
          isOpen={isAddChapterModalOpen}
          onClose={() => setIsAddChapterModal(false)}
          onAdd={handleAddChapter}
          onCloseComplete={() => {
            setShouldRefresh(true);
            handleChapterAddedCallback?.(); // Sử dụng hàm callback mới
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
                  onModelChange={(modelObj, modelsList) => handleModelSelectorChange(modelObj, modelsList)}
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
                    setModel(tempModel);
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
              chapters={memoizedChapters}
              apiKey={memoizedApiKey}
              model={memoizedModel}
              // models={allModels}
              onTranslationResult={handleTranslationResult}
              onSelectChapter={handleChapterChange}
              onSelectJumbChapter={handleSelectJumbChapter}
              currentIndex={currentIndex}
          storyId={currentStory?.id}
          deleteChapter={deleteChapter}
              onChapterAdded={handleChapterAddedCallback} // Truyền callback mới xuống
          currentPage={currentPage} // Truyền currentPage xuống
          chaptersPerPage={chaptersPerPage} // Truyền chaptersPerPage xuống
          onPageChange={handlePageChangeInChapterList} // Truyền hàm xử lý chuyển trang xuống
              totalStoryChapters={totalStoryChapters} // Truyền totalStoryChapters xuống
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
              totalStoryChapters={totalStoryChapters} // Truyền totalStoryChapters xuống
            />
          </div>
        </div>
      </div>
      );
    }
  };

  if (!isLoggedIn) {
    return (
      <div>
        {chapters.length === 0 ? (
          <UploadForm onFileParsed={handleParsedChapters} />
        ) : (
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
              setIsAddChapterModal(true);
            }}
          >
            ➕<span className="tooltip-text">Thêm chương</span>
          </div>
    
          <AddChapterModal
            isOpen={isAddChapterModalOpen}
            onClose={() => setIsAddChapterModal(false)}
            onAdd={handleAddChapter}
            onCloseComplete={() => {
              setShouldRefresh(true);
              handleChapterAddedCallback?.(); // Sử dụng hàm callback mới
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
                    onModelChange={(modelObj, modelsList) => handleModelSelectorChange(modelObj, modelsList)}
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
                      setModel(tempModel);
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
                chapters={memoizedChapters}
                apiKey={memoizedApiKey}
                model={memoizedModel}
                // models={allModels}
                onTranslationResult={handleTranslationResult}
                onSelectChapter={handleChapterChange}
                onSelectJumbChapter={handleSelectJumbChapter}
                currentIndex={currentIndex}
                storyId={currentStory?.id}
                deleteChapter={deleteChapter}
                onChapterAdded={handleChapterAddedCallback} // Truyền callback mới xuống
            currentPage={currentPage} // Truyền currentPage xuống
            chaptersPerPage={chaptersPerPage} // Truyền chaptersPerPage xuống
            onPageChange={handlePageChangeInChapterList} // Truyền hàm xử lý chuyển trang xuống
                totalStoryChapters={totalStoryChapters} // Truyền totalStoryChapters xuống
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
                totalStoryChapters={totalStoryChapters} // Truyền totalStoryChapters xuống
              />
            </div>
          </div>
        </div>
        )}
      </div>
    );
  }

  return (
    <div className={`translate-page ${isDarkMode ? "dark" : ""}`}>
      <div className="translate-tabs">
        <button
          className={`tab-button ${activeTab === "new" ? "active" : ""}`}
          onClick={() => handleTabChange("new")}
        >
          Dịch truyện mới
        </button>
        <button
          className={`tab-button ${
            activeTab === "translating" ? "active" : ""
          }`}
          onClick={() => handleTabChange("translating")}
        >
          Truyện đang dịch
        </button>
        {activeTab === "translating" && currentStory && (
          <button
            className="tab-button"
            onClick={() => {
              setActiveTab("translating");
              // Khi bấm quay lại, load lại danh sách truyện đang dịch
              setCurrentStory(null);
              setChapters([]);
              // Xóa storyId khỏi URL
              navigate("/translate");
              // Reset currentPage về 1
              setCurrentPage(1);
            }}
          >
            Quay lại chọn truyện
          </button>
        )}
      </div>
      <div className="tab-content">
        {loading && ( // Thêm conditional rendering cho loading indicator
          <div className="loading-overlay">
            <FaSpinner className="spinner" />
            <p>Đang tải chương truyện...</p>
          </div>
        )}
        {activeTab === "new" ? (
          renderTranslatorContent()
        ) : (
          <div className="translating-stories">
            {currentStory ? (
              renderTranslatorContent()
            ) : (
              <div className="stories-grid">
                {translatingStories.length === 0 ? (
                  <p>Chưa có truyện nào đang dịch</p>
                ) : (
                  translatingStories.map((story) => (
                    <div
                      className="tr-story-card"
                      key={story.id}
                      onClick={() => handleStoryClick(story.id)}
                    >
                      <UserStoryCard
                        story={story}
                        onHide={() => handleHideStory(story.id)}
                        onDelete={() => handleDeleteStory(story.id)}
                        onUpdate={handleUpdateStoryField}
                        showCompleteButton={false}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Translate;
