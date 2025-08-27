// File: Translate.jsx
import React, { useReducer, useContext, useEffect, useCallback, useMemo, useState } from "react";
import UploadForm from "../components/UploadForm/UploadForm";
import ChapterList from "../components/ChapterList/ChapterList";
import TranslateViewer from "../components/TranslateViewer/TranslateViewer";
import ConverteKeyInput from "../components/ConverteKeyInput/ConverteKeyInput";
import ModelSelector from "../components/ModelSelector/ModelSelector";
import { AuthContext } from "../context/ConverteContext";
import { useSession } from "../context/SessionContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import db, { addChapters, getChaptersByStoryIdAndRange, clearChapters } from "../services/indexedDBService";
import { translateSingleChapter } from "../services/translateSingleChapter";
import { handleEpubFile, checkFileFormatFromText } from "../utils/fileHandlers";
import { FaSpinner } from "react-icons/fa";
import "../pages/pageCSS/Translate.css";

// ----------------------
// ✅ initialState & reducer
// ----------------------
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

    default:
      return state;
  }
}

// ----------------------
// ✅ Component AddChapterModal
// ----------------------
const AddChapterModal = React.memo(({ isOpen, onClose, onAdd, onCloseComplete }) => {
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localFile, setLocalFile] = useState(null);
  const [localMode, setLocalMode] = useState("manual");
  const [processedChapters, setProcessedChapters] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!isOpen) return null;

  const resetSelections = () => {
    setSelectedChapters(new Set());
    setProcessedChapters([]);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLocalFile(file);
    setIsProcessingFile(true);
    resetSelections();

    try {
      const content = await file.text();
      const fileExt = file.name.split(".").pop().toLowerCase();
      let chapters = [];
      if (fileExt === "epub") {
        chapters = await handleEpubFile(content);
      } else if (fileExt === "txt") {
        const result = checkFileFormatFromText(content);
        if (!result.valid) {
          toast.error("File không đúng định dạng chương!");
          return;
        }
        chapters = result.chapters;
      }
      setProcessedChapters(chapters);
    } catch (err) {
      toast.error("Lỗi khi xử lý file");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (localMode === "manual") {
      if (!localTitle.trim() || !localContent.trim()) {
        toast.error("Nhập tiêu đề + nội dung!");
        return;
      }
      onAdd({ title: localTitle, content: localContent, mode: "manual" });
    } else {
      if (!localFile || selectedChapters.size === 0) {
        toast.error("Chọn file + ít nhất 1 chương!");
        return;
      }
      onAdd({
        mode: "file",
        file: localFile,
        selectedChapters,
        processedChapters,
        setSelectedChapters,
      });
    }
    onClose();
    onCloseComplete?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <button type="button" onClick={onClose}>✕</button>
          <h3>Thêm chương mới</h3>
          <div>
            <button type="button" onClick={() => setLocalMode("manual")}>Thủ công</button>
            <button type="button" onClick={() => setLocalMode("file")}>Từ file</button>
          </div>
          {localMode === "manual" ? (
            <>
              <input value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} />
              <textarea value={localContent} onChange={(e) => setLocalContent(e.target.value)} />
            </>
          ) : (
            <input type="file" accept=".txt,.epub" onChange={handleFileSelect} />
          )}
          <button type="submit">Thêm</button>
        </form>
      </div>
    </div>
  );
});

// ----------------------
// ✅ Main Component Translate
// ----------------------
export default function Translate() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    ui: { activeTab, isMenuOpen, isAddChapterModalOpen, loading },
    story: { current: currentStory, totalChapters, currentPage },
    chapters: { items: chapters, currentIndex, selectedChapterIndex },
    auth: { currentKey, selectedKeys, tempKey },
    model: { temp: tempModel },
  } = state;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getAuthToken } = useContext(AuthContext);
  const { updateCurrentKey, updateSelectedKeys, updateSelectedModel } = useSession();

  const chaptersPerPage = 10;

  const handlePageChangeInChapterList = useCallback(async (newPage) => {
    dispatch({ type: "STORY/SET_PAGE", payload: newPage });
    // TODO: loadTranslatingStory(newPage)
  }, []);

  const memoizedChapters = useMemo(() => chapters, [chapters]);
  const memoizedModel = useMemo(() => tempModel, [tempModel?.value]);
  const memoizedApiKey = useMemo(
    () => (selectedKeys.length > 0 ? selectedKeys[0] : currentKey),
    [JSON.stringify(selectedKeys), currentKey]
  );

  return (
    <div className="translate-page">
      {/* Tabs */}
      <div className="translate-tabs">
        <button
          className={`tab-button ${activeTab === "new" ? "active" : ""}`}
          onClick={() => dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "new" })}
        >
          Dịch truyện mới
        </button>
        <button
          className={`tab-button ${activeTab === "translating" ? "active" : ""}`}
          onClick={() => dispatch({ type: "UI/SET_ACTIVE_TAB", payload: "translating" })}
        >
          Truyện đang dịch
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <FaSpinner className="spinner" />
          <p>Đang tải chương truyện...</p>
        </div>
      )}

      {/* Nội dung */}
      {activeTab === "new" ? (
        <UploadForm onParsedChapters={(chs, key, model) => {
          dispatch({ type: "CHAPTERS/SET_ITEMS", payload: chs });
          dispatch({ type: "AUTH/SET_KEY", payload: key });
          updateCurrentKey(key);
          dispatch({ type: "MODEL/SET_TEMP", payload: model });
          updateSelectedModel(model);
        }} />
      ) : (
        <div className="translator-app-wrapper">
          <ChapterList
            chapters={memoizedChapters}
            apiKey={memoizedApiKey}
            model={memoizedModel}
            currentIndex={currentIndex}
            onSelectChapter={(idx) => dispatch({ type: "CHAPTERS/SET_INDEX", payload: idx })}
            currentPage={currentPage}
            chaptersPerPage={chaptersPerPage}
            onPageChange={handlePageChangeInChapterList}
            totalStoryChapters={totalChapters}
          />
          <TranslateViewer
            chapters={memoizedChapters}
            currentIndex={currentIndex}
            onChangeIndex={(idx) => dispatch({ type: "CHAPTERS/SET_INDEX", payload: idx })}
            selectedChapterIndex={selectedChapterIndex}
            onUpdateChapter={(index, content) => {
              const newChapters = chapters.map((ch, i) =>
                i === index ? { ...ch, translatedContent: content } : ch
              );
              dispatch({ type: "CHAPTERS/SET_ITEMS", payload: newChapters });
            }}
          />
          <AddChapterModal
            isOpen={isAddChapterModalOpen}
            onClose={() => dispatch({ type: "UI/TOGGLE_ADD_MODAL", payload: false })}
            onAdd={() => {}}
            onCloseComplete={() => dispatch({ type: "UI/SET_SHOULD_REFRESH", payload: true })}
          />
        </div>
      )}
    </div>
  );
}
