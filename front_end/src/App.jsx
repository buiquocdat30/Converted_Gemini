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
      let fileContent;

      // Nếu là EPUB thì lấy phần base64 sau "data:application/epub+zip;base64,"
      if (file.type === "application/epub+zip") {
        fileContent = reader.result.split(",")[1]; // base64
      } else {
        fileContent = reader.result; // plain text
      }

      try {
        const res = await fetch("http://localhost:8000/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: fileContent,
          }),
        });

        const contentType = res.headers.get("content-type");

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }

        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          console.log("✅ Server response:", data);
          if (Array.isArray(data.chapters)) {
            console.log("✅ Số chương:", data.chapters.length);
            setChapters(data.chapters);
          } else {
            console.warn("⚠️ Server không trả về chapters!");
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi upload file:", err);
      }
    };

    if (file.type === "application/epub+zip") {
      reader.readAsDataURL(file); // đọc dạng base64
    } else {
      reader.readAsText(file); // đọc dạng text
    }
  };

  //converte
  const handleTranslate = async () => {
    console.log("📘 Chapters hiện tại:", chapters);

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
      if (data && Array.isArray(data.chapters)) {
        setTranslatedChapters(data.chapters);
      } else {
        console.error("❌ Server không trả về danh sách chương hợp lệ:", data);
      }

      if (!apiKey) {
        setTranslatedFree(true);
      } else {
        setShowTranslator(true);
      }
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
