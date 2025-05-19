import React, { useState, useRef, useContext } from "react";
// import "../css/App.css";
import "./UploadForm.css";
import ConverteKeyInput from "../ConverteKeyInput/ConverteKeyInput.jsx";
import { AuthContext } from "../../context/ConverteContext"; 
import TranslationInfoPanel from "../TranslationInfoPanel/TranslationInfoPanel.jsx";

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
  const { isLoggedIn, username,setUsername, onLogin, onLogout, setMenu, menu} = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [apiKey, setApiKey] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false); // Thêm trạng thái loading
  const [error, setError] = useState(""); // Thêm trạng thái error
  const [success, setSuccess] = useState(""); //thêm trạng thái thành công

  //khu vực panel review file
  const [books, setBooks] = useState(""); //tên truyện
  const [author, setAuthor] = useState(""); //tên tác giả
  const [chapterCount, setChapterCount] = useState(0); //tổng chương
  const [totalWords, setTotalWords] = useState(0); //tổng từ
  const [averageWords, setAverageWords] = useState(0); //trung bình từ
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");

  //selected model
  const selected = models.find((m) => m.value === selectedModel);

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    console.log("đây là file.name: ", file);
    setBooks(file.name.replace(/\.[^/.]+$/, ""));
    const allowedTypes = ["application/epub+zip", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("❗ Chỉ chấp nhận file .epub hoặc .txt");
      return;
    }

    setSelectedFile(file);
    setLoading(true);
    setError("");
    setChapters([]);

    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;

      if (file.type === "application/epub+zip") {
        await handleEpubFile(
          result,
          (chapters) => {
            // Format dữ liệu chapters
            const formattedChapters = chapters.map((chapter, index) => ({
              chapterName: chapter.title || `Chương ${index + 1}`,
              rawText: chapter.content,
              translated: "",
              chapterNumber: index + 1
            }));
            setChapters(formattedChapters);
          },
          setError,
          setSuccess,
          setChapterCount,
          setTotalWords,
          setAverageWords,
          setBooks,
          setAuthor
        );
      } else {
        handleTxtFile(
          result,
          (chapters) => {
            // Format dữ liệu chapters
            const formattedChapters = chapters.map((chapter, index) => ({
              chapterName: chapter.title || `Chương ${index + 1}`,
              rawText: chapter.content,
              translated: "",
              chapterNumber: index + 1
            }));
            setChapters(formattedChapters);
          },
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

      setLoading(false);
    };

    if (file.type === "application/epub+zip") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      alert("📂 Vui lòng chọn tệp trước!");
      return;
    }

    if (!chapters || chapters.length === 0) {
      alert("⏳ File đang xử lý hoặc chưa có nội dung chương.");
      return;
    }

    onFileParsed(chapters, apiKey, selectedModel);
    console.log("onFileParsed/ chapters:", chapters);
  };

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
      <ConverteKeyInput apiKey={apiKey} setApiKey={setApiKey} />
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
          onChange={handleFileUpload}
        />
        {/* <button className="btn-check-file" onClick={handleCheckFileFormat}>
          Kiểm tra File
        </button> */}
      </div>
      {loading && <p>⏳ Đang xử lý tệp...</p>}{" "}
      {/* Hiển thị thông báo khi đang tải lên */}
      {error && <p style={{ color: "red" }}>{error}</p>}{" "}
      {/* Hiển thị thông báo lỗi nếu có */}
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
          {models.map((model) => (
            <label key={model.value} className="tip-radio-option">
              <input
                type="radio"
                name="modelSelect"
                value={model.value}
                checked={selectedModel === model.value}
                onChange={(e) => setSelectedModel(e.target.value)}
              />
              {model.label}
            </label>
          ))}
        </div>

        {selected && (
          <p className="tip-model-description">{selected.description}</p>
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
    </div>
  );
};

export default UploadForm;
