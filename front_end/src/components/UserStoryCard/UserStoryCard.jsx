import React, { useState } from 'react';
import './UserStoryCard.css';
import axios from 'axios';
import defaultAvatar from '../../assets/default_avatar.jpg';

const UserStoryCard = ({ story, onDelete, onUpdate }) => {
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

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá truyện này không?')) {
      onDelete(story.id);
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
    // Nếu có file ảnh mới, upload ảnh trước
    if (selectedFile) {
      const formData = new FormData();
      formData.append('image', selectedFile);
      try {
        console.log('formData',formData);
        const response = await axios.post('http://localhost:8000/upload/image/storyAvatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        // Cập nhật storyAvatar với đường dẫn mới
        onUpdate(story.id, 'storyAvatar', response.data.filePath);
      } catch (error) {
        console.error('Lỗi khi upload ảnh:', error);
        return;
      }
    }

    // Cập nhật các thông tin khác
    Object.entries(editedStory).forEach(([field, value]) => {
      if (field !== 'storyAvatar') { // Không cập nhật storyAvatar ở đây vì đã xử lý ở trên
        onUpdate(story.id, field, value);
      }
    });
    setIsEditing(false);
  };

  return (
    <div className="user-story-card">
      {/* Phần thông tin truyện */}
      <div className="stories-info">
        <div className="stories-info-avatar">
          {isEditing ? (
            <div className="avatar-upload">
              <img src={previewAvatar||null} className="avatar-preview" />
              <input
                type="file"
                name="storyAvatar"
                accept="image/*"
                onChange={handleAvatarChange}
                className="avatar-input"
              />
            </div>
          ) : (
            <img src={story.storyAvatar||defaultAvatar} />
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
            <p>Tổng chương: {story.totalChapters}</p>
          </div>
        </div>
      </div>

      {/* Thời gian cập nhật */}
      <div className="stories-update-time">
        <p>Cập nhật lần cuối: {story.lastUpdated}</p>
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
