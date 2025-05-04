// src/components/ConverteKeyInput.jsx
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "./ConverteKeyInput.css"; // dùng luôn css cũ

const ConverteKeyInput = ({ apiKey, setApiKey }) => {
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["text/plain"];
    if (!allowedTypes.includes(file.type)) {
      alert("❗ Chỉ chấp nhận file .txt");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const keys = content
        .split("\n") // tách thành mảng dòng
        .map((line) => line.trim()) // xóa khoảng trắng mỗi dòng
        .filter((line) => line.length > 0); // loại dòng trống

      if (keys.length > 0) {
        setApiKey(keys);
      } else {
        alert("❗ File không chứa nội dung hợp lệ.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="converte-key">
      <div className="converte-key-wrapper">
        <div className="api-input-wrapper">
          <label className="label">🔑 Nhập Google Gemini API Key </label>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey([e.target.value])}
            placeholder="API Key..."
            className="api-input"
          />
          <FontAwesomeIcon
            icon={showKey ? faEyeSlash : faEye}
            className="show-icon"
            onClick={() => setShowKey((prev) => !prev)}
          />
        </div>

        {/* Upload file */}
        <div className="upload-section">
          <label className="upload-label">
            📂 Hoặc tải lên file chứa API Key (.txt)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="upload-input"
          />
        </div>
      </div>

      {/* Button hướng dẫn */}
      <button className="guide-button" onClick={() => setShowGuide(true)}>
        ❓ Hướng dẫn lấy API key
      </button>

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
              <li>
                Sao chép key và lưu vào file .txt để tải lên hoặc dán vào ô nhập
              </li>
            </ol>
            <p>Lưu ý: Tránh tiết lộ key, bảo mật cần thiết!!!</p>
            <button
              className="close-button"
              onClick={() => setShowGuide(false)}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConverteKeyInput;
