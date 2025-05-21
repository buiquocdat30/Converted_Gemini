import React, { useState, useRef, useContext, useEffect } from "react";
// import "../css/App.css";
import "./UploadForm.css";
import ConverteKeyInput from "../ConverteKeyInput/ConverteKeyInput.jsx";
import { AuthContext } from "../../context/ConverteContext";
import TranslationInfoPanel from "../TranslationInfoPanel/TranslationInfoPanel.jsx";
import axios from "axios";

import {
  handleEpubFile,
  handleTxtFile,
  checkFileFormatFromText,
} from "../../utils/fileHandlers.js";

const models = [
  {
    value: "gemini-1.5-pro", //ok
    label: "Gemini 1.5 Pro",
    description: "Giới hạn miễn phí: 2 lần/phút, 50 lần một ngày.",
  },
  {
    value: "gemini-1.5-flash", //ok
    label: "Gemini 1.5 Flash",
    description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
  },
  {
    value: "gemini-1.5-flash-8b", //ok
    label: "Gemini 1.5 Flash-8B",
    description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
  },
  {
    value: "gemini-2.0-flash-lite", //ok
    label: "Gemini 2.0 Flash-Lite",
    description: "Giới hạn miễn phí: 30 lần/phút, 1500 lần một ngày.",
  },

  {
    value: "gemini-2.0-flash", //ok
    label: "Gemini 2.0 Flash",
    description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
  },
];

