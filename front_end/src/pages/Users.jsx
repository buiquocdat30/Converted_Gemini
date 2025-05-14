import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeLowVision } from "@fortawesome/free-solid-svg-icons";
import UserStoryCard from "../components/UserStoryCard/UserStoryCard";
import "./pageCSS/Users.css"; // Hãy đảm bảo bạn tạo file này và viết CSS cho nó

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
  const { stories, loading, error, fetchStories, handleEditStories } = useContext(AuthContext);
  const [storiesList, setStoriesList] = useState([]);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (stories) {
      setStoriesList(stories);
    }
  }, [stories]);

  const handleDeleteStory = (storyId) => {
    // Xử lý xóa truyện
    setStoriesList(prevStories => prevStories.filter(story => story.id !== storyId));
    // Thêm logic gọi API để xóa truyện ở đây
  };

  const handleUpdateStory = (storyId, field, value) => {
    handleEditStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    setStoriesList(prevStories =>
      prevStories.map(story =>
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
              onDelete={handleDeleteStory}
              onUpdate={handleUpdateStory}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TranslatingStories = () => {
  // Dữ liệu mẫu
  const [stories, setStories] = useState([
    {
      id: 1,
      name: "Truyện C đang dịch",
      author: "Tác giả Z",
      chapters: 20,
      lastUpdated: "2025-05-06",
    },
  ]);

  const handleEdit = (storyId, field, value) => {
    setStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
      )
    );
    // Thêm logic gọi API để lưu thay đổi ở đây
    console.log(`Updating story ${storyId}: ${field} = ${value}`);
  };
  return (
    <div className="translating-stories">
      <h2>Truyện Đang Dịch</h2>
      <table>
        <thead>
          <tr>
            <th>Tên truyện (cho phép sửa)</th>
            <th>Tên tác giả (cho phép sửa)</th>
            <th>Tổng số chương</th>
            <th>Cập nhật lần cuối</th>
          </tr>
        </thead>
        <tbody>
          {stories.map((story) => (
            <tr key={story.id}>
              <td>
                <input
                  type="text"
                  value={story.name}
                  onChange={(e) => handleEdit(story.id, "name", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={story.author}
                  onChange={(e) => handleEdit(story.id, "author", e.target.value)}
                />
              </td>
              <td>{story.chapters}</td>
              <td>{story.lastUpdated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const KeyManagement = () => {
  const { userData, loading, error, addApiKey, removeApiKey } =
    useContext(AuthContext);
  const [message, setMessage] = useState("");

  const handleAddKey = async () => {
    const newKey = prompt("Nhập API Key mới của Gemini:");
    if (newKey) {
      try {
        await addApiKey({
          key: newKey,
          label: "Key Gemini mới",
        });
        setMessage("Thêm key thành công!");
      } catch (error) {
        setMessage(
          "Lỗi khi thêm key: " + (error.response?.data?.error || error.message)
        );
      }
    }
  };

  const handleRemoveKey = async (keyId) => {
    if (window.confirm(`Bạn có chắc muốn xóa key này?`)) {
      try {
        await removeApiKey(keyId);
        setMessage("Xóa key thành công!");
      } catch (error) {
        setMessage(
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
      {message && <div className="message">{message}</div>}

      <button
        className="use-btn"
        onClick={handleAddKey}
        style={{ marginBottom: "20px" }}
      >
        Thêm Key Mới
      </button>
      <table>
        <thead>
          <tr>
            <th>Key ID (một phần)</th>
            <th>Label</th>
            <th>Trạng thái</th>
            <th>Số lần sử dụng</th>
            <th>Lần sử dụng cuối</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {userData.userApiKeys.map((key) => (
            <tr key={key.id}>
              <td>{key.key.substring(0, 10)}...</td>
              <td>{key.label || "Không có nhãn"}</td>
              <td className={`status-${key.status.toLowerCase()}`}>
                {key.status === "ACTIVE"
                  ? "Hoạt động"
                  : key.status === "COOLDOWN"
                  ? "Đang nghỉ"
                  : "Đã hết hạn"}
              </td>
              <td>{key.usageCount}</td>
              <td>
                {key.lastUsedAt
                  ? new Date(key.lastUsedAt).toLocaleString()
                  : "Chưa sử dụng"}
              </td>
              <td>
                <button
                  className="use-btn"
                  onClick={() => handleRemoveKey(key.id)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: "20px" }}>
        <strong>Lưu ý:</strong> RPM (Requests Per Minute) và TPD (Tokens Per
        Day) là các giới hạn của API Key. Hãy kiểm tra tài liệu của Gemini API
        để biết thông tin chính xác.
      </p>
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
  const { userData, onLogout } = useContext(AuthContext);
  const [username, setUsername] = useState(userData.username || "");
  const [avatar, setAvatar] = useState(
    `http://localhost:8000/data/upload/avatar/${userData.avatar}`
  );
  const defaultAvatar = "https://www.w3schools.com/howto/img_avatar.png";

  // Quản lý theme và background
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const bgImage=`http://localhost:8000/data/upload/background/${userData.backgroundImage}`
  const [backgroundImage, setBackgroundImage] = useState(
    () => bgImage || localStorage.getItem("backgroundImage") || ""
  );

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.backgroundImage = backgroundImage
      ? `url(${backgroundImage})`
      : "";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    localStorage.setItem("backgroundImage", backgroundImage);
  }, [backgroundImage]);

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

  const renderTabContent = () => {
    return (
      <div className="tab-content">
        <div className={`tab-pane ${activeTab === 'translated' ? 'active' : ''}`}>
          <TranslatedStories />
        </div>
        <div className={`tab-pane ${activeTab === 'translating' ? 'active' : ''}`}>
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
                className={`tab ${activeTab === 'translated' ? 'active' : ''}`}
                onClick={() => setActiveTab('translated')}
              >
                Truyện đã dịch
              </button>
              <button 
                className={`tab ${activeTab === 'translating' ? 'active' : ''}`}
                onClick={() => setActiveTab('translating')}
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
