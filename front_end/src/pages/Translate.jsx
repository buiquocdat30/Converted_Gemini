import React, { useState, useContext, useEffect, useCallback, useMemo, useReducer, useRef } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { toast } from "react-hot-toast";
import "../pages/pageCSS/Translate.css";
import db, { addChapters, getChaptersByStoryIdAndRange, clearChapters } from '../services/indexedDBService';
import {
  handleEpubFile,
  checkFileFormatFromText,
} from "../utils/fileHandlers";
import { translateSingleChapter } from "../services/translateSingleChapter";
import { AuthContext } from "../context/ConverteContext";
import { useSession } from "../context/SessionContext";
import UploadForm from "../components/UploadForm/UploadForm";
import ChapterList from "../components/ChapterList/ChapterList";
import TranslateViewer from "../components/TranslateViewer/TranslateViewer";
import ConverteKeyInput from "../components/ConverteKeyInput/ConverteKeyInput";
import ModelSelector from "../components/ModelSelector/ModelSelector";
import UserStoryCard from "../components/UserStoryCard/UserStoryCard";
import { TranslationBot } from "../bot";

const chaptersPerPage = 10; // Giữ nguyên 10 chương mỗi trang như ChapterList

// Helper function for deep comparison of chapters
const areChaptersEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    const ch1 = arr1[i];
    const ch2 = arr2[i];
    if (ch1.id !== ch2.id ||
        ch1.chapterNumber !== ch2.chapterNumber ||
        ch1.chapterName !== ch2.chapterName ||
        ch1.rawText !== ch2.rawText ||
        ch1.translatedContent !== ch2.translatedContent ||
        ch1.translatedTitle !== ch2.translatedTitle ||
        ch1.status !== ch2.status ||
        ch1.hasError !== ch2.hasError ||
        ch1.translationError !== ch2.translationError) {
      return false;
    }
  }
  return true;
};

const getInitialState = ({ selectedModel, selectedKeys, currentKey }) => ({
  ui: {
    activeTab: "new",
    isMenuOpen: false,
    isAddChapterModalOpen: false,
    loading: false,
    error: null,
    shouldRefresh: false,
  },
  story: {
    current: null,
    list: [],
    totalChapters: 0,
    currentPage: 1,
    fileName: "",
  },
  chapters: {
    items: [],
    currentIndex: 0,
    selectedChapterIndex: null,
  },
  auth: {
    currentKey: currentKey || "",
    selectedKeys: selectedKeys || [],
    isLoggedIn: !!currentKey,
    tempKey: "",
  },
  model: {
    current: selectedModel || null, // 🔥 lấy luôn từ SessionContext
    all: [],
    temp: null,
  },
});

// Định nghĩa reducer function
function reducer(state, action) {
  switch (action.type) {
    // UI
    case "UI/SET_ACTIVE_TAB":
      return { ...state, ui: { ...state.ui, activeTab: action.payload } };
    case "UI/LOADING":
      return { ...state, ui: { ...state.ui, loading: action.payload } };
    case "UI/ERROR":
      return { ...state, ui: { ...state.ui, error: action.payload } };
    case "UI/TOGGLE_MENU":
      return { ...state, ui: { ...state.ui, isMenuOpen: action.payload } };
    case "UI/TOGGLE_ADD_MODAL":
      return { ...state, ui: { ...state.ui, isAddChapterModalOpen: action.payload } };
    case "UI/SET_SHOULD_REFRESH":
      return { ...state, ui: { ...state.ui, shouldRefresh: action.payload } };

    // STORY
    case "STORY/SET_CURRENT":
      return { ...state, story: { ...state.story, current: action.payload } };
    case "STORY/SET_LIST":
      return { ...state, story: { ...state.story, list: action.payload } };
    case "STORY/SET_TOTAL":
      return { ...state, story: { ...state.story, totalChapters: action.payload } };
    case "STORY/SET_PAGE":
      return { ...state, story: { ...state.story, currentPage: action.payload } };
    case "STORY/SET_FILE_NAME":
      return { ...state, story: { ...state.story, fileName: action.payload } };

    // CHAPTERS
    case "CHAPTERS/SET_ITEMS":
      return { ...state, chapters: { ...state.chapters, items: action.payload } };
    case "CHAPTERS/SET_INDEX":
      return { ...state, chapters: { ...state.chapters, currentIndex: action.payload } };
    case "CHAPTERS/SET_SELECTED_INDEX":
      return { ...state, chapters: { ...state.chapters, selectedChapterIndex: action.payload } };

    // AUTH
    case "AUTH/SET_KEY":
      return { ...state, auth: { ...state.auth, currentKey: action.payload } };
    case "AUTH/SET_KEYS":
      return { ...state, auth: { ...state.auth, selectedKeys: action.payload } };
    case "AUTH/SET_LOGIN":
      return { ...state, auth: { ...state.auth, isLoggedIn: action.payload } };
    case "AUTH/SET_TEMP_KEY":
      return { ...state, auth: { ...state.auth, tempKey: action.payload } };

    // MODEL
    case "MODEL/SET_CURRENT":
      return { ...state, model: { ...state.model, current: action.payload } };
    case "MODEL/SET_ALL":
      return { ...state, model: { ...state.model, all: action.payload } };
    case "MODEL/SET_TEMP":
      return { ...state, model: { ...state.model, temp: action.payload } };

    case "RESET_TRANSLATION_STATE":
      return { ...initialState,
        auth: {
          ...initialState.auth,
          currentKey: state.auth.currentKey,
          tempKey: state.auth.tempKey,
          selectedKeys: state.auth.selectedKeys,
        },
        model: {
          ...initialState.model,
          current: state.model.current,
          temp: state.model.temp,
        },
        ui: {
          ...initialState.ui,
          activeTab: state.ui.activeTab,
        }
      };

    case "SET_TRANSLATING_STORIES":
      return { ...state, story: { ...state.story, list: action.payload } };

    default:
      return state;
  }
}

