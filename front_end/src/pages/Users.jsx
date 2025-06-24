import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  memo,
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeLowVision } from "@fortawesome/free-solid-svg-icons";
import UserStoryCard from "../components/UserStoryCard/UserStoryCard";
import "./pageCSS/Users.css"; // Hãy đảm bảo bạn tạo file này và viết CSS cho nó
import { toast } from "react-hot-toast";
import UserModelModals from '../components/UserModelModals/UserModelModals';

// Placeholder components cho nội dung bên phải
// Bạn có thể tách chúng ra thành các file riêng nếu cần
const ProfileSettings = () => {
  const {
    userData,
    loading,
    error,
    updateUserProfile,
    updateAvatar,
    updateBackground,
  } = useContext(AuthContext);

  const [username, setUsername] = useState(userData.username || "");
  const [avatar, setAvatar] = useState(
    `http://localhost:8000/data/upload/avatar/${userData.avatar}`
  );
  const defaultAvatar = "https://www.w3schools.com/howto/img_avatar.png";

  // Hàm chuyển đổi từ DateTime sang dd/mm/yyyy
  const formatDateToDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Hàm chuyển đổi từ dd/mm/yyyy sang DateTime
  const formatDateToDateTime = (dateString) => {
    if (!dateString) return "";
    const [day, month, year] = dateString.split("/");
    return new Date(year, month - 1, day).toISOString();
  };

  const [dob, setDob] = useState(formatDateToDisplay(userData.birthdate) || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hàm xử lý khi người dùng nhập ngày tháng
  const handleDobChange = (e) => {
    let value = e.target.value;

    // Chỉ cho phép nhập số và dấu /
    value = value.replace(/[^\d/]/g, "");

    // Tự động thêm dấu / sau khi nhập đủ 2 số cho ngày hoặc tháng
    if (value.length === 2 && !value.includes("/")) {
      value = value + "/";
    } else if (value.length === 5 && value.split("/").length === 2) {
      value = value + "/";
    }

    // Giới hạn độ dài tối đa là 10 ký tự (dd/mm/yyyy)
    if (value.length <= 10) {
      setDob(value);
    }
  };

  // Hàm kiểm tra định dạng ngày tháng
  const isValidDateFormat = (dateStr) => {
    if (!dateStr) return true;
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    return regex.test(dateStr);
  };

  useEffect(() => {
    setUsername(userData.username || "");
    setDob(formatDateToDisplay(userData.birthdate) || "");
    setAvatar(`http://localhost:8000/data/upload/avatar/${userData.avatar}`);
  }, [userData]);

  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const formData = new FormData();
        formData.append("image", e.target.files[0]);
        await updateAvatar(formData);
        setMessage("Cập nhật avatar thành công!");
      } catch (error) {
        setMessage(
          "Lỗi khi upload avatar: " +
            (error.response?.data?.error || error.message)
        );
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    // Kiểm tra định dạng ngày tháng trước khi gửi
    if (dob && !isValidDateFormat(dob)) {
      setMessage(
        "Định dạng ngày tháng không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy"
      );
      return;
    }

    try {
      await updateUserProfile({
        username,
        birthdate: formatDateToDateTime(dob),
      });
      setMessage("Cập nhật thông tin thành công!");
    } catch (error) {
      setMessage(
        "Lỗi khi cập nhật thông tin: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setMessage("Mật khẩu mới không khớp!");
      return;
    }

    if (!newPassword) {
      setMessage("Vui lòng nhập mật khẩu mới!");
      return;
    }

    try {
      await updateUserProfile({
        newPassword,
      });
      setMessage("Đổi mật khẩu thành công!");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setMessage(
        "Lỗi khi đổi mật khẩu: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div className="profile-settings">
      <h2>Trang Cá Nhân</h2>
      {message && <div className="message">{message}</div>}

      <form onSubmit={handleProfileUpdate} className="profile-form">
        <div className="form-group avatar-group">
          <label htmlFor="avatar-upload">Ảnh đại diện:</label>
          <img
            src={avatar || defaultAvatar}
            alt="User Avatar"
            className="current-avatar"
          />
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={loading}
          />
          <small>Nhấp vào ảnh để thay đổi hoặc chọn file mới.</small>
        </div>

        <div className="form-group">
          <label htmlFor="username">Thay đổi tên người dùng</label>
          <input
            type="text"
            id="username"
            value={username}
            placeholder="Nhập tên người dùng muốn thay đổi..."
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dob">Cập nhật ngày sinh</label>
          <input
            type="text"
            id="dob"
            value={dob}
            onChange={handleDobChange}
            placeholder="dd/mm/yyyy"
            disabled={loading}
          />
          <small>Nhập theo định dạng: dd/mm/yyyy (ví dụ: 31/12/1995)</small>
        </div>

        <button className="use-btn" type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Lưu thay đổi"}
        </button>
      </form>

      <hr />

      <h3>Đổi Mật Khẩu</h3>
      <form onSubmit={handleChangePassword} className="password-form">
        <div className="form-group">
          <label htmlFor="new-password">Mật khẩu mới:</label>
          <div className="password-input-container">
            <input
              type={showNewPassword ? "text" : "password"}
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />
            <FontAwesomeIcon
              className="show-icon"
              icon={showNewPassword ? faEyeLowVision : faEye}
              onClick={() => setShowNewPassword((prev) => !prev)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="confirm-new-password">Xác nhận mật khẩu mới:</label>
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirm-new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              disabled={loading}
            />
            <FontAwesomeIcon
              className="show-icon"
              icon={showConfirmPassword ? faEyeLowVision : faEye}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            />
          </div>
        </div>
        <button className="use-btn" type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
};

const TranslatedStories = () => {
  const {
    stories,
    loading,
    error,
    fetchStories,
    editStories,
    hideStories,
    deleteStories,
  } = useContext(AuthContext);
  const [storiesList, setStoriesList] = useState([]);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (stories) {
      // Lọc các truyện đã dịch xong (isComplete == true)
      const translatedStories = stories.filter((story) => story.isComplete);
      setStoriesList(translatedStories);
    }
  }, [stories]);

  //xoá mềm
  const handleHideStory = async (storyId) => {
    await hideStories(storyId);
    // Cập nhật state local sau khi ẩn thành công
    setStoriesList((prevStories) =>
      prevStories.filter((story) => story.id !== storyId)
    );
  };

  //xoá cứng dùng trong thùng rác
  const handleDeleteStory = async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStories(storyId);
      // Cập nhật state local sau khi xóa thành công
      setStoriesList((prevStories) =>
        prevStories.filter((story) => story.id !== storyId)
      );
    }
  };

  const handleUpdateStory = (storyId, field, value) => {
    editStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    setStoriesList((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
      )
    );
  };

  if (loading) return <div>Đang tải danh sách truyện...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="translated-stories">
      <h2>Truyện Đã Dịch</h2>
      {storiesList.length === 0 ? (
        <p>Chưa có truyện nào trong thư viện</p>
      ) : (
        <div className="stories-grid">
          {storiesList.map((story) => (
            <UserStoryCard
              key={story.id}
              story={story}
              onHide={() => handleHideStory(story.id)}
              onDelete={() => handleDeleteStory(story.id)}
              onUpdate={handleUpdateStory}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TranslatingStories = () => {
  const {
    stories,
    loading,
    error,
    fetchStories,
    editStories,
    hideStories,
    deleteStories,
  } = useContext(AuthContext);
  const [storiesList, setStoriesList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (stories) {
      // Lọc các truyện đang dịch (isComplete == false)
      const translatingStories = stories.filter((story) => !story.isComplete);
      setStoriesList(translatingStories);
    }
  }, [stories]);

  //xoá mềm
  const handleHideStory = async (storyId) => {
    await hideStories(storyId);
    // Cập nhật state local sau khi ẩn thành công
    setStoriesList((prevStories) =>
      prevStories.filter((story) => story.id !== storyId)
    );
  };

  //xoá cứng dùng trong thùng rác
  const handleDeleteStory = async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStories(storyId);
      // Cập nhật state local sau khi xóa thành công
      setStoriesList((prevStories) =>
        prevStories.filter((story) => story.id !== storyId)
      );
    }
  };

  const handleUpdateStory = (storyId, field, value) => {
    editStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    setStoriesList((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
      )
    );
  };

  const handleStoryClick = (storyId) => {
    // Chuyển hướng đến trang Translate với storyId và tab translating
    navigate(`/translate?storyId=${storyId}&tab=translating`);
  };

  if (loading) return <div>Đang tải danh sách truyện...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="translating-stories">
      <h2>Truyện Đang Dịch</h2>
      {storiesList.length === 0 ? (
        <p>Chưa có truyện nào đang dịch</p>
      ) : (
        <div className="stories-grid">
          {storiesList.map((story) => (
            <div key={story.id} onClick={() => handleStoryClick(story.id)}>
              <UserStoryCard
                story={story}
                onHide={() => handleHideStory(story.id)}
                onDelete={() => handleDeleteStory(story.id)}
                onUpdate={handleUpdateStory}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddKeyModal = memo(({ isOpen, onClose, inputRef }) => {
  const { addApiKey, fetchApiKey } = useContext(AuthContext);
  const modalRef = useRef(null);
  const [newKey, setNewKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("google");
  const [activeTab, setActiveTab] = useState("single"); // 'single' hoặc 'file'
  const [fileContent, setFileContent] = useState("");
  const [fileError, setFileError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (activeTab === "single") {
        if (!newKey.trim()) {
          toast.error("Vui lòng nhập API Key!");
          return;
        }

        try {
          await addApiKey({
            key: newKey,
            label: keyLabel || "Key Gemini mới",
            provider: selectedProvider,
          });
          toast.success("Thêm key thành công!");
          setNewKey("");
          setKeyLabel("");
          onClose();
          fetchApiKey();
        } catch (error) {
          toast.error(
            "Lỗi khi thêm key: " +
              (error.response?.data?.error || error.message)
          );
        }
      } else {
        // Xử lý thêm nhiều key từ file
        if (!fileContent.trim()) {
          toast.error("Vui lòng chọn file chứa API Key!");
          return;
        }

        const keys = fileContent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (keys.length === 0) {
          toast.error("File không chứa key hợp lệ!");
          return;
        }

        try {
          // Thêm từng key một
          for (const key of keys) {
            await addApiKey({
              key: key,
              label: `Key từ file ${new Date().toLocaleDateString()}`,
              provider: selectedProvider,
            });
          }
          toast.success(`Đã thêm ${keys.length} key thành công!`);
          setFileContent("");
          onClose();
          fetchApiKey();
        } catch (error) {
          toast.error(
            "Lỗi khi thêm key từ file: " +
              (error.response?.data?.error || error.message)
          );
        }
      }
    },
    [
      newKey,
      keyLabel,
      selectedProvider,
      activeTab,
      fileContent,
      onClose,
      fetchApiKey,
    ]
  );

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["text/plain"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Chỉ chấp nhận file .txt");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setFileContent(content);
      setFileError("");
    };
    reader.onerror = () => {
      setFileError("Lỗi khi đọc file");
    };
    reader.readAsText(file);
  };

  const handleKeyChange = useCallback((e) => {
    setNewKey(e.target.value);
  }, []);

  const handleLabelChange = useCallback((e) => {
    setKeyLabel(e.target.value);
  }, []);

  const handleProviderChange = useCallback((e) => {
    setSelectedProvider(e.target.value);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="key-modal-overlay">
      <div className="key-modal-content" ref={modalRef}>
        <form onSubmit={handleSubmit}>
          <h3>Thêm API Key Mới</h3>

          <div className="key-modal-tabs">
            <button
              type="button"
              className={`key-tab ${activeTab === "single" ? "active" : ""}`}
              onClick={() => setActiveTab("single")}
            >
              Thêm một key
            </button>
            <button
              type="button"
              className={`key-tab ${activeTab === "file" ? "active" : ""}`}
              onClick={() => setActiveTab("file")}
            >
              Thêm từ file
            </button>
          </div>

          {activeTab === "single" ? (
            <>
              <div className="key-form-group">
                <label htmlFor="apiKey">API Key:</label>
                <input
                  ref={inputRef}
                  type="text"
                  id="apiKey"
                  value={newKey}
                  onChange={handleKeyChange}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Nhập API Key của Gemini"
                  required
                />
              </div>

              <div className="key-form-group">
                <label htmlFor="keyLabel">Nhãn (tùy chọn):</label>
                <input
                  type="text"
                  id="keyLabel"
                  value={keyLabel}
                  onChange={handleLabelChange}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Ví dụ: Key chính, Key dự phòng..."
                />
              </div>
            </>
          ) : (
            <div className="key-form-group">
              <label htmlFor="keyFile">Chọn file chứa API Key (.txt):</label>
              <input
                type="file"
                id="keyFile"
                accept=".txt"
                onChange={handleFileUpload}
                onClick={(e) => e.stopPropagation()}
              />
              {fileError && <div className="file-error">{fileError}</div>}
              {fileContent && (
                <div className="file-preview">
                  <p>
                    Số lượng key trong file:{" "}
                    {
                      fileContent
                        .split("\n")
                        .filter((line) => line.trim().length > 0).length
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="key-form-group">
            <label>Nhà cung cấp:</label>
            <div className="key-provider-options">
              <label className="key-provider-option">
                <input
                  type="radio"
                  name="provider"
                  value="google"
                  checked={selectedProvider === "google"}
                  onChange={handleProviderChange}
                />
                <span className="key-provider-badge">Google</span>
              </label>
              <label className="key-provider-option">
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  checked={selectedProvider === "openai"}
                  onChange={handleProviderChange}
                />
                <span className="key-provider-badge">OpenAI</span>
              </label>
              <label className="key-provider-option">
                <input
                  type="radio"
                  name="provider"
                  value="deepresearch"
                  checked={selectedProvider === "deepresearch"}
                  onChange={handleProviderChange}
                />
                <span className="key-provider-badge">DeepResearch</span>
              </label>
            </div>
          </div>

          <div className="key-modal-buttons">
            <button type="submit" className="key-use-btn">
              {activeTab === "single" ? "Thêm Key" : "Thêm Keys từ File"}
            </button>
            <button type="button" className="key-cancel-btn" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const KeyManagement = () => {
  const {
    userData,
    loading,
    error,
    userApiKey,
    addApiKey,
    removeApiKey,
    fetchApiKey,
  } = useContext(AuthContext);

  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchApiKey();
  }, []);

  const handleAddKey = useCallback(() => {
    setIsAddKeyModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddKeyModalOpen(false);
  }, []);

  const handleKeyClick = (key) => {
    setSelectedKey(key);
  };

  const handleCloseKeyModal = () => {
    setSelectedKey(null);
  };

  const handleRemoveKey = async (keyId, e) => {
    e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài
    if (window.confirm(`Bạn có chắc muốn xóa key này?`)) {
      try {
        await removeApiKey(keyId);
        toast.success("Xóa key thành công!");
        fetchApiKey();
      } catch (error) {
        toast.error(
          "Lỗi khi xóa key: " + (error.response?.data?.error || error.message)
        );
      }
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div className="key-management">
      <h2>Quản Lý Khóa (API Key Gemini)</h2>

      <button className="use-btn" onClick={handleAddKey}>
        Thêm Key Mới
      </button>

      <AddKeyModal
        isOpen={isAddKeyModalOpen}
        onClose={handleCloseModal}
        inputRef={inputRef}
      />

      {selectedKey && (
        <UserModelModals
          keyData={selectedKey}
          onClose={handleCloseKeyModal}
        />
      )}

      <div className="keys-table-container">
        <table className="keys-table">
          <thead>
            <tr>
              <th>Key ID</th>
              <th>Label</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {userApiKey.map((key) => (
              <tr 
                key={key.id} 
                className="key-row"
                onClick={() => handleKeyClick(key)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div className="key-preview">
                    {key.key.substring(0, 10)}...
                  </div>
                </td>
                <td>{key.label || "Không có nhãn"}</td>
                <td>
                  <div className="key-status">
                    {/* Hiển thị trạng thái tổng thể của key */}
                    {key.models && key.models.length > 0 ? (
                      <>
                        {/* Kiểm tra xem có model nào đang hoạt động không */}
                        {key.models.some(m => m.status === "ACTIVE") ? (
                          <span className="status-badge status-active">
                            🟢 Hoạt động
                          </span>
                        ) : key.models.some(m => m.status === "COOLDOWN") ? (
                          <span className="status-badge status-cooldown">
                            🟡 Đang nghỉ
                          </span>
                        ) : (
                          <span className="status-badge status-exhausted">
                            🔴 Đã hết quota
                          </span>
                        )}
                        
                        {/* Hiển thị cảnh báo nếu có model hết quota */}
                        {key.models.some(m => m.status === "EXHAUSTED") && 
                          <span className="warning-badge">⚠️ Có model đã hết quota</span>
                        }
                        
                        {/* Hiển thị số lượng models */}
                        <div className="model-count">
                          {key.models.length} models
                        </div>
                      </>
                    ) : (
                      <span className="status-badge">
                        ⚪ Không có model
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <button
                    className="use-btn"
                    onClick={(e) => handleRemoveKey(key.id, e)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="key-management-info">
        <h3>📝 Hướng dẫn sử dụng:</h3>
        <ul>
          <li>🟢 <strong>Hoạt động:</strong> Key đang hoạt động bình thường</li>
          <li>🟡 <strong>Đang nghỉ:</strong> Key đang trong thời gian cooldown do vượt quá giới hạn</li>
          <li>🔴 <strong>Đã hết quota:</strong> Key đã hết quota cho model cụ thể</li>
        </ul>
        <p>
          <strong>Lưu ý:</strong> Một key có thể có trạng thái khác nhau cho từng model. 
          Nếu key hết quota cho một model, bạn vẫn có thể sử dụng nó cho các model khác.
        </p>
      </div>
    </div>
  );
};

const InterfaceSettings = ({
  currentTheme,
  onThemeChange,
  currentBackground,
  onBackgroundChange,
}) => {
  const {
    userData,
    loading,
    error,
    updateUserProfile,
    updateAvatar,
    updateBackground,
  } = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleBgUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        onBackgroundChange(event.target.result); // Truyền URL data của ảnh
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBackground = async () => {
    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append("image", selectedFile);
        await updateBackground(formData);
        setMessage("Cập nhật ảnh nền thành công!");
        setSelectedFile(null);
      } catch (error) {
        setMessage(
          "Lỗi khi upload ảnh nền: " +
            (error.response?.data?.error || error.message)
        );
      }
    }
  };

  return (
    <div className="interface-settings">
      <h2>Giao Diện</h2>
      {message && <div className="message">{message}</div>}
      <div className="theme-selection">
        <h3>Chọn Giao Diện:</h3>
        <button
          onClick={() => onThemeChange("light")}
          className={currentTheme === "light" ? "active" : ""}
        >
          Sáng
        </button>
        <button
          onClick={() => onThemeChange("dark")}
          className={currentTheme === "dark" ? "active" : ""}
        >
          Tối
        </button>
      </div>
      <div className="background-selection">
        <h3>Chọn Ảnh Nền Web:</h3>
        {currentBackground && (
          <img
            src={currentBackground}
            alt="Current background"
            className="current-background-preview"
          />
        )}
        <input type="file" accept="image/*" onChange={handleBgUpload} />
        <div className="background-buttons">
          <button
            className="use-btn"
            onClick={handleSaveBackground}
            disabled={!selectedFile}
          >
            Lưu ảnh nền
          </button>
          <button
            className="use-btn"
            onClick={() => onBackgroundChange("")}
            disabled={!currentBackground}
          >
            Xóa ảnh nền
          </button>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [activeMenu, setActiveMenu] = useState("profile");
  const [activeTab, setActiveTab] = useState("translated");
  const navigate = useNavigate();
  const {
    userData,
    onLogout,
    userStories,
    handleEditStories,
    handleDeleteStories,
    hideStory,
    deleteStory,
  } = useContext(AuthContext);
  const [username, setUsername] = useState(userData.username || "");
  const [avatar, setAvatar] = useState(
    `http://localhost:8000/data/upload/avatar/${userData.avatar}`
  );
  const defaultAvatar = "https://www.w3schools.com/howto/img_avatar.png";

  // Quản lý theme và background
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const [backgroundImage, setBackgroundImage] = useState(() => {
    // Kiểm tra localStorage trước
    const savedBg = localStorage.getItem("backgroundImage");
    if (savedBg) return savedBg;

    // Nếu có userData và backgroundImage, tạo URL
    if (userData.backgroundImage) {
      return `http://localhost:8000/data/upload/background/${userData.backgroundImage}`;
    }

    // Nếu không có cả hai, trả về chuỗi rỗng
    return "";
  });

  // Effect để cập nhật background khi userData thay đổi
  useEffect(() => {
    if (userData.backgroundImage) {
      const bgImage = `http://localhost:8000/data/upload/background/${userData.backgroundImage}`;
      setBackgroundImage(bgImage);
    }
  }, [userData.backgroundImage]);

  // Effect để áp dụng background vào body
  useEffect(() => {
    if (backgroundImage) {
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      localStorage.setItem("backgroundImage", backgroundImage);
    } else {
      // Chỉ xóa background nếu user không đăng nhập
      if (!userData.id) {
        document.body.style.backgroundImage = "";
        localStorage.removeItem("backgroundImage");
      }
    }
  }, [backgroundImage, userData.id]);

  // Effect để áp dụng theme
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Effect để cập nhật username và avatar khi userData thay đổi
  useEffect(() => {
    setUsername(userData.username || "");
    setAvatar(`http://localhost:8000/data/upload/avatar/${userData.avatar}`);
  }, [userData]);

  const handleMenuClick = (menuItem) => {
    setActiveMenu(menuItem);
  };

  const handleLogout = () => {
    onLogout();
    navigate("/");
    document.body.style.backgroundImage = "";
    console.log("User logged out");
    alert("Đăng xuất thành công!");
  };

  const handleHideStory = async (storyId) => {
    if (window.confirm("Bạn có chắc muốn ẩn truyện này?")) {
      await hideStory(storyId);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStory(storyId);
    }
  };

  const renderTabContent = () => {
    return (
      <div className="tab-content">
        <div
          className={`tab-pane ${activeTab === "translated" ? "active" : ""}`}
        >
          <TranslatedStories />
        </div>
        <div
          className={`tab-pane ${activeTab === "translating" ? "active" : ""}`}
        >
          <TranslatingStories />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "profile":
        return <ProfileSettings />;
      case "truyen":
        return (
          <div className="truyen-content">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "translated" ? "active" : ""}`}
                onClick={() => setActiveTab("translated")}
              >
                Truyện đã dịch
              </button>
              <button
                className={`tab ${activeTab === "translating" ? "active" : ""}`}
                onClick={() => setActiveTab("translating")}
              >
                Truyện đang dịch
              </button>
            </div>
            {renderTabContent()}
          </div>
        );
      case "keys":
        return <KeyManagement />;
      case "interface":
        return (
          <InterfaceSettings
            currentTheme={theme}
            onThemeChange={setTheme}
            currentBackground={backgroundImage}
            onBackgroundChange={setBackgroundImage}
          />
        );
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className={`users-page ${theme}`}>
      <div className="users-sidebar">
        <div
          className="user-info-menu"
          onClick={() => handleMenuClick("profile")}
        >
          <img src={avatar} alt="User Avatar" className="menu-avatar" />
          <span>{username}</span>
        </div>
        <div
          className={`menu-item ${activeMenu === "profile" ? "active" : ""}`}
          onClick={() => handleMenuClick("profile")}
        >
          👤 Trang cá nhân
        </div>
        <div
          className={`menu-item ${activeMenu === "truyen" ? "active" : ""}`}
          onClick={() => handleMenuClick("truyen")}
        >
          📚 Tủ truyện cá nhân
        </div>
        <div
          className={`menu-item ${activeMenu === "keys" ? "active" : ""}`}
          onClick={() => handleMenuClick("keys")}
        >
          🎨 Quản lý khoá (key)
        </div>
        <div
          className={`menu-item ${activeMenu === "interface" ? "active" : ""}`}
          onClick={() => handleMenuClick("interface")}
        >
          🔑 Giao diện
        </div>
        <div className="menu-item" onClick={handleLogout}>
          🚪 Logout
        </div>
      </div>
      <div className="users-content">{renderContent()}</div>
    </div>
  );
};

export default Users;
