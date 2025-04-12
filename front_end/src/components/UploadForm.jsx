import React, { useState } from "react";
import "../css/App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const UploadForm = ({ onFileParsed }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [chapters, setChapters] = useState([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const allowedTypes = ["application/epub+zip", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("❗ Chỉ chấp nhận file .epub hoặc .txt");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();

    reader.onload = async () => {
      let fileContent;

      if (file.type === "application/epub+zip") {
        fileContent = reader.result.split(",")[1]; // base64
      } else {
        fileContent = reader.result;
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
      reader.readAsDataURL(file);
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

    onFileParsed(chapters, apiKey);
  };

  return (
    <div className="wrapper">
      <h2>📘 Gemini Converte</h2>

      <div className="converte-key">
        <label>🔑 Nhập Google Gemini API Key </label>
        <div className="api-input-wrapper">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key..."
          />
          <FontAwesomeIcon
            icon={showKey ? faEyeSlash : faEye}
            className="show-icon"
            onClick={() => setShowKey((prev) => !prev)}
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