// AddChapterModal reducer
const initialAddChapterModalState = {
  localTitle: "",
  localContent: "",
  localFile: null,
  localMode: "manual",
  processedChapters: [],
  selectedChapterIndex: null,
  isProcessingFile: false,
  selectedChapters: new Set(),
};

function addChapterModalReducer(state, action) {
  switch (action.type) {
    case "SET_LOCAL_TITLE":
      return { ...state, localTitle: action.payload };
    case "SET_LOCAL_CONTENT":
      return { ...state, localContent: action.payload };
    case "SET_LOCAL_FILE":
      return { ...state, localFile: action.payload };
    case "SET_LOCAL_MODE":
      return { ...state, localMode: action.payload };
    case "SET_PROCESSED_CHAPTERS":
      return { ...state, processedChapters: action.payload };
    case "SET_SELECTED_CHAPTER_INDEX":
      return { ...state, selectedChapterIndex: action.payload };
    case "SET_IS_PROCESSING_FILE":
      return { ...state, isProcessingFile: action.payload };
    case "SET_SELECTED_CHAPTERS":
      return { ...state, selectedChapters: action.payload };
    case "RESET_ADD_CHAPTER_MODAL_STATE":
      return initialAddChapterModalState;
    default:
      return state;
  }
}

const Translate = () => {
  console.count('Translate Render');
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
    fetchChaptersInBackground,
    currentStoryId,
    setCurrentStoryId,
  } = useContext(AuthContext);
  const {
    selectedKeys: sessionSelectedKeys,
    currentKey: sessionCurrentKey,
    selectedModel: sessionSelectedModel,
    updateSelectedKeys,
    updateCurrentKey,
    updateSelectedModel,
  } = useSession();

  // Dùng lazy initializer để state khởi tạo 1 lần duy nhất
  const [state, dispatch] = useReducer(
    reducer,
    { selectedModel: sessionSelectedModel, selectedKeys: sessionSelectedKeys, currentKey: sessionCurrentKey },
    getInitialState
  );

  const {
    ui: { activeTab, isMenuOpen, isAddChapterModalOpen, loading, error, shouldRefresh },
    story: { current: currentStory, list: translatingStories, totalChapters: totalStoryChapters, currentPage, fileName },
    chapters: { items: chapters, currentIndex, selectedChapterIndex },
    auth: { currentKey: currentApiKeyFromState, selectedKeys: selectedKeysFromState, tempKey },
    model: { current: model, all: allModels, temp: tempModel },
  } = state;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Chặn useEffect chạy chồng (đề phòng trigger nhiều lần do state phụ thay đổi)
  const loadChaptersInFlightRef = useRef(false);

  // ===== Debug counters: đếm số lần các state quan trọng thay đổi =====
  const prevValuesRef = useRef({
    storyId: undefined,
    totalStoryChapters: 0,
    chaptersLen: 0,
    currentPage: 1,
  });

  useEffect(() => {
    const prev = prevValuesRef.current;
    const nextStoryId = currentStory?.id;
    if (prev.storyId !== nextStoryId) {
      console.count('state:storyId changed');
      console.log('[STATE] storyId changed:', { old: prev.storyId, new: nextStoryId });
      prev.storyId = nextStoryId;
    }
  }, [currentStory?.id]);

  useEffect(() => {
    const prev = prevValuesRef.current;
    if (prev.totalStoryChapters !== totalStoryChapters) {
      console.count('state:totalStoryChapters changed');
      console.log('[STATE] totalStoryChapters changed:', { old: prev.totalStoryChapters, new: totalStoryChapters });
      prev.totalStoryChapters = totalStoryChapters;
    }
  }, [totalStoryChapters]);

  useEffect(() => {
    const prev = prevValuesRef.current;
    const len = chapters.length;
    if (prev.chaptersLen !== len) {
      console.count('state:chapters.length changed');
      console.log('[STATE] chapters.length changed:', { old: prev.chaptersLen, new: len });
      prev.chaptersLen = len;
    }
  }, [chapters.length]);

  useEffect(() => {
    const prev = prevValuesRef.current;
    if (prev.currentPage !== currentPage) {
      console.count('state:currentPage changed');
      console.log('[STATE] currentPage changed:', { old: prev.currentPage, new: currentPage });
      prev.currentPage = currentPage;
    }
  }, [currentPage]);

  //const navigate = useNavigate();
  
  
  const handleSelectJumbChapter = useCallback((index) => {
    dispatch({ type: "CHAPTERS/SET_SELECTED_INDEX", payload: index });
  }, []);

  // Tải truyện đang dịch dựa vào storyId từ URL
  // ⬇️ loadTranslatingStory: chỉ lấy cache + hiển thị

