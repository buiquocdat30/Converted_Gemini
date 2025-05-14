import React, { useState } from 'react';
import './UserStoryCard.css';

const UserStoryCard = ({ story, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState({
    avatar: story.avatar,
    name: story.name,
    author: story.author,
  });

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

  const handleSave = () => {
    onUpdate(story.id, editedStory);
    setIsEditing(false);
  };

  return (
    <div className="user-story-card">
      {/* Phần thông tin truyện */}
      <div className="stories-info">
        <div className="stories-info-avatar">
          {isEditing ? (
            <input
              type="text"
              name="avatar"
              value={editedStory.avatar}
              onChange={handleInputChange}
              placeholder="URL hình ảnh"
            />
          ) : (
            <img src={story.avatar}  />
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
