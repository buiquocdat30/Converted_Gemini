// src/components/ConverteKeyInput.jsx
import React, { useState, useEffect, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../../context/ConverteContext";
import "./ConverteKeyInput.css"; // dùng luôn css cũ

const ConverteKeyInput = ({
  apiKey,
  setApiKey,
  onKeysSelected,
  onCurrentKey,
}) => {
  const {
    isLoggedIn,
    onLogout,
    userData,
    menu,
    setMenu,
    loading,
    userApiKey,
    fetchApiKey,
  } = useContext(AuthContext);
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [showKeyList, setShowKeyList] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchApiKey();
    }
  }, [isLoggedIn]);

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
        setApiKey(keys[0]); // Lấy key đầu tiên
      } else {
        alert("❗ File không chứa nội dung hợp lệ.");
      }
    };

    reader.readAsText(file);
  };

  const handleKeySelect = (key) => {
    setApiKey(key);
    setSelectedKeys([key]);
  };

  const handleSelectAll = () => {
    if (selectedKeys.length === userApiKey.length) {
      // Nếu đã chọn tất cả thì bỏ chọn
      setSelectedKeys([]);
      setApiKey("");
      if (onKeysSelected) onKeysSelected([]);
    } else {
      // Nếu chưa chọn tất cả thì chọn tất cả các key
      const allKeys = userApiKey.map((key) => key.key);
      setSelectedKeys(allKeys);
      // Gọi callback với tất cả các key đã chọn
      if (onKeysSelected) onKeysSelected(allKeys);
      // Vẫn giữ key đầu tiên làm key đang sử dụng
      setApiKey(allKeys[0]);
    }
  };

  const handleApplySelectedKeys = () => {
    if (selectedKeys.length > 0) {
      // Nếu có nhiều key được chọn, gọi callback với tất cả các key
      if (onKeysSelected) onKeysSelected(selectedKeys);
      console.log("Đây là các key đã được chọn selectedKeys", selectedKeys);
      // Vẫn giữ key đầu tiên làm key đang sử dụng
      const currentKey = selectedKeys[0];
      setApiKey(currentKey);
      // Gọi onCurrentKey với key hiện tại
      if (onCurrentKey) onCurrentKey(currentKey);
    }
    setShowKeyList(false);
  };

  return (
    <div className="converte-key">
      <div className="converte-key-wrapper">
        <div className="api-input-wrapper">
          <label className="label">🔑 Nhập Google Gemini API Key </label>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey || ""}
            onChange={(e) => setApiKey(e.target.value)}
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

        {/* Nút xem danh sách key */}
        {isLoggedIn && userApiKey && userApiKey.length > 0 && (
          <button
            className="view-keys-btn"
            onClick={() => setShowKeyList(!showKeyList)}
          >
            {showKeyList ? "Ẩn danh sách key" : "Xem danh sách key"}
          </button>
        )}
      </div>

      {/* Hiển thị danh sách key của user */}
      {isLoggedIn && userApiKey && userApiKey.length > 0 && showKeyList && (
        <div className="modal">
          <div className="modal-content key-list-modal">
          <button 
              className="modal-close-button"
              onClick={() => setShowKeyList(false)}
            >
              ✕
            </button>
            <h3>Danh sách API Key</h3>
            <div className="key-list">
              {userApiKey.map((key) => (
                <div
                  key={key.id}
                  className={`key-item ${
                    selectedKeys.includes(key.key) ? "selected" : ""
                  }`}
                  onClick={() => {
                    if (selectedKeys.includes(key.key)) {
                      const newSelectedKeys = selectedKeys.filter(
                        (k) => k !== key.key
                      );
                      setSelectedKeys(newSelectedKeys);
                    } else {
                      const newSelectedKeys = [...selectedKeys, key.key];
                      setSelectedKeys(newSelectedKeys);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key.key)}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        const newSelectedKeys = [...selectedKeys, key.key];
                        setSelectedKeys(newSelectedKeys);
                      } else {
                        const newSelectedKeys = selectedKeys.filter(
                          (k) => k !== key.key
                        );
                        setSelectedKeys(newSelectedKeys);
                      }
                    }}
                  />

                  <div className="key-info">
                    <span className="key-label">
                      {key.label || "Không có nhãn"}
                    </span>
                    <span className="key-preview">
                      {key.key.substring(0, 33)}...
                    </span>
                    <span className="key-status">
                      {key.models && key.models.length > 0 ? (
                        key.models.some(model => model.status === "ACTIVE") ? (
                          "🟢 Hoạt động"
                        ) : key.models.some(model => model.status === "COOLDOWN") ? (
                          "🟡 Đang nghỉ"
                        ) : (
                          "🔴 Đã hết hạn"
                        )
                      ) : (
                        "⚪ Chưa xác định"
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="key-actions">
              <button className="select-all-key-btn" onClick={handleSelectAll}>
                {selectedKeys.length === userApiKey.length
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>
              <button
                className="apply-selected-keys-btn"
                onClick={handleApplySelectedKeys}
              >
                Áp dụng key đã chọn
              </button>
              <button
                className="close-button"
                onClick={() => setShowKeyList(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
