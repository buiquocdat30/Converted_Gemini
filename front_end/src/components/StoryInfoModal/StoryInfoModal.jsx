// StoryInfoModal.jsx (hoặc đặt ngay trên cùng file UploadForm.jsx)
import React from "react";
import ".//StoryInfoModal.css";

const StoryInfoModal = ({
  storyInfo,
  setStoryInfo,
  handleCreateStory,
  isCreatingStory,
  setShowStoryInfoModal,
}) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3>📝 Thông tin truyện</h3>
        <div className="form-group">
          <label>Tên truyện:</label>
          <input
            type="text"
            value={storyInfo.name}
            onChange={(e) => {
              const newValue = e.target.value;
              setStoryInfo((prev) => ({
                ...prev,
                name: newValue,
              }));
            }}
            placeholder="Nhập tên truyện"
          />
        </div>
        <div className="form-group">
          <label>Tác giả:</label>
          <input
            type="text"
            value={storyInfo.author}
            onChange={(e) => {
              const newValue = e.target.value;
              setStoryInfo((prev) => ({
                ...prev,
                author: newValue,
              }));
            }}
            placeholder="Nhập tên tác giả"
          />
        </div>
        <div className="modal-buttons">
          <button
            onClick={handleCreateStory}
            disabled={isCreatingStory}
            className="btn-submit"
          >
            {isCreatingStory ? "Đang tạo..." : "Tạo truyện"}
          </button>
          <button
            onClick={() => setShowStoryInfoModal(false)}
            className="btn-cancel"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryInfoModal; // Export component để có thể import và sử dụng