// ⬇️ Background fetch chỉ chạy khi storyId hoặc page thay đổi
useEffect(() => {
  const loadChapters = async () => {
    const tab = searchParams.get("tab");

    if (!currentStoryId) {
      console.log("[Translate.jsx] ℹ️ currentStoryId chưa được set, bỏ qua tải chương.");
      return;
    }

    // Nếu có tab trong URL, set active tab
    if (tab === "translating") {
      dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "translating" });
    }

    const token = localStorage.getItem("auth-token");
    if (!token) {
      console.error("❌ Không tìm thấy token xác thực");
      return;
    }

    // Chặn chạy chồng
    if (loadChaptersInFlightRef.current) {
      console.log("[Translate.jsx] ⏳ loadChapters đang chạy, bỏ qua lần gọi trùng.");
      return;
    }
    loadChaptersInFlightRef.current = true;

    const startChapterNumber = (currentPage - 1) * chaptersPerPage + 1;
    const endChapterNumber = currentPage * chaptersPerPage;

    try {
      // 1. Lấy dữ liệu từ IndexedDB trước
      let cachedChapters = await getChaptersByStoryIdAndRange(
        currentStoryId,
        startChapterNumber,
        endChapterNumber
      );

      if (cachedChapters && cachedChapters.length > 0) {
        //console.log(`[Translate.jsx] ✅ Tìm thấy ${cachedChapters.length} chương trong IndexedDB cho trang ${currentPage}, story ${currentStoryId}. Hiển thị từ cache.`);
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
        if (!areChaptersEqual(chapters, formattedCachedChapters)) {
          dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedCachedChapters });
        }
        // Hiển thị từ cache rất nhanh, không cần loading overlay chính
        // dispatch({ type: "UI/LOADING", payload: false }); // Không cần tắt loading nếu chưa bật

        // Tiếp tục gọi Backend để lấy dữ liệu mới nhất trong nền (không await)
        fetchChaptersInBackground(currentStoryId, currentPage, chaptersPerPage, token).then(
          async (result) => {
            if (result.storyInfo) {
              dispatch({ type: "STORY/SET_CURRENT", payload: result.storyInfo });
            }
            dispatch({ type: "STORY/SET_TOTAL", payload: result.total });

            const fetchedChapters = result.formattedChapters;
            if (fetchedChapters && fetchedChapters.length > 0) {
              const needsUpdate = !cachedChapters || cachedChapters.length !== fetchedChapters.length || 
                                  !cachedChapters.every((c, i) => 
                                    c.translatedContent === fetchedChapters[i].translatedContent && 
                                    c.translatedTitle === fetchedChapters[i].translatedTitle &&
                                    c.rawText === fetchedChapters[i].rawText &&
                                    c.status === fetchedChapters[i].status &&
                                    c.hasError === fetchedChapters[i].hasError &&
                                    c.translationError === fetchedChapters[i].translationError
                                  );

              if (needsUpdate) {
                console.log(`[Translate.jsx] 🔄 Dữ liệu từ Backend khác hoặc không có cache. Cập nhật IndexedDB và UI (nền).`);
                await db.transaction('rw', db.chapters, async () => {
                  // Đảm bảo mỗi chương có storyId trước khi lưu
                  const chaptersToStore = fetchedChapters.map(ch => ({ ...ch, storyId: currentStoryId }));
                  await db.chapters.bulkPut(chaptersToStore);
                });
                if (!areChaptersEqual(chapters, fetchedChapters)) {
                  dispatch({ type: "CHAPTERS/SET_ITEMS", payload: fetchedChapters });
                }
                console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (nền):`, fetchedChapters.map(ch => ch.chapterName));
              } else {
                console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật (nền).`);
              }
            }
          }
        ).catch(error => console.error("❌ Lỗi khi tải chương từ Backend trong nền (useEffect):", error));

      } else {
        // Nếu không tìm thấy trong IndexedDB, hiển thị loading và fetch từ Backend (await)
        console.log(`[Translate.jsx] ⏳ Không tìm thấy chương trong IndexedDB cho trang ${currentPage}, story ${currentStoryId}. Đang tải từ Backend.`);
        dispatch({ type: "UI/LOADING", payload: true }); // Bật loading
        
        const { storyInfo, formattedChapters: fetchedChapters, total } = await fetchChaptersInBackground(currentStoryId, currentPage, chaptersPerPage, token);

        if (!storyInfo) {
          console.error("❌ Không nhận được dữ liệu truyện");
          alert("Không thể tải thông tin truyện. Vui lòng thử lại sau.");
          return; // Không tắt loading ở đây để nó được xử lý trong finally
        }
        dispatch({ type: "STORY/SET_CURRENT", payload: storyInfo });
        dispatch({ type: "STORY/SET_TOTAL", payload: total });

        if (fetchedChapters.length === 0) {
          console.warn("⚠️ Truyện không có chương nào hoặc dữ liệu chương trống.", currentStoryId);
        }

        await db.transaction('rw', db.chapters, async () => {
          // Đảm bảo mỗi chương có storyId trước khi lưu
          const chaptersToStore = fetchedChapters.map(ch => ({ ...ch, storyId: currentStoryId }));
          await db.chapters.bulkPut(chaptersToStore);
        });
        if (!areChaptersEqual(chapters, fetchedChapters)) {
          dispatch({ type: "CHAPTERS/SET_ITEMS", payload: fetchedChapters });
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("❌ Lỗi khi tải truyện đang dịch (useEffect):", error);
      let errorMessage = "Không thể tải thông tin truyện. ";
      if (error.response?.status === 401) {
        errorMessage += "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.status === 404) {
        errorMessage += "Không tìm thấy truyện.";
      } else if (error.response?.status === 500) {
        errorMessage += "Lỗi server. Vui lòng thử lại sau.";
      }
      alert(errorMessage);
      dispatch({ type: "UI/ERROR", payload: error });
    } finally {
      loadChaptersInFlightRef.current = false;
      dispatch({ type: "UI/LOADING", payload: false }); // Luôn tắt loading ở cuối
    }
  };

  loadChapters();

}, [searchParams, currentPage, currentStoryId]);

  
  // Đồng bộ session state với local state
  useEffect(() => {
    if (sessionCurrentKey && sessionCurrentKey !== currentApiKeyFromState) {
      dispatch({ type: "AUTH/SET_KEY", payload: sessionCurrentKey });
      dispatch({ type: "AUTH/SET_TEMP_KEY", payload: sessionCurrentKey });
    }
  }, [sessionCurrentKey, currentApiKeyFromState, dispatch]);

  useEffect(() => {
    if (sessionSelectedKeys && sessionSelectedKeys.length !== selectedKeysFromState.length) {
      dispatch({ type: "AUTH/SET_KEYS", payload: sessionSelectedKeys });
    }
  }, [sessionSelectedKeys, selectedKeysFromState, dispatch]);

  // Khi nhận model mới từ ModelSelector, lưu object model
  const handleModelChange = (modelObj) => {
    dispatch({ type: "MODEL/SET_TEMP", payload: modelObj });
    updateSelectedModel(modelObj);
  };

  // Nhận models từ ModelSelector
  const handleModelSelectorChange = (modelObj, modelsList) => {
    console.log('[TranslatorApp] handleModelSelectorChange', modelObj, modelsList);
    dispatch({ type: "MODEL/SET_TEMP", payload: modelObj });
    updateSelectedModel(modelObj);
    if (Array.isArray(modelsList) && modelsList.length > 0) {
      dispatch({ type: "MODEL/SET_ALL", payload: modelsList });
    }
  };

  // Nếu tempModel là string, tra cứu lại object model từ allModels
  useEffect(() => {
    if (typeof tempModel === 'string' && allModels.length > 0) {
      const found = allModels.find(m => m.value === tempModel);
      if (found) {
        dispatch({ type: "MODEL/SET_TEMP", payload: found });
        console.log('[TranslatorApp] Đã convert model string sang object:', found);
      }
    }
  }, [tempModel, allModels, dispatch]);

  // Thêm useEffect để xử lý re-render
  useEffect(() => {
    if (shouldRefresh) {
      // Reset state để tránh re-render vô hạn
      dispatch({ type: "UI/SET_SHOULD_REFRESH", payload: false });
      // Có thể thêm logic re-render ở đây nếu cần
    }
  }, [shouldRefresh, dispatch]);

  // Hàm xử lý khi người dùng chọn keys
  const handleKeysSelected = (keys) => {
    console.log("🔑 Keys đã được chọn:", keys);
    dispatch({ type: "AUTH/SET_KEYS", payload: keys });
    updateSelectedKeys(keys);
  };

  // Hàm xử lý khi người dùng thay đổi key hiện tại
  const handleCurrentKey = (key) => {
    dispatch({ type: "AUTH/SET_KEY", payload: key });
    updateCurrentKey(key);
  };

  // Khi người dùng sửa lại nội dung trong TranslateViewer
  const handleEditChapter = useCallback((index, newContent, type = "translated") => {
    // setTranslatedChapters((prev) => {
    //   const updated = [...prev];
    //   updated[index] = {
    //     ...(chapters[index] || {}),
    //     [type]: newContent,
    //   };
    //   return updated;
    // });
    // Thay vì cập nhật translatedChapters riêng, cập nhật trực tiếp chapters để nó phản ánh vào mergedChapters
    const newChapters = chapters.map((ch, idx) =>
      idx === index
        ? { ...ch, [type]: newContent }
        : ch
    );
    if (!areChaptersEqual(chapters, newChapters)) {
      dispatch({ type: "CHAPTERS/SET_ITEMS", payload: newChapters });
    }
  }, [chapters, dispatch]);

  // Hàm xử lý dịch lại chương
  const handleRetranslate = (index) => {
    translateSingleChapter({
      index,
      chapters,
      apiKey: selectedKeysFromState.length > 0 ? selectedKeysFromState : currentApiKeyFromState, // Ưu tiên selectedKeys
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
  const handleCheckKey = useCallback(async () => {
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
            dispatch({ type: "AUTH/SET_KEY", payload: tempKey });
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
  }, [tempKey, updateCurrentKey, dispatch]);

  // Tách modal thành component riêng để tránh re-render
  const AddChapterModal = React.memo(({ isOpen, onClose, onAdd, onCloseComplete }) => {
    const [addChapterModalState, dispatchAddChapterModal] = useReducer(addChapterModalReducer, initialAddChapterModalState);
    const { localTitle, localContent, localFile, localMode, processedChapters, selectedChapterIndex, isProcessingFile, selectedChapters } = addChapterModalState;

    // Hàm xử lý khi chọn/bỏ chọn một chương
    const handleChapterSelect = (index) => {
      dispatchAddChapterModal({
        type: "SET_SELECTED_CHAPTERS",
        payload: ((prev) => {
          const newSelected = new Set(prev);
          if (newSelected.has(index)) {
            newSelected.delete(index);
          } else {
            newSelected.add(index);
          }
          return newSelected;
        })(selectedChapters),
      });
    };

    // Hàm chọn/bỏ chọn tất cả chương
    const handleSelectAll = () => {
      if (selectedChapters.size === processedChapters.length) {
        // Nếu đã chọn hết thì bỏ chọn hết
        dispatchAddChapterModal({ type: "SET_SELECTED_CHAPTERS", payload: new Set() });
      } else {
        // Nếu chưa chọn hết thì chọn hết
        dispatchAddChapterModal({ type: "SET_SELECTED_CHAPTERS", payload: new Set(processedChapters.map((_, index) => index)) });
      }
    };

    // Reset selected chapters khi đóng modal hoặc chuyển mode
    const resetSelections = () => {
      dispatchAddChapterModal({ type: "RESET_ADD_CHAPTER_MODAL_STATE" });
    };

    const handleFileSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      dispatchAddChapterModal({ type: "SET_LOCAL_FILE", payload: file });
      dispatchAddChapterModal({ type: "SET_IS_PROCESSING_FILE", payload: true });
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

        dispatchAddChapterModal({ type: "SET_PROCESSED_CHAPTERS", payload: chapters });
        toast.success(`Đã tìm thấy ${chapters.length} chương trong file!`);
      } catch (error) {
        console.error("Lỗi khi xử lý file:", error);
        toast.error(error.message || "Lỗi khi xử lý file!");
      } finally {
        dispatchAddChapterModal({ type: "SET_IS_PROCESSING_FILE", payload: false });
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
                  dispatchAddChapterModal({ type: "SET_LOCAL_MODE", payload: "manual" });
                  dispatchAddChapterModal({ type: "SET_PROCESSED_CHAPTERS", payload: [] });
                  dispatchAddChapterModal({ type: "SET_SELECTED_CHAPTER_INDEX", payload: null });
                }}
              >
                Nhập thủ công
              </button>
              <button
                type="button"
                className={localMode === "file" ? "active" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatchAddChapterModal({ type: "SET_LOCAL_MODE", payload: "file" });
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
                    dispatchAddChapterModal({ type: "SET_LOCAL_TITLE", payload: e.target.value });
                  }}
                />
                <textarea
                  placeholder="Nhập nội dung chương"
                  value={localContent}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    dispatchAddChapterModal({ type: "SET_LOCAL_CONTENT", payload: e.target.value });
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
  });

  // Thêm hàm để tải lại dữ liệu sau khi thêm chương
  const handleChapterAddedCallback = useCallback(async () => {
    if (currentStory?.id) {
      // Tải lại chương hiện tại để cập nhật danh sách
      // Kích hoạt lại useEffect bằng cách cập nhật currentStoryId (nếu cần, không thay đổi giá trị sẽ không kích hoạt)
      // Hoặc gọi trực tiếp loadChapters nếu muốn bypass useEffect dependency
      // Tạm thời, ta sẽ không cần gọi lại, vì useEffect đã có currentStoryId rồi, nó sẽ tự chạy lại.
    }
  }, [currentStory?.id, currentPage, chaptersPerPage]); // loadTranslatingStory removed from dependencies

  // Hàm xử lý khi chuyển trang trong ChapterList
  const handlePageChangeInChapterList = useCallback(async (newPage) => {
    dispatch({ type: "STORY/SET_PAGE", payload: newPage });
    if (currentStory?.id) {
      // Kích hoạt lại useEffect bằng cách cập nhật currentStoryId (nếu cần, không thay đổi giá trị sẽ không kích hoạt)
      // Hoặc gọi trực tiếp loadChapters nếu muốn bypass useEffect dependency
      // Tạm thời, ta sẽ không cần gọi lại, vì useEffect đã có currentStoryId rồi, nó sẽ tự chạy lại.
    }
  }, [currentStory?.id, chaptersPerPage, dispatch]); // loadTranslatingStory removed from dependencies

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
          dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: true });
          return;
        }

        const newChapter = {
          storyId: currentStory?.id,
          chapterName: data.title,
          rawText: data.content,
          chapterNumber: totalStoryChapters + 1, // Sử dụng totalStoryChapters để đảm bảo số chương duy nhất
        };

        console.log('[Translate.jsx] ➕ Chuẩn bị thêm chương thủ công:', newChapter);

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
          dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: false });
          toast.success("✅ Đã thêm chương mới!");
          handleChapterAddedCallback?.();
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
            // Sử dụng dispatchAddChapterModal để cập nhật state trong AddChapterModal
            dispatchAddChapterModal({ type: "SET_SELECTED_CHAPTERS", payload: validChapters });
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
              chapterNumber: totalStoryChapters + i + 1, // Sử dụng totalStoryChapters để đảm bảo số chương duy nhất
            };

            console.log('[Translate.jsx] ➕ Chuẩn bị thêm chương từ file:', newChapter);

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
            dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: false });
            toast.success(`✅ Đã thêm ${successCount} chương mới từ file!`);
            handleChapterAddedCallback?.();
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
    [chapters, addChapter, currentStory?.id, getAuthToken, handleChapterAddedCallback, totalStoryChapters, dispatch]
  );

  // Tối ưu mergedChapters bằng useMemo
  const mergedChapters = useMemo(() => {
    console.count('mergedChapters recalculated');
    return chapters.map((ch, i) => ({
      ...ch,
      // ...translatedChapters[i], // Xóa dòng này
    }));
  }, [chapters]);

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

      // Cập nhật state local 'chapters' trực tiếp
      const newChapters = chapters.map((ch, idx) =>
          idx === index
            ? { 
                ...ch,
                translatedContent: translated,
                translatedTitle: translatedTitle,
                status: "TRANSLATED",
              }
            : ch
        );
      if (!areChaptersEqual(chapters, newChapters)) {
        dispatch({ type: "CHAPTERS/SET_ITEMS", payload: newChapters });
      }

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
      dispatch({ type: "CHAPTERS/SET_INDEX", payload: index });

      // Thông báo thành công
      //toast.success(`Đã dịch xong chương ${chapter.chapterNumber}`);
    } catch (error) {
      console.error("❌ Lỗi khi lưu kết quả dịch:", error);
      toast.error("Lỗi khi lưu kết quả dịch: " + error.message);
    }
  }, [chapters, currentStory?.id, updateChapterContent, dispatch]);

  const handleChapterChange = useCallback((newIndex) => {
    console.log("TranslatorApp - Index mới:", newIndex);
    dispatch({ type: "CHAPTERS/SET_INDEX", payload: newIndex });
    console.log(`[TranslatorApp] 📜 Đang cuộn về đầu trang cho chương ${newIndex + 1}...`);
    // Cuộn về đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Tính toán trang mới dựa trên index
    const newPage = Math.floor(newIndex / chaptersPerPage) + 1;
    // Gọi callback để cập nhật trang trong ChapterList
    handlePageChangeInChapterList(newPage);
  }, [handlePageChangeInChapterList, chaptersPerPage, dispatch]);

  // Memo hóa các props truyền vào ChapterList
  const memoizedModel = useMemo(() => tempModel, [tempModel]);
  const memoizedApiKey = useMemo(
    () => (selectedKeysFromState.length > 0 ? selectedKeysFromState : currentApiKeyFromState),
    [JSON.stringify(selectedKeysFromState), currentApiKeyFromState]
  );
  const memoizedChapters = useMemo(() => mergedChapters, [mergedChapters]);

  // Ref để lưu giá trị props/state trước đó
  const prevDebugPropsRef = useRef({
    mergedChapters: [],
    apiKey: "",
    model: null,
    currentIndex: 0,
    currentPage: 1,
    chaptersPerPage: chaptersPerPage,
    storyId: null,
    totalStoryChapters: 0,
  });

  // Thêm log kiểm tra re-render và props truyền vào ChapterList
  useEffect(() => {
    const currentDebugProps = {
      mergedChapters: memoizedChapters,
      apiKey: memoizedApiKey,
      model: memoizedModel,
      currentIndex,
      currentPage,
      chaptersPerPage,
      storyId: currentStory?.id,
      totalStoryChapters,
    };

    // Bỏ qua debug so sánh khi chưa có storyId để tránh log và re-render không hữu ích
    if (!currentDebugProps.storyId) {
      return;
    }

    const changedProps = Object.keys(currentDebugProps).filter(key => {
      // So sánh sâu cho objects/arrays như mergedChapters
      if (key === 'mergedChapters' || key === 'apiKey' || key === 'model') {
        return JSON.stringify(prevDebugPropsRef.current[key]) !== JSON.stringify(currentDebugProps[key]);
      }
      // So sánh trực tiếp cho các giá trị khác
      return prevDebugPropsRef.current[key] !== currentDebugProps[key];
    });

    if (changedProps.length > 0) {
      console.log('%c[DEBUG] TranslatorApp - ChapterList re-render vì props/state thay đổi:', 'color: #ff8c00; font-weight: bold;', changedProps);
      changedProps.forEach(key => {
        console.log(`  - ${key}:`, { old: prevDebugPropsRef.current[key], new: currentDebugProps[key] });
      });
    } else {
      // console.log('%c[DEBUG] TranslatorApp - ChapterList re-render KHÔNG CÓ THAY ĐỔI PROPS/STATE', 'color: #008000; font-weight: bold;');
    }

    // Cập nhật ref với các giá trị hiện tại
    prevDebugPropsRef.current = currentDebugProps;

  }, [memoizedChapters, memoizedApiKey, memoizedModel, currentIndex, currentPage, chaptersPerPage, currentStory?.id, totalStoryChapters]);

  // Log chapters prop trong TranslatorApp
  // useEffect(() => {
  //   console.log('[TranslatorApp] 📊 Chapters prop received:', chapters);
  //   if (chapters && chapters.length > 0) {
  //     console.log('[TranslatorApp] ✅ Chapters prop not empty. First chapter:', chapters[0]);
  //   }
  //   // Reset translatedChapters khi chapters thay đổi, để tránh hiển thị nội dung dịch cũ từ trang khác
  //   // setTranslatedChapters([]); // Xóa dòng này
  // }, [chapters]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStories();
    }
  }, [isLoggedIn, fetchStories]);

  useEffect(() => {
    if (stories) {
      // Lọc các truyện đang dịch (isComplete == false)
      const translatingStories = stories.filter((story) => !story.isComplete);
      dispatch({ type: "SET_TRANSLATING_STORIES", payload: translatingStories });
    }
  }, [stories, dispatch]);

  // Xử lý khi chuyển tab
  const handleTabChange = useCallback((tab) => {
    dispatch({ type: "UI/SET_ACTIVE_TAB", payload: tab });
    // Nếu chuyển sang tab "new", xóa storyId khỏi URL
    if (tab === "new") {
      const newUrl = window.location.pathname;
      window.history.pushState({}, "", newUrl);
      dispatch({ type: "STORY/SET_CURRENT", payload: null });
      // Không cần kiểm tra areChaptersEqual ở đây vì luôn reset về mảng rỗng
      dispatch({ type: "CHAPTERS/SET_ITEMS", payload: [] });
      // Reset currentPage về 1 khi chuyển tab
      dispatch({ type: "STORY/SET_PAGE", payload: 1 });
      setCurrentStoryId(null); // Reset currentStoryId khi chuyển sang tab "new"
    }
  }, [dispatch]);

  // Xử lý khi nhận được chapters từ UploadForm
  const handleParsedChapters = useCallback((parsedChapters, key, model) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    // Chỉ cập nhật chapters nếu có sự thay đổi thực sự
    if (!areChaptersEqual(chapters, parsedChapters)) {
      dispatch({ type: "CHAPTERS/SET_ITEMS", payload: parsedChapters });
    }
    dispatch({ type: "AUTH/SET_KEY", payload: key });
    updateCurrentKey(key);
    dispatch({ type: "MODEL/SET_TEMP", payload: model });
    updateSelectedModel(model);
    // Khi parse file mới, reset currentPage về 1
    dispatch({ type: "STORY/SET_PAGE", payload: 1 });
  }, [dispatch, updateCurrentKey, updateSelectedModel, chapters]);

  // Cập nhật nội dung chương đã dịch
  const handleUpdateChapterContent = useCallback(async (storyId, chapterNumber, translatedTitle, translatedContent, timeTranslation = 0) => {
    try {
      // Log để debug
      console.log("📝 Cập nhật nội dung chương:", {
        storyId,
        chapterNumber,
        hasTranslatedTitle: !!translatedTitle,
        hasTranslatedContent: !!translatedContent,
        timeTranslation: timeTranslation
      });

      if (!storyId) throw new Error("Thiếu storyId");
      if (!chapterNumber) throw new Error("Thiếu chapterNumber");
      
      const response = await updateChapterContent(
        storyId,
        chapterNumber,
        translatedTitle,
        translatedContent,
        timeTranslation
      );

      // await loadTranslatingStory(storyId, currentPage, chaptersPerPage); // Removed
      // Kích hoạt lại useEffect bằng cách cập nhật currentStoryId (nếu cần, không thay đổi giá trị sẽ không kích hoạt)
      // Tạm thời, ta sẽ không cần gọi lại, vì useEffect đã có currentStoryId rồi, nó sẽ tự chạy lại.

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
  }, [currentPage, chaptersPerPage, updateChapterContent]); // loadTranslatingStory removed from dependencies

  // Lưu truyện mới
  const handleSaveStory = useCallback(async (storyInfo) => {
    try {
      console.time('Save Story to Backend');
      const chaptersToSend = chapters.map((ch) => ({
        chapterName: ch.chapterName,
        rawText: ch.content,
      }));
      console.log(`[Translate.jsx] 📦 Đang gửi ${chaptersToSend.length} chương lên Backend...`);

      const response = await createStory(
        {...storyInfo, chapters: chaptersToSend}
      );
      console.timeEnd('Save Story to Backend');
      dispatch({ type: "STORY/SET_CURRENT", payload: response });
      navigate(`/translate?storyId=${response.id}&tab=translating`);
      dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "translating" });
      setCurrentStoryId(response.id); // Cập nhật currentStoryId sau khi lưu truyện mới
      return response;
    } catch (error) {
      console.error("Lỗi khi lưu truyện:", error);
      throw error;
    }
  }, [chapters, createStory, dispatch, navigate, chaptersPerPage, setCurrentStoryId]); // loadTranslatingStory removed from dependencies

  // Cập nhật thông tin truyện
  const handleUpdateStoryInfo = useCallback(async (storyInfo) => {
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
      dispatch({ type: "STORY/SET_CURRENT", payload: {...currentStory, ...storyInfo} });
      return response.data;
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật truyện:", error);
      throw error;
    }
  }, [currentStory, editStories, dispatch]);

  // Cập nhật một trường cụ thể của truyện
  const handleUpdateStoryField = useCallback((storyId, field, value) => {
    editStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    dispatch({ type: "SET_TRANSLATING_STORIES", payload: translatingStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
    ) });
    // Nếu đang xem truyện đó, cập nhật luôn currentStory
    if (currentStory && currentStory.id === storyId) {
      dispatch({ type: "STORY/SET_CURRENT", payload: {...currentStory, [field]: value} });
    }
  }, [currentStory, editStories, dispatch, translatingStories]);

  // Ẩn truyện (xóa mềm)
  const handleHideStory = useCallback(async (storyId) => {
    await hideStories(storyId);
    // Cập nhật state local sau khi ẩn thành công
    dispatch({ type: "SET_TRANSLATING_STORIES", payload: translatingStories.filter((story) => story.id !== storyId) });
    // Nếu truyện đang được chọn là truyện bị ẩn, reset currentStory và chapters
    if (currentStory && currentStory.id === storyId) {
      dispatch({ type: "STORY/SET_CURRENT", payload: null });
      // Không cần kiểm tra areChaptersEqual ở đây vì luôn reset về mảng rỗng
      dispatch({ type: "CHAPTERS/SET_ITEMS", payload: [] });
      navigate("/translate"); // Quay về trang chính của tab translating
      setCurrentStoryId(null); // Reset currentStoryId khi truyện bị ẩn
    }
  }, [currentStory, hideStories, dispatch, navigate, translatingStories, setCurrentStoryId]);

  // Xóa truyện vĩnh viễn (xóa cứng)
  const handleDeleteStory = useCallback(async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStories(storyId);

      // Xóa cache IndexedDB cho truyện này
      await clearChapters(storyId);

      // Cập nhật state local sau khi xóa thành công
      dispatch({ type: "SET_TRANSLATING_STORIES", payload: translatingStories.filter((story) => story.id !== storyId) });
      // Nếu truyện đang được chọn là truyện bị xóa, reset currentStory và chapters
      if (currentStory && currentStory.id === storyId) {
        dispatch({ type: "STORY/SET_CURRENT", payload: null });
        // Không cần kiểm tra areChaptersEqual ở đây vì luôn reset về mảng rỗng
        dispatch({ type: "CHAPTERS/SET_ITEMS", payload: [] });
        navigate("/translate"); // Quay về trang chính của tab translating
        setCurrentStoryId(null); // Reset currentStoryId khi truyện bị xóa
      }
    }
  }, [currentStory, deleteStories, clearChapters, dispatch, navigate, translatingStories, setCurrentStoryId]);

  // Xử lý khi click vào một truyện
  const handleStoryClick = useCallback((storyId) => {
    console.time('Load and Display Chapters');
    // Cập nhật URL với storyId
    navigate(`/translate?storyId=${storyId}&tab=translating`);
    // Set tab translating active
    dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "translating" });
    // Load truyện được chọn (trang 1)
    setCurrentStoryId(storyId); // Cập nhật currentStoryId khi click vào truyện
  }, [dispatch, navigate, setCurrentStoryId]);

  // Thêm hàm để tải lại dữ liệu sau khi thêm chương
  const handleChapterAdded = async () => {
    if (currentStory?.id) {
      // Tải lại chương hiện tại để cập nhật danh sách
      // Kích hoạt lại useEffect bằng cách cập nhật currentStoryId (nếu cần, không thay đổi giá trị sẽ không kích hoạt)
      // Hoặc gọi trực tiếp loadChapters nếu muốn bypass useEffect dependency
      // Tạm thời, ta sẽ không cần gọi lại, vì useEffect đã có currentStoryId rồi, nó sẽ tự chạy lại.
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
          onClick={() => dispatch({ type: "UI/TOGGLE_MENU", payload: !isMenuOpen })}
        >
          🔑
          <span className="tooltip-text">Nhập key</span>
        </div>
        {/* Nút thêm chương */}
        <div
          className="menu-toggle-button add-chapter-button"
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: true });
          }}
        >
          ➕<span className="tooltip-text">Thêm chương</span>
        </div>
  
        <AddChapterModal
          isOpen={isAddChapterModalOpen}
          onClose={() => dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: false })}
          onAdd={handleAddChapter}
          onCloseComplete={() => {
            dispatch({ type: "UI/SET_SHOULD_REFRESH", payload: true });
            handleChapterAddedCallback?.();
          }}
        />
  
        {/* Modal nhập key */}
        {isMenuOpen && (
          <div className="modal-overlay modal-key-model">
            <div className="modal-content modal-key-model-content">
              <button
                className="modal-close-button"
                onClick={() => dispatch({ type: "UI/TOGGLE_MENU", payload: false })}
              >
                ✕
              </button>
              <h3>📘 Menu key</h3>
              <div className="top-menu-body">
                <ConverteKeyInput
                  apiKey={tempKey}
                  setApiKey={(key) => dispatch({ type: "AUTH/SET_TEMP_KEY", payload: key })}
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
                    if (selectedKeysFromState.length > 0) {
                      dispatch({ type: "AUTH/SET_KEY", payload: selectedKeysFromState });
                      updateCurrentKey(selectedKeysFromState[0]);
                    } else {
                      dispatch({ type: "AUTH/SET_KEY", payload: tempKey });
                      updateCurrentKey(tempKey);
                    }
                    dispatch({ type: "MODEL/SET_CURRENT", payload: tempModel });
                    updateSelectedModel(tempModel);
                    dispatch({ type: "UI/TOGGLE_MENU", payload: false });
                  }}
                >
                  Áp dụng
                </button>
                <button className="cancel-key-modal-btn" onClick={() => dispatch({ type: "UI/TOGGLE_MENU", payload: false })}>Đóng</button>
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
              onChapterAdded={handleChapterAddedCallback}
          currentPage={currentPage}
          chaptersPerPage={chaptersPerPage}
          onPageChange={handlePageChangeInChapterList}
              totalStoryChapters={totalStoryChapters}
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
              totalStoryChapters={totalStoryChapters}
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
            onClick={() => dispatch({ type: "UI/TOGGLE_MENU", payload: !isMenuOpen })}
          >
            🔑
            <span className="tooltip-text">Nhập key</span>
          </div>
          {/* Nút thêm chương */}
          <div
            className="menu-toggle-button add-chapter-button"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: true });
            }}
          >
            ➕<span className="tooltip-text">Thêm chương</span>
          </div>
    
          <AddChapterModal
            isOpen={isAddChapterModalOpen}
            onClose={() => dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: false })}
            onAdd={handleAddChapter}
            onCloseComplete={() => {
              dispatch({ type: "UI/SET_SHOULD_REFRESH", payload: true });
              handleChapterAddedCallback?.();
            }}
          />
    
          {/* Modal nhập key */}
          {isMenuOpen && (
            <div className="modal-overlay modal-key-model">
              <div className="modal-content modal-key-model-content">
                <button
                  className="modal-close-button"
                  onClick={() => dispatch({ type: "UI/TOGGLE_MENU", payload: false })}
                >
                  ✕
                </button>
                <h3>📘 Menu key</h3>
                <div className="top-menu-body">
                  <ConverteKeyInput
                    apiKey={tempKey}
                    setApiKey={(key) => dispatch({ type: "AUTH/SET_TEMP_KEY", payload: key })}
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
                      if (selectedKeysFromState.length > 0) {
                        dispatch({ type: "AUTH/SET_KEY", payload: selectedKeysFromState });
                        updateCurrentKey(selectedKeysFromState[0]);
                      } else {
                        dispatch({ type: "AUTH/SET_KEY", payload: tempKey });
                        updateCurrentKey(tempKey);
                      }
                      dispatch({ type: "MODEL/SET_CURRENT", payload: tempModel });
                      updateSelectedModel(tempModel);
                      dispatch({ type: "UI/TOGGLE_MENU", payload: false });
                    }}
                  >
                    Áp dụng
                  </button>
                  <button className="cancel-key-modal-btn" onClick={() => dispatch({ type: "UI/TOGGLE_MENU", payload: false })}>Đóng</button>
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
                onChapterAdded={handleChapterAddedCallback}
            currentPage={currentPage}
            chaptersPerPage={chaptersPerPage}
            onPageChange={handlePageChangeInChapterList}
                totalStoryChapters={totalStoryChapters}
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
                totalStoryChapters={totalStoryChapters}
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
              dispatch({ type: "SET_ACTIVE_TAB", payload: "translating" });
              dispatch({ type: "STORY/SET_CURRENT", payload: null });
              dispatch({ type: "CHAPTERS/SET_ITEMS", payload: [] });
              navigate("/translate");
              dispatch({ type: "STORY/SET_PAGE", payload: 1 });
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
      
      {/* Translation Bot */}
      <TranslationBot />
    </div>
  );
};

export default Translate;
