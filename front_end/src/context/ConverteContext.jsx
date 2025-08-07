// context/ConverteContext.jsx
import React, { createContext, useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { handleEpubFile, checkFileFormatFromText, handleTxtFile } from "../utils/fileHandlers";
import { API_URL } from '../config/config';


// Helper function để lấy token
export const getAuthToken = () => localStorage.getItem("auth-token");

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ===== STATE MANAGEMENT =====
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menu, setMenu] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sử dụng useMemo để cache token
  const token = useMemo(() => {
    return localStorage.getItem("auth-token");
  }, [isLoggedIn]); // Chỉ tính toán lại khi isLoggedIn thay đổi

  // ===== USER STATE & FUNCTIONS =====
  const [userData, setUserData] = useState({
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

  // User Authentication
  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchUserData();
    }
  }, [token]);

  // 🚀 Thêm useEffect để áp dụng background ngay khi app khởi động
  useEffect(() => {
    if (userData.backgroundImage) {
      const bgImage = `http://localhost:8000/data/upload/background/${userData.backgroundImage}`;
      document.body.style.backgroundImage = `url(${bgImage})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      localStorage.setItem("backgroundImage", bgImage);
      console.log(`[BACKGROUND] Đã áp dụng background: ${bgImage}`);
    } else {
      // Chỉ xóa background nếu user không đăng nhập hoặc không có background
      if (!userData.id) {
        document.body.style.backgroundImage = "";
        localStorage.removeItem("backgroundImage");
        console.log('[BACKGROUND] Đã xóa background vì user không đăng nhập');
      }
    }
  }, [userData.backgroundImage, userData.id]);

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
    // 🚀 Xóa background khi logout
    document.body.style.backgroundImage = "";
    localStorage.removeItem("backgroundImage");
    console.log('[BACKGROUND] Đã xóa background khi logout');
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

  // User Profile Management
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    } catch (err) {
      console.error("Lỗi khi lấy thông tin user:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updateData) => {
    try {
      setLoading(true);

      if (updateData.newPassword) {
        const response = await axios.put(
          `${API_URL}/user/change-password`,
          updateData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        await fetchUserData();
        return response.data;
      } else {
        const response = await axios.put(
          `${API_URL}/user/profile`,
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
          await fetchUserData();
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

  const updateAvatar = async (formData) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/upload/image/avatar`,
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
          avatar: response.data.filePath || response.data.data.filePath,
        }));
        await fetchUserData();
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

  const updateBackground = async (formData) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/upload/image/background`,
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

  // ===== API KEY MANAGEMENT =====
  const addApiKey = async (keyData) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/user/keys`,
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
      await axios.delete(`${API_URL}/user/keys/${keyId}`, {
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

  const [userApiKey, setUserApiKey] = useState([]);

  const fetchApiKey = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/user/keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUserApiKey(response.data);

      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải danh sách API key:", err);
      setError(
        "Lỗi khi tải danh sách API key: " +
          (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // ===== STORY MANAGEMENT =====
  const [stories, setStories] = useState([]);
 

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/user/library`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setStories(response.data);
      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải danh sách truyện:", err);
      setError(
        "Lỗi khi tải danh sách truyện: " +
          (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const createStory = async (file, storyInfo) => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      // Upload và xử lý file trước
      const uploadResult = await uploadFile(file);
      const { chapters } = uploadResult;

      // Tạo truyện với thông tin chapters
      const response = await axios.post(
        `${API_URL}/user/library`,
        {
          ...storyInfo,
          chapters: chapters
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (err) {
      console.error("Lỗi khi tạo truyện mới:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editStories = async (storyId, field, value) => {
    try {
      const response = await axios.put(
        `${API_URL}/user/library/${storyId}`,
        { [field]: value },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStories((prevStories) =>
        prevStories.map((story) =>
          story.id === storyId ? { ...story, [field]: value } : story
        )
      );

      if (field === "storyAvatar") {
        setUserData((prev) => ({
          ...prev,
          libraryStories: prev.libraryStories.map((story) =>
            story.id === storyId ? { ...story, [field]: value } : story
          ),
        }));
      }

      return response.data;
    } catch (err) {
      console.error("Lỗi khi cập nhật truyện:", err);
      setError(
        "Lỗi khi cập nhật truyện: " + (err.response?.data?.error || err.message)
      );
      throw err;
    }
  };

  const hideStories = async (storyId) => {
    try {
      const response = await axios.patch(
        `${API_URL}/user/library/${storyId}/hide`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        fetchStories();
        toast.success("Đã xoá truyện thành công");
      }
    } catch (error) {
      console.error("Error hiding story:", error);
      toast.error("Lỗi khi xoá truyện");
    }
  };

  const deleteStories = async (storyId) => {
    try {
      const response = await axios.delete(`${API_URL}/user-library/${storyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        setStories((prevStories) =>
          prevStories.filter((story) => story.id !== storyId)
        );
        setUserData((prev) => ({
          ...prev,
          libraryStories: prev.libraryStories.filter(
            (story) => story.id !== storyId
          ),
        }));
        toast.success("Đã xóa truyện vĩnh viễn");
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      toast.error("Lỗi khi xóa truyện");
    }
  };

  // ===== FILE MANAGEMENT =====
  const uploadFile = async (file) => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      // Đọc file bằng FileReader
      const reader = new FileReader();
      const fileContent = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      let chapters = [];
      const setChaptersCallback = (chaps) => {
        chapters = chaps;
      };

      // Xử lý file dựa vào định dạng
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (fileExt === 'epub') {
        await handleEpubFile(
          fileContent,
          setChaptersCallback,
          (error) => { throw new Error(error); },
          () => {}, // setSuccess
          () => {}, // setChapterCount
          () => {}, // setTotalWords
          () => {}, // setAverageWords
          () => {}, // setBooks
          () => {}  // setAuthor
        );
      } else if (fileExt === 'txt') {
        handleTxtFile(
          fileContent,
          setChaptersCallback,
          (error) => { throw new Error(error); },
          () => {}, // setSuccess
          { current: null }, // fileInputRef
          () => {}, // setSelectedFile
          file,
          () => {}, // setChapterCount
          () => {}, // setTotalWords
          () => {}, // setAverageWords
          () => {}, // setBooks
          () => {}  // setAuthor
        );
      } else {
        throw new Error('Định dạng file không được hỗ trợ');
      }

      if (!chapters || chapters.length === 0) {
        throw new Error('Không thể đọc được nội dung chương từ file');
      }

      // Gửi chapters lên server
      const response = await axios.post(
        `${API_URL}/upload`,
        {
          fileName: file.name,
          chapters: chapters
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      return { ...response.data, chapters };
    } catch (err) {
      console.error("Lỗi khi upload file:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (fileId) => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      const response = await axios.post(
        `${API_URL}/process/file/${fileId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (err) {
      console.error("Lỗi khi xử lý file:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProcessedFile = async (fileId) => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      const response = await axios.get(
        `${API_URL}/process/file/${fileId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (err) {
      console.error("Lỗi khi lấy thông tin file đã xử lý:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ===== CHAPTER MANAGEMENT =====
  const addChapter = async (chapterData) => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }
  
      const response = await axios.post(
        `${API_URL}/user/library/${chapterData.storyId}/chapters`,
        {
          chapterNumber: chapterData.chapterNumber,
          chapterName: chapterData.chapterName,
          rawText: chapterData.rawText
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (err) {
      console.error("Lỗi khi thêm chương:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteChapter = async (storyId, chapterNumber) => {
    try {
      setLoading(true);
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      // Xóa chương
      await axios.delete(
        `${API_URL}/user/library/${storyId}/chapters/${chapterNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Lấy danh sách chương sau khi xóa
      const response = await axios.get(
        `${API_URL}/user/library/${storyId}/chapters`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Cập nhật số thứ tự cho các chương sau
      const chapters = response.data;
      const updatePromises = chapters
        .filter(chapter => chapter.chapterNumber > chapterNumber)
        .map(chapter => 
          axios.put(
            `${API_URL}/user/library/${storyId}/chapters/${chapter.chapterNumber}`,
            {
              chapterNumber: chapter.chapterNumber - 1
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        );

      await Promise.all(updatePromises);
      return true;
    } catch (err) {
      console.error("Lỗi khi xóa chương:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateChapterContent = async (storyId, chapterNumber, translatedTitle, translatedContent, timeTranslation = 0) => {
    try {
      // Kiểm tra và log các tham số
      console.log("📝 Cập nhật nội dung chương:", {
        storyId,
        chapterNumber,
        hasTranslatedTitle: !!translatedTitle,
        hasTranslatedContent: !!translatedContent,
        timeTranslation: timeTranslation
      });

      // Kiểm tra tham số bắt buộc
      if (!storyId) throw new Error("Thiếu storyId");
      if (!chapterNumber) throw new Error("Thiếu chapterNumber");
      
      setLoading(true);
      const response = await axios.put(
        `${API_URL}/user/library/${storyId}/chapters/${chapterNumber}/translation`,
        {
          translatedTitle: translatedTitle || '', // Tiêu đề đã dịch
          translatedContent: translatedContent || '', // Nội dung đã dịch
          timeTranslation: timeTranslation // 👉 Thêm thời gian dịch
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("✅ Cập nhật thành công:", response.data);
      return response.data;
    } catch (err) {
      console.error("Lỗi khi cập nhật nội dung chương:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        // State
        isLoggedIn,
        menu,
        loading,
        error,
        userData,
        stories,
        userApiKey,
        getAuthToken,

        // User Functions
        onLogin,
        onLogout,
        setMenu,
        updateUserProfile,
        updateAvatar,
        updateBackground,

        // API Key Functions
        addApiKey,
        removeApiKey,
        fetchApiKey,

        // Story Functions
        fetchStories,
        editStories,
        deleteStories,
        hideStories,
        createStory,
        updateChapterContent,

        // File Functions
        uploadFile,
        processFile,
        getProcessedFile,

        // Chapter Functions
        addChapter,
        deleteChapter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
