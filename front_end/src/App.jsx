import React from "react";

import { useState } from "react";
import UploadFile from "./components/UploadFile";
import ChapterList from "./components/ChapterList";
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


  //UploadFile
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
  
    // Kiểm tra loại file
    const allowedTypes = ['application/epub+zip', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ chấp nhận file .epub hoặc .txt");
      return;
    }
  
    setSelectedFile(file);
  
    const formData = new FormData();
    formData.append("file", file); // đổi key thành "file" nếu backend dùng chung
  
    console.log("formData", formData);
  
    const res = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });
  
    const data = await res.json();
  
    // Backend nên trả về cùng cấu trúc cho cả txt và epub
    setChapters(data.chapters);
  };
  

  //converte
  const handleTranslate = async () => {
    if (!selectedFile) {
      alert("📂 Vui lòng chọn file EPUB trước!");
      return;
    }
  
    // Nếu không có API Key và đã dùng lượt free rồi => chặn không cho dịch tiếp
    if (!apiKey && translatedFree) {
      alert("🚫 Chế độ miễn phí chỉ cho phép dịch 2 chương!");
      return;
    }
  
    const formData = new FormData();
    formData.append("epub", selectedFile);
  
    // Nếu có API Key thì gửi để dịch full
    if (apiKey) {
      formData.append("apiKey", apiKey);
    } else {
      // Không có API Key => chỉ dịch 2 chương
      formData.append("limitChapters", "2");
    }
  
    console.log('formData',formData)
    try {
      const res = await fetch("http://localhost:3000/api/translate", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      console.log("📦 Kết quả từ dịch:", data);
  
      // Nếu đang dùng miễn phí thì sau lần này khóa luôn
      if (!apiKey) {
        setTranslatedFree(true);
      }
  
      // Optional: set lại kết quả lên UI nếu cần
      // setChapters(data.chapters); 
    } catch (err) {
      console.error("❌ Lỗi khi gửi file dịch:", err);
    }
  };
  
  
  return (
    <div className="wrapper">
      <h2>📘 Gemini Converte</h2>

      <div className="converte-key">
        <label>🔑 Nhập Google Gemini API Key (nếu có): </label>
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

      <input
        className="converte-file"
        type="file"
        accept=".epub, .txt"
        onChange={handleFileUpload}
      />
      <div className="converte">
        <button className="btn-submit" onClick={handleTranslate}>Dịch </button>
      </div>

      {chapters.length > 0 && (
        <ChapterList chapters={chapters} apiKey={apiKey} />
      )}

      {/* Modal hướng dẫn */}
      {showGuide && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 10,
              maxWidth: 500,
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
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
            <p>
              Lưu ý: Tránh tiết lộ key, bảo mật cần thiết!!!
            </p>
            <button
              onClick={() => setShowGuide(false)}
              style={{
                marginTop: 10,
                padding: "6px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
              }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
