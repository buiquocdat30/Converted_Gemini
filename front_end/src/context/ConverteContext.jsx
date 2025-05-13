// context/ConverteContext.jsx
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menu, setMenu] = useState("home");
  const [stories, setStories] = useState([]);

  // User data state
  const [userData, setUserData] = useState({
    id: "",
    username: "",
    email: "",
    avatar: "",
    backgroundImage: "",
    birthdate: "",
    libraryStories: [], // Truyện trong thư viện
    userApiKeys: [], // API keys của user
    createdAt: "",
    updatedAt: "",
  });

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      setIsLoggedIn(true);
      fetchUserData(token);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("response:", response);
      if (response.data) {
        setUserData({
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          avatar: response.data.avatar || "",
          backgroundImage: response.data.backgroundImage || "",
          birthdate: response.data.birthdate || "",
          libraryStories: response.data.libraryStories || [],
          userApiKeys: response.data.UserApiKey || [],
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        });
      }
      console.log("userData:", userData);
    } catch (err) {
      console.error("Lỗi khi lấy thông tin user:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật thông tin user
  const updateUserProfile = async (updateData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");

      // Kiểm tra xem có phải là cập nhật mật khẩu không
      if (updateData.newPassword) {
        console.log("updateData:", updateData.newPassword);
        // Nếu có currentPassword và newPassword thì gọi API đổi mật khẩu
        const response = await axios.put(
          "http://localhost:8000/user/change-password",
          updateData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        await fetchUserData(token);
        return response.data;
      } else {
        // Nếu không có password thì gọi API cập nhật thông tin cơ bản
        const response = await axios.put(
          "http://localhost:8000/user/profile",
          updateData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data) {
          setUserData((prev) => ({
            ...prev,
            ...response.data,
          }));
          await fetchUserData(token);
        }
        return response.data;
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật thông tin:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật avatar
  const updateAvatar = async (formData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");
      const response = await axios.post(
        "http://localhost:8000/upload/image/avatar",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data) {
        // Log để kiểm tra response
        console.log("Avatar update response:", response.data);

        // Cập nhật userData với avatar mới
        setUserData((prev) => ({
          ...prev,
          avatar: response.data.filePath || response.data.data.filePath,
        }));

        // Fetch lại toàn bộ thông tin user để đảm bảo dữ liệu đồng bộ
        await fetchUserData(token);
      }
      return response.data;
    } catch (err) {
      console.error("Lỗi khi cập nhật avatar:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật background
  const updateBackground = async (formData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");
      const response = await axios.post(
        "http://localhost:8000/upload/image/background",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data) {
        setUserData((prev) => ({
          ...prev,
          backgroundImage: response.data.data.filePath,
        }));
      }
      return response.data;
    } catch (err) {
      console.error("Lỗi khi cập nhật background:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Quản lý API keys
  const addApiKey = async (keyData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");
      const response = await axios.post(
        "http://localhost:8000/user/keys",
        keyData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data) {
        setUserData((prev) => ({
          ...prev,
          userApiKeys: [...prev.userApiKeys, response.data],
        }));
      }
      return response.data;
    } catch (err) {
      console.error("Lỗi khi thêm API key:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeApiKey = async (keyId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");
      await axios.delete(`http://localhost:8000/user/keys/${keyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData((prev) => ({
        ...prev,
        userApiKeys: prev.userApiKeys.filter((key) => key.id !== keyId),
      }));
    } catch (err) {
      console.error("Lỗi khi xóa API key:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const onLogin = (userData) => {
    if (!userData) return;
    
    setIsLoggedIn(true);
    setUserData({
      id: userData.id || "",
      username: userData.username || "",
      email: userData.email || "",
      avatar: userData.avatar || "",
      backgroundImage: userData.backgroundImage || "",
      birthdate: userData.birthdate || "",
      libraryStories: userData.libraryStories || [],
      userApiKeys: userData.userApiKeys || [],
      createdAt: userData.createdAt || "",
      updatedAt: userData.updatedAt || "",
    });
  };

  const onLogout = () => {
    localStorage.removeItem("auth-token");
    setIsLoggedIn(false);
    setUserData({
      id: "",
      username: "",
      email: "",
      avatar: "",
      backgroundImage: "",
      birthdate: "",
      libraryStories: [],
      userApiKeys: [],
      createdAt: "",
      updatedAt: "",
    });
    
  };

  // Hàm lấy danh sách truyện từ API
  const fetchStories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");
      const response = await axios.get('http://localhost:8000/user/library', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStories(response.data);
      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải danh sách truyện:", err);
      setError('Lỗi khi tải danh sách truyện: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Hàm cập nhật thông tin truyện
  const handleEdit = async (storyId, field, value) => {
    try {
      const token = localStorage.getItem("auth-token");
      await axios.put(`http://localhost:8000/user/library/${storyId}`, 
        { [field]: value },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Cập nhật state sau khi API call thành công
      setStories(prevStories =>
        prevStories.map(story =>
          story.id === storyId ? { ...story, [field]: value } : story
        )
      );
    } catch (err) {
      console.error("Lỗi khi cập nhật truyện:", err);
      setError('Lỗi khi cập nhật truyện: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        onLogin,
        onLogout,
        setMenu,
        menu,
        userData,
        loading,
        error,
        updateUserProfile,
        updateAvatar,
        updateBackground,
        addApiKey,
        removeApiKey,
        stories,
        fetchStories,
        handleEdit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
