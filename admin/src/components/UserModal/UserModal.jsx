import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { usersAPI } from "../../services/api";
import toast from "react-hot-toast";
import "./UserModal.css";

const UserModal = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    avatar: "",
    backgroundImage: "",
    birthdate: "",
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setIsEditing(true);
      setFormData({
        username: user.username,
        email: user.email,
        avatar: user.avatar || "",
        backgroundImage: user.backgroundImage || "",
        birthdate: user.birthdate
          ? new Date(user.birthdate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.email.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      setLoading(true);

      await usersAPI.update(user.id, formData);
      toast.success("Cập nhật user thành công");
      onSuccess();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Thông tin User</h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              type="text"
              className="form-control"
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder="Username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Avatar URL</label>
            <input
              type="url"
              className="form-control"
              value={formData.avatar}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, avatar: e.target.value }))
              }
              placeholder="URL hình đại diện"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Background Image URL</label>
            <input
              type="url"
              className="form-control"
              value={formData.backgroundImage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  backgroundImage: e.target.value,
                }))
              }
              placeholder="URL hình nền"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ngày sinh</label>
            <input
              type="date"
              className="form-control"
              value={formData.birthdate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, birthdate: e.target.value }))
              }
            />
          </div>

          {user && (
            <div className="user-details">
              <h4>Thống kê</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon bg-blue-500">
                    <span>🔑</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-title">API Keys</h3>
                    <p className="stat-value">{user.stats.totalKeys}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon bg-green-500">
                    <span>📚</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-title">Truyện</h3>
                    <p className="stat-value">{user.stats.totalStories}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon bg-purple-500">
                    <span>📖</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-title">Chương</h3>
                    <p className="stat-value">{user.stats.totalChapters}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon bg-orange-500">
                    <span>📊</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-title">Usage</h3>
                    <p className="stat-value">{user.stats.totalUsage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