const UploadForm = ({ onFileParsed }) => {
  const {
    isLoggedIn,
    username,
    setUsername,
    onLogin,
    onLogout,
    setMenu,
    menu,
    uploadFile,
    processFile,
    getProcessedFile,
    createStory,
    loading,
    error,
    setError,
    apiKey,
    setApiKey,
    model,
    setModel,
  } = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [showStoryInfoModal, setShowStoryInfoModal] = useState(false);
  const [success, setSuccess] = useState("");
  const [storyInfo, setStoryInfo] = useState({
    name: "",
    author: "Không biết",
    storyAvatar: "/default-avatar.jpg",
  });

  //khu vực panel review file
  const [books, setBooks] = useState(""); //tên truyện
  const [author, setAuthor] = useState(""); //tên tác giả
  const [chapterCount, setChapterCount] = useState(0); //tổng chương
  const [totalWords, setTotalWords] = useState(0); //tổng từ
  const [averageWords, setAverageWords] = useState(0); //trung bình từ

  //selected model
  const [selectedModel, setSelectedModel] = useState(model || "gemini-2.0-flash");

  // Thêm state local để quản lý apiKey
  const [localApiKey, setLocalApiKey] = useState(apiKey || "");

  // Thêm useEffect để đồng bộ apiKey từ context
  useEffect(() => {
    if (apiKey) {
      setLocalApiKey(apiKey);
    }
  }, [apiKey]);

  // Thêm hàm xử lý khi apiKey thay đổi
  const handleApiKeyChange = (newKey) => {
    setLocalApiKey(newKey);
    if (setApiKey) {
      setApiKey(newKey);
    }
  };

  const fileInputRef = useRef(null);

  // Thêm hàm xử lý khi file được chọn
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setBooks(file.name.replace(/\.[^/.]+$/, "")); // Lấy tên file không có phần mở rộng

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (file.name.toLowerCase().endsWith('.epub')) {
          await handleEpubFile(
            reader.result,
            setChapters,
            setError,
            setSuccess,
            setChapterCount,
            setTotalWords,
            setAverageWords,
            setBooks,
            setAuthor
          );
        } else if (file.name.toLowerCase().endsWith('.txt')) {
          handleTxtFile(
            reader.result,
            setChapters,
            setError,
            setSuccess,
            fileInputRef,
            setSelectedFile,
            file,
            setChapterCount,
            setTotalWords,
            setAverageWords,
            setBooks,
            setAuthor
          );
        }
      } catch (err) {
        console.error("Lỗi khi xử lý file:", err);
        setError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    console.log("🚀 Bắt đầu xử lý submit form");
    console.log("📁 File đã chọn:", selectedFile);
    console.log("🔑 Trạng thái đăng nhập:", isLoggedIn);

    if (!selectedFile) {
      console.warn("⚠️ Chưa chọn file");
      alert("📂 Vui lòng chọn tệp trước!");
      return;
    }

    if (isLoggedIn) {
      console.log("👤 Người dùng đã đăng nhập, chuẩn bị tạo truyện mới");
      const defaultStoryInfo = {
        name: `Truyện mới - ${new Date().toLocaleString("vi-VN")}`,
        author: "Không biết",
        storyAvatar: "/default-avatar.jpg",
      };
      console.log("📝 Thông tin truyện mặc định:", defaultStoryInfo);
      setStoryInfo(defaultStoryInfo);
      setShowStoryInfoModal(true);
    } else {
      console.log(
        "👥 Người dùng chưa đăng nhập, chuyển sang chế độ dịch thông thường"
      );
      onFileParsed([], apiKey, model);
    }
  };

  const handleCreateStory = async () => {
    console.log("🚀 Bắt đầu tạo truyện mới");
    console.log("📝 Thông tin truyện:", storyInfo);
    console.log("📁 File:", selectedFile);

    try {
      setIsCreatingStory(true);
      const response = await createStory(selectedFile, storyInfo);
      
      console.log("✅ Tạo truyện thành công:", response);
      setSuccess("✅ Tạo truyện thành công! Đang chuyển hướng...");
      setShowStoryInfoModal(false);

      console.log("⏳ Đợi 2 giây trước khi chuyển trang...");
      setTimeout(() => {
        console.log(
          "🔄 Chuyển hướng đến trang Translate với storyId:",
          response.id
        );
        window.location.href = `/translate?storyId=${response.id}`;
      }, 2000);
    } catch (error) {
      console.error("❌ Lỗi khi tạo truyện mới:", error);
      setError("Có lỗi xảy ra khi tạo truyện mới. Vui lòng thử lại.");
    } finally {
      setIsCreatingStory(false);
      console.log("🏁 Kết thúc quá trình tạo truyện");
    }
  };

  const StoryInfoModal = () => (
    <div className="modal">
      <div className="modal-content">
        <h3>📝 Thông tin truyện</h3>
        <div className="form-group">
          <label>Tên truyện:</label>
          <input
            type="text"
            value={storyInfo.name}
            onChange={(e) => {
              const newValue = e.target.value;
              setStoryInfo(prev => ({
                ...prev,
                name: newValue
              }));
            }}
            placeholder="Nhập tên truyện"
          />
        </div>
        <div className="form-group">
          <label>Tác giả:</label>
          <input
            type="text"
            value={storyInfo.author}
            onChange={(e) => {
              const newValue = e.target.value;
              setStoryInfo(prev => ({
                ...prev,
                author: newValue
              }));
            }}
            placeholder="Nhập tên tác giả"
          />
        </div>
        <div className="modal-buttons">
          <button
            onClick={handleCreateStory}
            disabled={isCreatingStory}
            className="btn-submit"
          >
            {isCreatingStory ? "Đang tạo..." : "Tạo truyện"}
          </button>
          <button
            onClick={() => setShowStoryInfoModal(false)}
            className="btn-cancel"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );

  //hàm kiểm tra xem có đúng định dạng file
  const handleCheckFileFormat = async () => {
    if (!selectedFile) {
      alert("📂 Vui lòng chọn tệp trước.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const result = checkFileFormatFromText(text);

      if (result.valid) {
        alert(`✅ File hợp lệ! Tổng số chương: ${result.total}`);
      } else {
        alert("❌ File không đúng định dạng chương hoặc thiếu nội dung.");
        setSelectedFile(null); // xoá trong state
        setChapters([]); // xoá dữ liệu chương cũ
        fileInputRef.current.value = ""; // xoá nội dung input file
      }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="wrapper">
      <h2>📘 Gemini Converte</h2>
      <ConverteKeyInput 
        apiKey={localApiKey} 
        setApiKey={handleApiKeyChange} 
      />
      <div className="notify">
        <small>
          {apiKey
            ? "🔐 Đã nhập API key - Bạn có thể dịch toàn bộ chương."
            : "🔓 Chế độ miễn phí - Chỉ dịch được 2 chương đầu tiên."}
        </small>
      </div>
      <div className="file-container">
        <input
          ref={fileInputRef}
          className="converte-file"
          type="file"
          accept=".epub, .txt"
          onChange={handleFileChange}
        />
        {/* <button className="btn-check-file" onClick={handleCheckFileFormat}>
          Kiểm tra File
        </button> */}
      </div>
      {loading && <p>⏳ Đang xử lý tệp...</p>}{" "}
      {/* Hiển thị thông báo khi đang tải lên */}
      {error && <p style={{ color: "red" }}>{error}</p>}{" "}
      {/* Hiển thị thông báo thành công */}
      {success && <p style={{ color: "red" }}>{success}</p>}{" "}
      {/* Hướng dẫn định dạng gile */}
      <div className="chapter-guide">
        <div className="chapter-guide-title">
          <h4>📌 Các định dạng chương được hỗ trợ:</h4>
        </div>
        <div className="chapter-guide-content">
          <ul>
            <li>
              <strong>Chương N</strong> - Ví dụ: "Chương 1: Khởi đầu"
            </li>
            <li>
              <strong>chương N</strong> - Ví dụ: "chương 1: Hành trình mới"
            </li>
            <li>
              <strong>Chapter N</strong> - Ví dụ: "Chapter 2 - The Journey"
            </li>
            <li>
              <strong>chapter N</strong> - Ví dụ: "chapter 3: A New Beginning"
            </li>
            <li>
              <strong>第X章 (Hán tự)</strong> - Ví dụ:"第十章 - 新的开始"
            </li>
            <li>
              <strong>第N章 (Số) </strong> - Ví dụ: "第99章 - 终极对决"
            </li>
            <li>
              <strong>Giữa các chương:</strong> Là nội dung các chương
            </li>
          </ul>
        </div>
      </div>
      {/* Hiển thị thông báo khi file dùng được */}
      <div>
        <TranslationInfoPanel
          books={books}
          author={author}
          totalChapters={chapterCount}
          totalWords={totalWords}
          averageWordsPerChapter={averageWords}
          setBooks={setBooks}
          setAuthor={setAuthor}
        />
      </div>
      <div className="tip-model-select">
        <label className="tip-label">🤖 Chọn Mô Hình AI:</label>
        <div className="tip-radio-group">
          {models.map((m) => (
            <label key={m.value} className="tip-radio-option">
              <input
                type="radio"
                name="modelSelect"
                value={m.value}
                checked={selectedModel === m.value}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  if (setModel) setModel(e.target.value);
                }}
              />
              {m.label}
            </label>
          ))}
        </div>

        {selectedModel && (
          <p className="tip-model-description">
            {models.find(m => m.value === selectedModel)?.description}
          </p>
        )}
      </div>
      <div className="converter-btn">
        <button className="btn-submit" onClick={handleSubmit}>
          Hoàn tất
        </button>
      </div>
      {showGuide && (
        <div className="modal">
          <div className="modal-content">
            <h3>🔑 Cách lấy API Key Gemini</h3>
            <ol>
              <li>
                Truy cập:{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  aistudio.google.com/app/apikey
                </a>
              </li>
              <li>Đăng nhập tài khoản Google</li>
              <li>
                Nhấn nút <b>"Create API Key"</b>
              </li>
              <li>Sao chép key và dán vào ô phía trên</li>
            </ol>
            <p>Lưu ý: Tránh tiết lộ key, bảo mật cần thiết!!!</p>
            <button onClick={() => setShowGuide(false)}>Đã hiểu</button>
          </div>
        </div>
      )}
      {showStoryInfoModal && <StoryInfoModal />}
      {isCreatingStory && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Đang tạo truyện mới...</p>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
