import React from "react";
import axios from "axios"; 

import { useState } from "react";
import TranslatorApp from "./components/TranslatorApp";
// import ChapterList from "./ChapterList";
// import TranslationViewer from "./TranslationViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

import "../src/css/App.css";

function App() {
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [translatedFree, setTranslatedFree] = useState(false);
  const [translatedChapters, setTranslatedChapters] = useState([]);
  const [showTranslator, setShowTranslator] = useState(false);

  //UploadFile
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
  
    const allowedTypes = ["application/epub+zip", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ chấp nhận file .epub hoặc .txt");
      return;
    }
  
    setSelectedFile(file);
  
    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = reader.result; // Đọc nội dung file
  
      try {
        const res = await fetch("http://localhost:8000/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: fileContent, // Gửi nội dung file ở đây
          }),
        });
        const textResponse = await res.text();  // Chờ server trả về dữ liệu thô
        console.log(textResponse);  // In ra phản hồi từ server
  
        const data = await res.json();
        setChapters(data.chapters);
      } catch (err) {
        console.error("❌ Lỗi khi upload file:", err);
      }
    };
  
    reader.readAsText(file); // đọc file dưới dạng text, nếu là epub binary sẽ cần xử lý thêm
  };
  
  

  //converte
  const handleTranslate = async () => {
    if (!chapters || chapters.length === 0) {
      alert("📂 Vui lòng upload file trước!");
      return;
    }
  
    if (!apiKey && translatedFree) {
      alert("🚫 Chế độ miễn phí chỉ cho phép dịch 2 chương!");
      return;
    }
  
    try {
      const res = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapters: apiKey ? chapters : chapters.slice(0, 2),
          key: apiKey || null,
        }),
      });
  
      const data = await res.json();
      setTranslatedChapters(data.chapters);
      if (!apiKey) setTranslatedFree(true);
      setShowTranslator(true);
    } catch (err) {
      console.error("❌ Lỗi khi gửi file dịch:", err);
    }
  };
  

  return (
    <div className="wrapper">
      <h2>📘 Gemini Converte</h2>

      <div className="converte-key">
        <label>🔑 Nhập Google Gemini API Key </label>
        <div className="api-input-wrapper">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key..."
          />
          <FontAwesomeIcon
            icon={showApiKey ? faEyeSlash : faEye}
            className="show-icon"
            onClick={() => setShowApiKey((prev) => !prev)}
          />
        </div>
        <button onClick={() => setShowGuide(true)}>
          ❓ Hướng dẫn lấy API key
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <small>
          {apiKey
            ? "🔐 Đã nhập API key - Bạn có thể dịch toàn bộ chương."
            : "🔓 Chế độ miễn phí - Chỉ dịch được 2 chương đầu tiên."}
        </small>
      </div>
      {showTranslator && chapters.length > 0 ? (
        <TranslatorApp chapters={chapters} apiKey={apiKey} />
      ) : (
        <>
          <input
            className="converte-file"
            type="file"
            accept=".epub, .txt"
            onChange={handleFileUpload}
          />
          <div className="converte">
            <button className="btn-submit" onClick={handleTranslate}>
              Dịch{" "}
            </button>
          </div>
        </>
      )}

      {translatedChapters.length > 0 && (
        <TranslatorApp chapters={translatedChapters} apiKey={apiKey} />
      )}

      {/* Modal hướng dẫn */}
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
}

export default App;
