import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
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
  const [dob, setDob] = useState(userData.birthdate || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setUsername(userData.username || "");
    setDob(userData.birthdate || "");
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

  const handleBackgroundChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const formData = new FormData();
        formData.append("image", e.target.files[0]);
        await updateBackground(formData);
        setMessage("Cập nhật ảnh nền thành công!");
      } catch (error) {
        setMessage(
          "Lỗi khi upload ảnh nền: " +
            (error.response?.data?.error || error.message)
        );
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        username,
        birthdate: dob,
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

    try {
      await updateUserProfile({
        currentPassword,
        newPassword,
      });
      setMessage("Đổi mật khẩu thành công!");
      setCurrentPassword("");
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
            src={userData.avatar || "https://via.placeholder.com/150"}
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
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dob">Ngày sinh:</label>
          <input
            type="date"
            id="dob"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={loading}
          />
        </div>

        <button className="use-btn" type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Lưu thay đổi"}
        </button>
      </form>

      <hr />

      <h3>Đổi Mật Khẩu</h3>
      <form onSubmit={handleChangePassword} className="password-form">
        <div className="form-group">
          <label htmlFor="current-password">Mật khẩu hiện tại:</label>
          <input
            type="password"
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="new-password">Mật khẩu mới:</label>
          <input
            type="password"
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm-new-password">Xác nhận mật khẩu mới:</label>
          <input
            type="password"
            id="confirm-new-password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button className="use-btn" type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
};

const TranslatedStories = () => {
  // Dữ liệu mẫu, bạn sẽ fetch từ API
  const [stories, setStories] = useState([
    {
      id: 1,
      name: "Truyện A đã dịch",
      author: "Tác giả X",
      chapters: 100,
      lastUpdated: "2025-05-01",
    },
    {
      id: 2,
      name: "Truyện B đã dịch",
      author: "Tác giả Y",
      chapters: 50,
      lastUpdated: "2025-04-20",
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
    <div className="translated-stories">
      <h2>Truyện Đã Dịch</h2>
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
                  onChange={(e) =>
                    handleEdit(story.id, "author", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleEdit(story.id, "author", e.target.value)
                  }
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
  const handleBgUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onBackgroundChange(event.target.result); // Truyền URL data của ảnh
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="interface-settings">
      <h2>Giao Diện</h2>
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
        <button
          className="use-btn"
          onClick={() => onBackgroundChange("")}
          disabled={!currentBackground}
        >
          Xóa ảnh nền
        </button>
      </div>
    </div>
  );
};

const Users = () => {
  const [activeMenu, setActiveMenu] = useState("profile"); // 'profile', 'translated', 'translating', 'keys', 'interface'
  const [isTruyenDropdownOpen, setIsTruyenDropdownOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "Tên User Mẫu",
    avatar: "https://via.placeholder.com/40", // URL avatar mẫu
  });

  // Quản lý theme và background
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  ); // Mặc định là light, hoặc lấy từ localStorage
  const [backgroundImage, setBackgroundImage] = useState(
    () => localStorage.getItem("backgroundImage") || ""
  );

  useEffect(() => {
    // Áp dụng theme cho body hoặc một container cha của toàn bộ app
    document.body.className = theme; // Ví dụ: <body class="light"> hoặc <body class="dark">
    localStorage.setItem("theme", theme); // Lưu lựa chọn theme
  }, [theme]);

  useEffect(() => {
    // Áp dụng background cho body hoặc một container cha
    document.body.style.backgroundImage = backgroundImage
      ? `url(${backgroundImage})`
      : "";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed"; // tùy chọn
    localStorage.setItem("backgroundImage", backgroundImage); // Lưu lựa chọn background
  }, [backgroundImage]);

  const handleMenuClick = (menuItem) => {
    setActiveMenu(menuItem);
    if (menuItem !== "translated" && menuItem !== "translating") {
      setIsTruyenDropdownOpen(false); // Đóng dropdown nếu không phải mục con của "Tủ truyện"
    }
  };

  const toggleTruyenDropdown = () => {
    setIsTruyenDropdownOpen(!isTruyenDropdownOpen);
  };

  const handleLogout = () => {
    // Logic đăng xuất
    console.log("User logged out");
    alert("Đăng xuất thành công! (giả lập)");
    // Ví dụ: xóa token, redirect về trang login
    // window.location.href = '/login';
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "profile":
        return <ProfileSettings />;
      case "translated":
        return <TranslatedStories />;
      case "translating":
        return <TranslatingStories />;
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
        return <ProfileSettings />; // Mặc định hiển thị trang cá nhân
    }
  };

  return (
    <div className={`users-page ${theme}`}>
      {" "}
      {/* Thêm class theme vào đây nếu muốn styleเฉพาะ trang */}
      <div className="users-sidebar">
        <div
          className="user-info-menu"
          onClick={() => handleMenuClick("profile")}
        >
          <img
            src={userData.avatar}
            alt="User Avatar"
            className="menu-avatar"
          />
          <span>{userData.name}</span>
        </div>
        <div
          className={`menu-item ${activeMenu === "profile" ? "active" : ""}`}
          onClick={() => handleMenuClick("profile")}
        >
          👤 Trang cá nhân
        </div>
        <div className="menu-item-dropdown">
          <div
            className={`menu-item ${isTruyenDropdownOpen ? "open" : ""}`}
            onClick={toggleTruyenDropdown}
          >
            📚 Tủ truyện cá nhân {isTruyenDropdownOpen ? "▲" : "▼"}
          </div>
          {isTruyenDropdownOpen && (
            <div className="dropdown-content">
              <div
                className={`menu-item sub-item ${
                  activeMenu === "translated" ? "active" : ""
                }`}
                onClick={() => handleMenuClick("translated")}
              >
                📖✅ Truyện đã dịch
              </div>
              <div
                className={`menu-item sub-item ${
                  activeMenu === "translating" ? "active" : ""
                }`}
                onClick={() => handleMenuClick("translating")}
              >
                ⏳ Truyện đang dịch
              </div>
            </div>
          )}
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
