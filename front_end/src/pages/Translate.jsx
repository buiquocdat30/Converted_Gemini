import React, { useState, useContext, useEffect, useCallback, useMemo, useReducer } from "react";
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

// Định nghĩa initialState
const initialState = {
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
    currentKey: "",
    selectedKeys: [],
    isLoggedIn: false,
    tempKey: "",
  },
  model: {
    current: { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    all: [],
    temp: { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  },
};

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

  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    ui: { activeTab, isMenuOpen, isAddChapterModalOpen, loading, error, shouldRefresh },
    story: { current: currentStory, list: translatingStories, totalChapters: totalStoryChapters, currentPage, fileName },
    chapters: { items: chapters, currentIndex, selectedChapterIndex },
    auth: { currentKey: currentApiKey, selectedKeys, tempKey },
    model: { current: model, all: allModels, temp: tempModel },
  } = state;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Khởi tạo các giá trị từ session/localStorage
  useEffect(() => {
    dispatch({ type: "AUTH/SET_KEY", payload: sessionCurrentKey || "" });
    dispatch({ type: "AUTH/SET_TEMP_KEY", payload: sessionCurrentKey || "" });
    
    const initialModel = sessionSelectedModel || initialState.model.current;
    dispatch({ type: "MODEL/SET_CURRENT", payload: initialModel });
    dispatch({ type: "MODEL/SET_TEMP", payload: initialModel });
    
    dispatch({ type: "AUTH/SET_KEYS", payload: sessionSelectedKeys || [] });
  }, [sessionCurrentKey, sessionSelectedModel, sessionSelectedKeys, dispatch]);

  useEffect(() => {
    console.log('[Translate.jsx] 📊 Loading state changed:', loading);
  }, [loading]);

  const handleSelectJumbChapter = useCallback((index) => {
    dispatch({ type: "CHAPTERS/SET_SELECTED_INDEX", payload: index });
  }, []);

  // Tải truyện đang dịch dựa vào storyId từ URL
  const loadTranslatingStory = useCallback(async (storyId, page, limit) => {
    dispatch({ type: "UI/ERROR", payload: null });
    dispatch({ type: "UI/LOADING", payload: true }); // Bật loading ngay khi bắt đầu tải (dù từ cache hay BE)

    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        console.error("❌ Không tìm thấy token xác thực");
        alert("Vui lòng đăng nhập lại để tiếp tục");

        dispatch({ type: "UI/LOADING", payload: false });

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
        if (!areChaptersEqual(chapters, formattedCachedChapters)) {
          dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedCachedChapters });
        }
        console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ cache:`, formattedCachedChapters.map(ch => ch.chapterName));
        console.log('[Translate.jsx] 📖 Chapters state sau khi cập nhật từ cache:', formattedCachedChapters.map(ch => ({ chapterNumber: ch.chapterNumber, chapterName: ch.chapterName, translated: ch.translated, status: ch.status })));
        console.log('[Translate.jsx] 🔍 Kiểm tra tính duy nhất của chapterNumber và id (từ cache):', formattedCachedChapters.map(ch => ({ id: ch.id, chapterNumber: ch.chapterNumber })));
        dispatch({ type: "UI/LOADING", payload: false }); // Tắt loading ngay lập tức nếu dữ liệu từ cache có sẵn

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
            dispatch({ type: "STORY/SET_CURRENT", payload: storyInfoResponse.data });
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
          dispatch({ type: "STORY/SET_TOTAL", payload: chaptersResponse.data.totalChaptersCount || 0 });
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
              await db.chapters.bulkPut(formattedChapters); // Thay đổi từ bulkAdd sang bulkPut
            }).then(() => {
              console.log(`[Translate.jsx] ✅ Cập nhật IndexedDB thành công trong transaction (nền).`);
              if (!areChaptersEqual(chapters, formattedChapters)) {
                dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedChapters }); // Cập nhật chapters với dữ liệu từ BE
              }
              console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (nền):`, formattedChapters.map(ch => ch.chapterName));
              console.log('[Translate.jsx] 📖 Chapters state sau khi cập nhật từ BE (nền):', formattedChapters.map(ch => ({ chapterNumber: ch.chapterNumber, chapterName: ch.chapterName, translated: ch.translated, status: ch.status })));
              console.log('[Translate.jsx] 🔍 Kiểm tra tính duy nhất của chapterNumber và id (từ BE nền):', formattedChapters.map(ch => ({ id: ch.id, chapterNumber: ch.chapterNumber })));
            }).catch(dbError => console.error("❌ Lỗi Transaction IndexedDB (nền):", dbError));

          } else {
            console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật (nền).`);
            if (!areChaptersEqual(chapters, formattedChapters)) {
              dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedChapters }); // Dữ liệu khớp, nhưng vẫn cần cập nhật state chapters với dữ liệu từ BE để đảm bảo tính đồng bộ
            }
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (dữ liệu khớp cache, nền):`, formattedChapters.map(ch => ch.chapterName));
            console.log('[Translate.jsx] 📖 Chapters state sau khi cập nhật từ BE (dữ liệu khớp cache, nền):', formattedChapters.map(ch => ({ id: ch.id, chapterNumber: ch.chapterNumber })));
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
          dispatch({ type: "UI/LOADING", payload: false });
          return;
        }
        dispatch({ type: "STORY/SET_CURRENT", payload: storyInfoResponse.data });

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

        dispatch({ type: "STORY/SET_TOTAL", payload: chaptersResponse.data.totalChaptersCount || 0 });
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
              await db.chapters.bulkPut(formattedChapters); // Thay đổi từ bulkAdd sang bulkPut
            });
            console.log(`[Translate.jsx] ✅ Cập nhật IndexedDB thành công trong transaction.`);
            if (!areChaptersEqual(chapters, formattedChapters)) {
              dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedChapters }); // Cập nhật chapters với dữ liệu từ BE
            }
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend:`, formattedChapters.map(ch => ch.chapterName));
            console.log('[Translate.jsx] 📖 Chapters state sau khi cập nhật từ BE:', formattedChapters.map(ch => ({ chapterNumber: ch.chapterNumber, chapterName: ch.chapterName, translated: ch.translated, status: ch.status })));
            console.log('[Translate.jsx] 🔍 Kiểm tra tính duy nhất của chapterNumber và id (từ BE):', formattedChapters.map(ch => ({ id: ch.id, chapterNumber: ch.chapterNumber })));
          } catch (dbError) {
            console.error("❌ Lỗi Transaction IndexedDB:", dbError);
            if (!areChaptersEqual(chapters, formattedChapters)) {
              dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedChapters }); // Fallback: vẫn update UI với BE data
            }
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (fallback):`, formattedChapters.map(ch => ch.chapterName));
            console.log('[Translate.jsx] 📖 Chapters state sau khi cập nhật từ BE (fallback):', formattedChapters.map(ch => ({ id: ch.id, chapterNumber: ch.chapterNumber })));
          }

        } else {
          console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật.`);
          if (!areChaptersEqual(chapters, formattedChapters)) {
            dispatch({ type: "CHAPTERS/SET_ITEMS", payload: formattedChapters }); // Dữ liệu khớp, nhưng vẫn cần cập nhật state chapters với dữ liệu từ BE để đảm bảo tính đồng bộ
          }
          console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (dữ liệu khớp cache):`, formattedChapters.map(ch => ch.chapterName));
          console.log('[Translate.jsx] 📖 Chapters state sau khi cập nhật từ BE (dữ liệu khớp cache):', formattedChapters.map(ch => ({ id: ch.id, chapterNumber: ch.chapterNumber })));
        }

        dispatch({ type: "UI/LOADING", payload: false }); // Tắt loading sau khi toàn bộ quá trình tải từ Backend hoàn tất
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

      dispatch({ type: "UI/LOADING", payload: false });
      dispatch({ type: "UI/ERROR", payload: error });

    }
  }, [dispatch, db, getChaptersByStoryIdAndRange, axios, chapters]);

  // Đồng bộ session state với local state
  useEffect(() => {
    if (sessionCurrentKey && sessionCurrentKey !== currentApiKey) {
      dispatch({ type: "AUTH/SET_KEY", payload: sessionCurrentKey });
      dispatch({ type: "AUTH/SET_TEMP_KEY", payload: sessionCurrentKey });
    }
  }, [sessionCurrentKey, currentApiKey, dispatch]);

  useEffect(() => {
    if (sessionSelectedKeys && sessionSelectedKeys.length !== selectedKeys.length) {
      dispatch({ type: "AUTH/SET_KEYS", payload: sessionSelectedKeys });
    }
  }, [sessionSelectedKeys, selectedKeys, dispatch]);

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

  // useEffect đồng bộ lại khi sessionSelectedModel hoặc model prop thay đổi
  useEffect(() => {
    // Chỉ dispatch nếu sessionSelectedModel khác tempModel.value HOẶC model.id/value
    if (sessionSelectedModel && (sessionSelectedModel.value !== tempModel?.value || sessionSelectedModel.id !== tempModel?.id)) {
      dispatch({ type: "MODEL/SET_TEMP", payload: sessionSelectedModel });
    }
  }, [sessionSelectedModel, tempModel, dispatch]);

  useEffect(() => {
    // Chỉ dispatch nếu model khác tempModel.value HOẶC model.id/value và không có sessionSelectedModel
    if (model && !sessionSelectedModel && (model.value !== tempModel?.value || model.id !== tempModel?.id)) {
      dispatch({ type: "MODEL/SET_TEMP", payload: model });
    }
  }, [model, tempModel, sessionSelectedModel, dispatch]);

  // Thêm useEffect để xử lý re-render
  useEffect(() => {
    if (shouldRefresh) {
      // Reset state để tránh re-render vô hạn
      dispatch({ type: "UI/SET_SHOULD_REFRESH", payload: false });
      // Có thể thêm logic re-render ở đây nếu cần
    }
  }, [shouldRefresh, dispatch]);

  // Đồng bộ model khi model cha thay đổi
  useEffect(() => {
    // Chỉ dispatch nếu model khác tempModel.value HOẶC model.id/value và không có sessionSelectedModel
    if (model && !sessionSelectedModel && (model.value !== tempModel?.value || model.id !== tempModel?.id)) {
      dispatch({ type: "MODEL/SET_TEMP", payload: model });
    }
  }, [model, tempModel, sessionSelectedModel, dispatch]);

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
      await loadTranslatingStory(currentStory.id, currentPage, chaptersPerPage);
    }
  }, [currentStory?.id, currentPage, chaptersPerPage, loadTranslatingStory]);

  // Hàm xử lý khi chuyển trang trong ChapterList
  const handlePageChangeInChapterList = useCallback(async (newPage) => {
    dispatch({ type: "STORY/SET_PAGE", payload: newPage });
    if (currentStory?.id) {
      await loadTranslatingStory(currentStory.id, newPage, chaptersPerPage);
    }
  }, [currentStory?.id, chaptersPerPage, loadTranslatingStory, dispatch]);

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
    // Reset translatedChapters khi chapters thay đổi, để tránh hiển thị nội dung dịch cũ từ trang khác
    // setTranslatedChapters([]); // Xóa dòng này
  }, [chapters]);

  // Memo hóa các props truyền vào ChapterList
  const memoizedModel = useMemo(() => tempModel, [tempModel]);
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
      dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "translating" });
    }

    if (storyId) {
      loadTranslatingStory(storyId, currentPage, chaptersPerPage);
    }
  }, [searchParams, loadTranslatingStory, currentPage, chaptersPerPage, dispatch]);

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
  }, [loadTranslatingStory, currentPage, chaptersPerPage, updateChapterContent]);

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
      loadTranslatingStory(response.id, 1, chaptersPerPage);
      return response;
    } catch (error) {
      console.error("Lỗi khi lưu truyện:", error);
      throw error;
    }
  }, [chapters, createStory, dispatch, navigate, loadTranslatingStory, chaptersPerPage]);

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
    }
  }, [currentStory, hideStories, dispatch, navigate, translatingStories]);

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
      }
    }
  }, [currentStory, deleteStories, clearChapters, dispatch, navigate, translatingStories]);

  // Xử lý khi click vào một truyện
  const handleStoryClick = useCallback((storyId) => {
    console.time('Load and Display Chapters');
    // Cập nhật URL với storyId
    navigate(`/translate?storyId=${storyId}&tab=translating`);
    // Set tab translating active
    dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "translating" });
    // Load truyện được chọn (trang 1)
    loadTranslatingStory(storyId, 1, chaptersPerPage);
  }, [dispatch, navigate, loadTranslatingStory, chaptersPerPage]);

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
                    if (selectedKeys.length > 0) {
                      dispatch({ type: "AUTH/SET_KEY", payload: selectedKeys });
                      updateCurrentKey(selectedKeys[0]);
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
                      if (selectedKeys.length > 0) {
                        dispatch({ type: "AUTH/SET_KEY", payload: selectedKeys });
                        updateCurrentKey(selectedKeys[0]);
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
    </div>
  );
};

export default Translate;
