import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import "./StoryInfoForm.css";

const StoryInfoForm = ({
  story,
  onSave,
  isEditing = false,
  fileName = "",
  onStorySaved,
}) => {
  const [storyInfo, setStoryInfo] = useState({
    name: story?.name || "",
    author: story?.author || "",
    storyAvatar: story?.storyAvatar || "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(story?.storyAvatar || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (story) {
      setStoryInfo({
        name: story.name || "",
        author: story.author || "",
        storyAvatar: story.storyAvatar || "",
      });
      setPreviewAvatar(story.storyAvatar || "");
    }
  }, [story]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoryInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let finalStoryInfo = { ...storyInfo };

      // Nếu không có tên truyện, tạo tên mặc định
      if (!finalStoryInfo.name) {
        const date = new Date().toLocaleDateString("vi-VN");
        finalStoryInfo.name = `Truyện mới - ${date}`;
      }

      // Nếu không có tác giả, đặt mặc định
      if (!finalStoryInfo.author) {
        finalStoryInfo.author = "Không biết";
      }

      // Upload ảnh nếu có
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);
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
        finalStoryInfo.storyAvatar = `http://localhost:8000/data/upload/${response.data.filePath}`;
      }

      // Gọi callback để lưu thông tin truyện
      await onSave(finalStoryInfo);
      if (onStorySaved) {
        onStorySaved(finalStoryInfo);
      }

      toast.success("Lưu thông tin truyện thành công!");
    } catch (error) {
      console.error("Lỗi khi lưu thông tin truyện:", error);
      toast.error("Lỗi khi lưu thông tin truyện: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="story-info-form">
      <h3>
        {isEditing ? "Chỉnh sửa thông tin truyện" : "Lưu thông tin truyện"}
      </h3>
      <div className="story-info-form-wrapper">
        <div className="story-info">
          <div className="form-group">
            <label>Tên truyện:</label>
            <input
              type="text"
              name="name"
              value={storyInfo.name}
              onChange={handleInputChange}
              placeholder="Nhập tên truyện"
            />
          </div>
          <div className="form-group">
            <label>Tác giả:</label>
            <input
              type="text"
              name="author"
              value={storyInfo.author}
              onChange={handleInputChange}
              placeholder="Nhập tên tác giả"
            />
          </div>
        </div>
        <div className="s-story-avatar">
          <div className="avatar-upload">
            <label htmlFor="avatar-input">
              <img
                src={previewAvatar || "/default-avatar.jpg"}
                alt="Story Avatar"
                className="avatar-preview"
              />
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="avatar-input"
            />
          </div>
        </div>
      </div>
      <button onClick={handleSave} disabled={isSaving} className="save-button">
        {isSaving ? "Đang lưu..." : "Lưu thông tin"}
      </button>
    </div>
  );
};

export default StoryInfoForm;
