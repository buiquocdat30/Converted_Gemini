import React, { useState, useRef, useContext, useEffect } from "react";
// import "../css/App.css";
import "./UploadForm.css";
import StoryInfoModal from "../StoryInfoModal/StoryInfoModal.jsx";
import ConverteKeyInput from "../ConverteKeyInput/ConverteKeyInput.jsx";
import { AuthContext } from "../../context/ConverteContext";
import { useSession } from "../../context/SessionContext";
import TranslationInfoPanel from "../TranslationInfoPanel/TranslationInfoPanel.jsx";
import ModelSelector from "../ModelSelector/ModelSelector.jsx";
import axios from "axios";
import { modelService } from '../../services/modelService';

import {
  handleEpubFile,
  handleTxtFile,
  checkFileFormatFromText,
} from "../../utils/fileHandlers.js";

const UploadForm = ({ onFileParsed, isDarkMode }) => {
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

  const {
    selectedKeys,
    currentKey,
    selectedModel: sessionSelectedModel,
    updateSelectedKeys,
    updateCurrentKey,
    updateSelectedModel,
  } = useSession();

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

  // Sử dụng model từ session nếu có, nếu không thì dùng từ context
  const [selectedModel, setSelectedModel] = useState(sessionSelectedModel || model || "gemini-2.0-flash");

  // Sử dụng key từ session nếu có, nếu không thì dùng từ context
  const [localApiKey, setLocalApiKey] = useState(currentKey || apiKey || "");

  // Sử dụng selectedKeys từ session
  const [selectedApiKeys, setSelectedApiKeys] = useState(selectedKeys || []);

  const fileInputRef = useRef(null);

  // Đồng bộ session state với local state
  useEffect(() => {
    if (sessionSelectedModel && sessionSelectedModel !== selectedModel) {
      setSelectedModel(sessionSelectedModel);
    }
  }, [sessionSelectedModel, selectedModel]);

  useEffect(() => {
    if (currentKey && currentKey !== localApiKey) {
      setLocalApiKey(currentKey);
    }
  }, [currentKey, localApiKey]);

  useEffect(() => {
    if (selectedKeys && selectedKeys.length !== selectedApiKeys.length) {
      setSelectedApiKeys(selectedKeys);
    }
  }, [selectedKeys, selectedApiKeys]);

  // Thêm hàm xử lý khi file được chọn
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra định dạng file
    const allowedTypes = ["application/epub+zip", "text/plain"];
    const allowedExtensions = [".epub", ".txt"];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert("❗ Chỉ chấp nhận file .epub hoặc .txt");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      setChapters([]);
      setError("");
      setSuccess("");
      return;
    }

    setSelectedFile(file);
    setBooks(file.name.replace(/\.[^/.]+$/, "")); // Lấy tên file không có phần mở rộng
    
    // Reset các state trước khi xử lý file mới
    setChapters([]);
    setError("");
    setSuccess("");
    setChapterCount(0);
    setTotalWords(0);
    setAverageWords(0);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub")) {
          // Xử lý EPUB trực tiếp để tránh lỗi URI malformed
          const epub = await import("epubjs");
          const book = epub.default(file);
          await book.ready;
          
          let fullText = "";
          const spineItems = book.spine.spineItems;
          
          for (const item of spineItems) {
            try {
              const section = await book.load(item.url);
              const contents = section.querySelector("body");
              if (contents) {
                fullText += contents.innerText + "\n\n";
              }
              await item.unload();
            } catch (itemError) {
              console.warn(`⚠️ Lỗi khi xử lý item ${item.url}:`, itemError);
              continue;
            }
          }
          
          const result = checkFileFormatFromText(fullText);
          if (result.valid) {
            setChapters(result.chapters);
            setChapterCount(result.chapters.length);
            
            const total = result.chapters.reduce(
              (sum, chapter) => sum + chapter.content.split(/\s+/).filter(Boolean).length,
              0
            );
            setTotalWords(total);
            setAverageWords(result.chapters.length > 0 ? Math.round(total / result.chapters.length) : 0);
            
            setSuccess("✅ File EPUB đã được xử lý thành công.");
          } else {
            throw new Error("Không tìm thấy chương nào hợp lệ trong file EPUB.");
          }
        } else if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
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
            setAverageWords
          );
        } else {
          throw new Error("Định dạng file không được hỗ trợ. Chỉ chấp nhận file .epub hoặc .txt");
        }
      } catch (err) {
        console.error("Lỗi khi xử lý file:", err);
        setError(err.message);
      }
    };
    
    // Sử dụng readAsArrayBuffer cho EPUB, readAsText cho TXT
    if (file.type === "application/epub+zip" || file.name.toLowerCase().endsWith(".epub")) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Cập nhật hàm handleSubmit để sử dụng tất cả các key đã chọn
  const handleSubmit = async () => {
    console.log("🚀 Bắt đầu xử lý submit form");
    console.log("📁 File đã chọn:", selectedFile);
    console.log("🔑 Trạng thái đăng nhập:", isLoggedIn);
    console.log("🔑 Danh sách key đã chọn:", selectedApiKeys);

    if (!selectedFile) {
      console.warn("⚠️ Chưa chọn file");
      alert("📂 Vui lòng chọn tệp trước!");
      return;
    }

    if (isLoggedIn) {
      console.log("👤 Người dùng đã đăng nhập, chuẩn bị tạo truyện mới");
      // Lấy giá trị từ TranslationInfoPanel (books/author) làm mặc định cho modal
      const defaultStoryInfo = {
        name: (books && books.trim()) ? books.trim() : `Truyện mới - ${new Date().toLocaleString("vi-VN")}`,
        author: (author && author.trim()) ? author.trim() : "Không biết",
        storyAvatar: "/default-avatar.jpg",
      };
      console.log("📝 Thông tin truyện mặc định:", defaultStoryInfo);
      setStoryInfo(defaultStoryInfo);
      setShowStoryInfoModal(true);
    } else {
      console.log(
        "👥 Người dùng chưa đăng nhập, chuyển sang chế độ dịch thông thường"
      );
      // Truyền danh sách key đã chọn vào hàm onFileParsed
      onFileParsed([], selectedApiKeys, selectedModel);
    }
  };

  const handleCreateStory = async () => {
    console.log("📝 Thông tin truyện:", storyInfo);
    console.log("📁 Thông tin File:", selectedFile);
    console.log("🔑 Danh sách key đã chọn:", selectedApiKeys);

    try {
      setIsCreatingStory(true);
      console.log("📁 Thông tin File:", selectedFile);
      const response = await createStory(
        selectedFile,
        storyInfo,
        selectedApiKeys
      );

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

  // Thêm hàm xử lý khi apiKey thay đổi
  const handleApiKeyChange = (newKey) => {
    setLocalApiKey(newKey);
    updateCurrentKey(newKey);
    if (setApiKey) {
      setApiKey(newKey);
    }
  };

  // Hàm xử lý khi có key được chọn
  const handleKeysSelected = (keys) => {
    setSelectedApiKeys(keys);
    updateSelectedKeys(keys);
    // Nếu có key đầu tiên, sử dụng nó làm key hiện tại
    if (keys.length > 0) {
      const firstKey = keys[0];
      setLocalApiKey(firstKey);
      updateCurrentKey(firstKey);
      if (setApiKey) setApiKey(firstKey);
    }
  };

  // Hàm xử lý khi model thay đổi
  const handleModelChange = (newModel) => {
    setSelectedModel(newModel);
    updateSelectedModel(newModel);
    if (setModel) setModel(newModel);
  };

  return (
    <div className={`wrapper ${isDarkMode ? "dark" : ""}`}>
      <h2>📘 Gemini Converte</h2>
      <ConverteKeyInput
        apiKey={localApiKey}
        setApiKey={handleApiKeyChange}
        onKeysSelected={handleKeysSelected}
        onCurrentKey={updateCurrentKey}
      />
      <div className="notify">
        <small>
          {localApiKey
            ? "🔐 Đã nhập API key - Bạn có thể dịch toàn bộ chương."
            : "🔓 Chế độ miễn phí - Chỉ dịch được 2 chương đầu tiên."}
        </small>
      </div>
      <h3>Nhập file và tải truyện cần dịch:</h3>
      <div className="file-container">
        <input
          ref={fileInputRef}
          className="converte-file"
          type="file"
          accept=".epub, .txt"
          onChange={handleFileChange}
        />
      </div>
      {loading && <p>⏳ Đang xử lý tệp...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "red" }}>{success}</p>}
      
      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        isDarkMode={isDarkMode}
      />

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
      {showStoryInfoModal && (
        <StoryInfoModal
          storyInfo={storyInfo}
          setStoryInfo={setStoryInfo}
          handleCreateStory={handleCreateStory}
          isCreatingStory={isCreatingStory}
          setShowStoryInfoModal={setShowStoryInfoModal}
        />
      )}
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
