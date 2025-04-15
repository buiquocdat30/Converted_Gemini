// src/components/ConverteKeyInput.jsx
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "../css/App.css"; // dùng luôn css cũ

const ConverteKeyInput = ({ apiKey, setApiKey }) => {
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  

  return (
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

export default ConverteKeyInput;
