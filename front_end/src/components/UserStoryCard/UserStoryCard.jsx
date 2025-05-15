import React, { useState } from "react";
import "./UserStoryCard.css";
import axios from "axios";
import defaultAvatar from "../../assets/default_avatar.jpg";

const UserStoryCard = ({ story,onHide, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState({
    storyAvatar: story.storyAvatar,
    name: story.name,
    author: story.author,
  });
  const [previewAvatar, setPreviewAvatar] = useState(story.storyAvatar);
  const [selectedFile, setSelectedFile] = useState(null);
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  //xoá mềm dùng trong tủ truyện
  const handleDelete = () => {
    if (window.confirm("Bạn có chắc chắn muốn xoá truyện này không?")) {
      onHide(story.id);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedStory((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // Nếu có file ảnh mới, upload ảnh trước
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);
        console.log("formData", formData);
        const response = await axios.post(
          "http://localhost:8000/upload/image/storyAvatar",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
            },
          }
        );
        const storyAvatar = `http://localhost:8000/data/upload/${response.data.filePath}`;
        console.log("storyAvatar", storyAvatar);
        // Cập nhật storyAvatar với đường dẫn mới
        await onUpdate(story.id, "storyAvatar", storyAvatar);
      }

      // Cập nhật các thông tin khác
      for (const [field, value] of Object.entries(editedStory)) {
        if (field !== "storyAvatar") {
          // Không cập nhật storyAvatar ở đây vì đã xử lý ở trên
          await onUpdate(story.id, field, value);
        }
      }

      setIsEditing(false);
      setSelectedFile(null); // Reset selected file
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin:", error);
    }
  };

  return (
    <div className="user-story-card">
      {/* Phần thông tin truyện */}
      <div className="stories-info">
        <div className="stories-info-avatar">
          {isEditing ? (
            <div className="avatar-upload">
              <img src={previewAvatar || null} className="avatar-preview" />
              <input
                type="file"
                name="storyAvatar"
                accept="image/*"
                onChange={handleAvatarChange}
                className="avatar-input"
              />
            </div>
          ) : (
            <img src={story.storyAvatar || defaultAvatar} />
          )}
        </div>

        <div className="stories-info-body">
          <div className="stories-name">
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={editedStory.name}
                onChange={handleInputChange}
              />
            ) : (
              <h3>{story.name}</h3>
            )}
          </div>
          <div className="stories-author">
            {isEditing ? (
              <input
                type="text"
                name="author"
                value={editedStory.author}
                onChange={handleInputChange}
              />
            ) : (
              <p>Tác giả: {story.author}</p>
            )}
          </div>
          <div className="stories-total-chapters">
            <p>Tổng chương: {story.chapters ? story.chapters.filter(chapter => !chapter.isHidden).length : 0}</p>
          </div>
        </div>
      </div>

      {/* Thời gian cập nhật */}
      <div className="stories-update-time">
        <p>Cập nhật lần cuối: {new Date(story.updatedAt).toLocaleString('vi-VN')}</p>
      </div>

      {/* Nút chức năng */}
      <div className="stories-update-btn">
        {isEditing ? (
          <button className="btn-update-stories" onClick={handleSave}>
            Lưu
          </button>
        ) : (
          <button className="btn-update-stories" onClick={handleEditToggle}>
            Sửa
          </button>
        )}
        <button className="btn-delete-stories" onClick={handleDelete}>
          Xoá
        </button>
      </div>
    </div>
  );
};

export default UserStoryCard;
