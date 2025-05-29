import React, { useState } from "react";
import "./UserStoryCard.css";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../../assets/default_avatar.jpg";

const UserStoryCard = ({ story, onHide, onDelete, onUpdate, showCompleteButton = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState({
    storyAvatar: story.storyAvatar,
    name: story.name,
    author: story.author,
  });
  const [previewAvatar, setPreviewAvatar] = useState(story.storyAvatar);
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();
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
      navigate("/translate");
    } else {
      toast.error("❌ Bạn đã hủy xoá truyện");
      navigate("/translate");
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

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn đánh dấu truyện này là đã hoàn thành?")) {
      try {
        await onUpdate(story.id, "isComplete", true);
        toast.success("Đã đánh dấu truyện hoàn thành!");
      } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái:", error);
        toast.error("Lỗi khi cập nhật trạng thái truyện");
      }
    } else {
      toast.error("Đã hủy đánh dấu hoàn thành");
    }
  };

  return (
    <div className="user-story-card">
      {/* Phần thông tin truyện */}
      <div className="stories-info">
        <div className="stories-info-avatar">
          {isEditing ? (
            <div className="avatar-upload">
              <label htmlFor="avatar-upload">
                <img
                  src={previewAvatar || null}
                  className="avatar-preview"
                  onClick={(e) => {
                    e.stopPropagation(); // Ngăn sự kiện click nổi bọt lên div cha
                  }}
                />
              </label>
              <input
                type="file"
                id="avatar-upload"
                name="storyAvatar"
                accept="image/*"
                onChange={handleAvatarChange}
                onClick={(e) => {
                  e.stopPropagation(); // Ngăn sự kiện click nổi bọt lên div cha
                }}
                className="avatar-input"
              />
            </div>
          ) : (
            <img src={story.storyAvatar || defaultAvatar} onClick={(e) => e.stopPropagation()} />
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
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            ) : (
              <h3 onClick={(e) => e.stopPropagation()}>
                {story.name}
                {story.isComplete && <span className="completed-badge">✓</span>}
              </h3>
            )}
          </div>
          <div className="stories-author">
            {isEditing ? (
              <input
                type="text"
                name="author"
                value={editedStory.author}
                onChange={handleInputChange}
                onClick={(e) => {
                  e.stopPropagation(); // Ngăn sự kiện click nổi bọt lên div cha
                }}
              />
            ) : (
              <p onClick={(e) => e.stopPropagation()}>Tác giả: {story.author}</p>
            )}
          </div>
          <div className="stories-total-chapters">
            <p>
              Tổng chương:{" "}
              {story.chapters
                ? story.chapters.filter((chapter) => !chapter.isHidden).length
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Thời gian cập nhật */}
      <div className="stories-update-time">
        <p>
          Cập nhật lần cuối: {new Date(story.updatedAt).toLocaleString("vi-VN")}
        </p>
      </div>

      {/* Nút chức năng */}
      <div className="stories-update-btn">
        {isEditing ? (
          <button
            className="btn-update-stories"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
          >
            Lưu
          </button>
        ) : (
          <button
            className="btn-update-stories"
            onClick={(e) => {
              e.stopPropagation();
              handleEditToggle();
            }}
          >
            Sửa
          </button>
        )}
        <button
          className="btn-complete-stories"
          onClick={handleComplete}
          style={{ display: (story.isComplete || !showCompleteButton) ? 'none' : 'block' }}
        >
          Hoàn thành
        </button>
        <button
          className="btn-delete-stories"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          Xoá
        </button>
      </div>
    </div>
  );
};

export default UserStoryCard;
