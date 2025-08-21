import React, { useState, useContext, useEffect, useCallback } from "react";
import UploadForm from "../components/UploadForm/UploadForm";
import TranslatorApp from "../components/TranslatorApp/TranslatorApp";
import StoryInfoForm from "../components/StoryInfoForm/StoryInfoForm";
import { AuthContext } from "../context/ConverteContext";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import UserStoryCard from "../components/UserStoryCard/UserStoryCard";
import "../pages/pageCSS/Translate.css";
import { FaBook, FaHistory, FaSpinner } from "react-icons/fa";

import db, { addChapters, getChaptersByStoryIdAndRange, clearChapters } from '../services/indexedDBService';


const Translate = () => {
  const {
    isLoggedIn,
    stories,
    fetchStories,
    editStories,
    hideStories,
    deleteStories,
    addChapter,
    deleteChapter,
    getAuthToken,
    updateChapterContent,
    isDarkMode,
  } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("new");
  const [chapters, setChapters] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [currentStory, setCurrentStory] = useState(null);
  const [fileName, setFileName] = useState("");
  const [searchParams] = useSearchParams();
  const [translatingStories, setTranslatingStories] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    console.log('[Translate.jsx] 📊 Loading state changed:', loading);
  }, [loading]);
  const [error, setError] = useState(null);

  // Thêm state cho phân trang chương
  const [currentPage, setCurrentPage] = useState(1);
  const chaptersPerPage = 10; // Giữ nguyên 10 chương mỗi trang như ChapterList
  const [totalStoryChapters, setTotalStoryChapters] = useState(0); // Thêm state để lưu tổng số chương của truyện

  // Tải truyện đang dịch dựa vào storyId từ URL
  const loadTranslatingStory = useCallback(async (storyId, page, limit) => {
    setError(null);
    setLoading(true); // Bật loading ngay khi bắt đầu tải (dù từ cache hay BE)

    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        console.error("❌ Không tìm thấy token xác thực");
        alert("Vui lòng đăng nhập lại để tiếp tục");

        setLoading(false);

        return;
      }

      console.log(`[Translate.jsx] 🚀 Đang tải truyện: storyId=${storyId}, page=${page}, limit=${limit}`);


      const startChapterNumber = (page - 1) * limit + 1;
      const endChapterNumber = page * limit;

      // 1. Cố gắng lấy chương từ IndexedDB trước
      let cachedChapters = await getChaptersByStoryIdAndRange(storyId, startChapterNumber, endChapterNumber);
      console.log(`[Translate.jsx] 📥 cachedChapters:`, cachedChapters); // Giữ log này để kiểm tra nội dung

      if (cachedChapters && cachedChapters.length > 0) {
        console.log(`[Translate.jsx] ✅ Tìm thấy ${cachedChapters.length} chương trong IndexedDB cho trang ${page}, story ${storyId}. Hiển thị từ cache.`);
        const formattedCachedChapters = cachedChapters.map((chapter) => ({
          id: chapter.id,
          chapterName: chapter.chapterName,
          title: chapter.chapterName,
          content: chapter.translatedContent || chapter.rawText || "",
          translated: chapter.translatedContent || "",
          translatedTitle: chapter.translatedTitle || chapter.chapterName,
          chapterNumber: chapter.chapterNumber,
          rawText: chapter.rawText || "",
          status: chapter.status,
          hasError: chapter.hasError,
          translationError: chapter.translationError,
        }));
        setChapters(formattedCachedChapters);
        console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ cache:`, formattedCachedChapters.map(ch => ch.chapterName));
        setLoading(false); // Tắt loading ngay lập tức nếu dữ liệu từ cache có sẵn

        // Tiếp tục gọi Backend để lấy dữ liệu mới nhất trong nền (không await)
        axios.get(
          `http://localhost:8000/user/library/${storyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).then(storyInfoResponse => {
          if (storyInfoResponse.data) {
            setCurrentStory(storyInfoResponse.data);
          }
        }).catch(error => console.error("❌ Lỗi khi lấy thông tin truyện trong nền:", error));

        axios.get(
          `http://localhost:8000/user/library/${storyId}/chapters?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).then(chaptersResponse => {
          console.log("[Translate.jsx] 📥 Phản hồi chương từ BE (nền):", chaptersResponse.data);
          setTotalStoryChapters(chaptersResponse.data.totalChaptersCount || 0);
          const rawChapters = chaptersResponse.data && Array.isArray(chaptersResponse.data.chapters)
            ? chaptersResponse.data.chapters
            : [];
          const formattedChapters = rawChapters.map((chapter) => ({
            id: chapter.id,
            chapterName: chapter.chapterName,
            title: chapter.chapterName,
            content: chapter.translation
              ? chapter.translation.translatedContent
              : chapter.rawText || "",
            translated: chapter.translation?.translatedContent || "",
            translatedTitle:
              chapter.translation?.translatedTitle || chapter.chapterName,
            chapterNumber: chapter.chapterNumber,
            rawText: chapter.rawText || "",
            status: chapter.status,
            hasError: chapter.hasError,
            translationError: chapter.translationError,
          }));

          const needsUpdate = !cachedChapters || cachedChapters.length !== formattedChapters.length || 
                              !cachedChapters.every((c, i) => 
                                c.translatedContent === formattedChapters[i].translatedContent && 
                                c.translatedTitle === formattedChapters[i].translatedTitle &&
                                c.rawText === formattedChapters[i].rawText
                              );

          if (needsUpdate) {
            console.log(`[Translate.jsx] 🔄 Dữ liệu từ Backend khác hoặc không có cache. Cập nhật IndexedDB và UI (nền).`);
            db.transaction('rw', db.chapters, async () => {
              await db.chapters.where({ storyId: storyId })
                        .and(chapter => chapter.chapterNumber >= startChapterNumber && chapter.chapterNumber <= endChapterNumber)
                        .delete();
              await db.chapters.bulkAdd(formattedChapters);
            }).then(() => {
              console.log(`[Translate.jsx] ✅ Cập nhật IndexedDB thành công trong transaction (nền).`);
              setChapters(formattedChapters); // Cập nhật chapters với dữ liệu từ BE
              console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (nền):`, formattedChapters.map(ch => ch.chapterName));
            }).catch(dbError => console.error("❌ Lỗi Transaction IndexedDB (nền):", dbError));

          } else {
            console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật (nền).`);
            setChapters(formattedChapters); // Dữ liệu khớp, nhưng vẫn cần cập nhật state chapters với dữ liệu từ BE để đảm bảo tính đồng bộ
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (dữ liệu khớp cache, nền):`, formattedChapters.map(ch => ch.chapterName));
          }
        }).catch(error => console.error("❌ Lỗi khi tải chương từ Backend trong nền:", error));

        return; // Thoát khỏi hàm nếu đã tải từ cache
      } else {
        console.log(`[Translate.jsx] ⏳ Không tìm thấy chương trong IndexedDB cho trang ${page}, story ${storyId}. Đang tải từ Backend.`);
        // Phần này sẽ chờ backend response và xử lý như bình thường
        const storyInfoResponse = await axios.get(
          `http://localhost:8000/user/library/${storyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!storyInfoResponse.data) {
          console.error("❌ Không nhận được dữ liệu truyện");
          alert("Không thể tải thông tin truyện. Vui lòng thử lại sau.");
          setLoading(false);
          return;
        }
        setCurrentStory(storyInfoResponse.data);

        const chaptersResponse = await axios.get(
          `http://localhost:8000/user/library/${storyId}/chapters?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("[Translate.jsx] 📥 Phản hồi chương từ BE:", chaptersResponse.data);

        const rawChapters = chaptersResponse.data && Array.isArray(chaptersResponse.data.chapters)
          ? chaptersResponse.data.chapters
          : [];

        setTotalStoryChapters(chaptersResponse.data.totalChaptersCount || 0);
        console.log(`[Translate.jsx] 📊 totalStoryChapters đã cập nhật thành: ${chaptersResponse.data.totalChaptersCount || 0}`);

        if (rawChapters.length === 0) {
          console.warn("⚠️ Truyện không có chương nào hoặc dữ liệu chương trống.", storyId);
        }

        const formattedChapters = rawChapters.map((chapter) => ({
          id: chapter.id,
          chapterName: chapter.chapterName,
          title: chapter.chapterName,
          content: chapter.translation
            ? chapter.translation.translatedContent
            : chapter.rawText || "",
          translated: chapter.translation?.translatedContent || "",
          translatedTitle:
            chapter.translation?.translatedTitle || chapter.chapterName,
          chapterNumber: chapter.chapterNumber,
          rawText: chapter.rawText || "",
          status: chapter.status,
          hasError: chapter.hasError,
          translationError: chapter.translationError,
        }));

        const needsUpdate = !cachedChapters || cachedChapters.length !== formattedChapters.length || 
                            !cachedChapters.every((c, i) => 
                              c.translatedContent === formattedChapters[i].translatedContent && 
                              c.translatedTitle === formattedChapters[i].translatedTitle &&
                              c.rawText === formattedChapters[i].rawText
                            );

        if (needsUpdate) {
          console.log(`[Translate.jsx] 🔄 Dữ liệu từ Backend khác hoặc không có cache. Cập nhật IndexedDB và UI.`);
          try {
            console.log(`[Translate.jsx] 🔑 Đang chạy transaction để cập nhật IndexedDB.`);
            await db.transaction('rw', db.chapters, async () => {
              await db.chapters.where({ storyId: storyId })
                        .and(chapter => chapter.chapterNumber >= startChapterNumber && chapter.chapterNumber <= endChapterNumber)
                        .delete();
              await db.chapters.bulkAdd(formattedChapters);
            });
            console.log(`[Translate.jsx] ✅ Cập nhật IndexedDB thành công trong transaction.`);
            setChapters(formattedChapters); // Cập nhật chapters với dữ liệu từ BE
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend:`, formattedChapters.map(ch => ch.chapterName));
          } catch (dbError) {
            console.error("❌ Lỗi Transaction IndexedDB:", dbError);
            setChapters(formattedChapters); // Fallback: vẫn update UI với BE data
            console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (fallback):`, formattedChapters.map(ch => ch.chapterName));
          }

        } else {
          console.log(`[Translate.jsx] ✅ Dữ liệu từ Backend khớp với cache. Không cần cập nhật.`);
          setChapters(formattedChapters); // Dữ liệu khớp, nhưng vẫn cần cập nhật state chapters với dữ liệu từ BE để đảm bảo tính đồng bộ
          console.log(`[Translate.jsx] 📝 Đã hiển thị chương từ Backend (dữ liệu khớp cache):`, formattedChapters.map(ch => ch.chapterName));
        }

        setLoading(false); // Tắt loading sau khi toàn bộ quá trình tải từ Backend hoàn tất
      }
      console.timeEnd('Load and Display Chapters');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("❌ Lỗi khi tải truyện đang dịch:", error);
      console.error("Chi tiết lỗi:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = "Không thể tải thông tin truyện. ";
      if (error.response?.status === 401) {
        errorMessage += "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.status === 404) {
        errorMessage += "Không tìm thấy truyện.";
      } else if (error.response?.status === 500) {
        errorMessage += "Lỗi server. Vui lòng thử lại sau.";
      }

      alert(errorMessage);

      setLoading(false);
      setError(error);

    }
  }, [setLoading, setError, setChapters, setCurrentStory, setTotalStoryChapters, db, getChaptersByStoryIdAndRange, axios]);

  useEffect(() => {
    const storyId = searchParams.get("storyId");
    const tab = searchParams.get("tab");

    // Nếu có tab trong URL, set active tab
    if (tab === "translating") {
      setActiveTab("translating");
    }

    if (storyId) {
      loadTranslatingStory(storyId, currentPage, chaptersPerPage);
    }
  }, [searchParams, loadTranslatingStory]); // Đã loại bỏ currentPage và chaptersPerPage khỏi dependencies

  useEffect(() => {
    if (isLoggedIn) {
      fetchStories();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (stories) {
      // Lọc các truyện đang dịch (isComplete == false)
      const translatingStories = stories.filter((story) => !story.isComplete);
      setTranslatingStories(translatingStories);
    }
  }, [stories]);

  // Xử lý khi chuyển tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Nếu chuyển sang tab "new", xóa storyId khỏi URL
    if (tab === "new") {
      const newUrl = window.location.pathname;
      window.history.pushState({}, "", newUrl);
      setCurrentStory(null);
      setChapters([]);
      // Reset currentPage về 1 khi chuyển tab
      setCurrentPage(1);
    }
  };

  // Xử lý khi nhận được chapters từ UploadForm
  const handleParsedChapters = (parsedChapters, key, model) => {
    console.log("✔️ Nhận được từ UploadForm:", { parsedChapters, key, model });
    setChapters(parsedChapters);
    setApiKey(key);
    setModel(model);
    // Khi parse file mới, reset currentPage về 1
    setCurrentPage(1);
  };

  // Cập nhật nội dung chương đã dịch
  const handleUpdateChapterContent = async (storyId, chapterNumber, translatedTitle, translatedContent, timeTranslation = 0) => {
    try {
      // Log để debug
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
      
      // Gọi API cập nhật
      const response = await updateChapterContent(
        storyId,
        chapterNumber,
        translatedTitle,
        translatedContent,
        timeTranslation
      );

      // Sau khi cập nhật thành công, xóa chương này khỏi cache Redis ở backend
      // Bằng cách gọi lại hàm loadTranslatingStory để nó lấy dữ liệu mới từ DB
      // và cập nhật lại cache
      await loadTranslatingStory(storyId, currentPage, chaptersPerPage);

      console.log("✅ Cập nhật thành công:", response);
      return response;
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật nội dung chương:", {
        error: err.message,
        storyId,
        chapterNumber,
        status: err.response?.status,
        data: err.response?.data
      });
      throw err;
    }
  };

  // Lưu truyện mới
  const handleSaveStory = async (storyInfo) => {
    try {
      console.time('Save Story to Backend'); // Start timer for saving story
      const token = localStorage.getItem("auth-token");
      const chaptersToSend = chapters.map((ch) => ({
        chapterName: ch.chapterName,
        rawText: ch.content,
      }));
      console.log(`[Translate.jsx] 📦 Đang gửi ${chaptersToSend.length} chương lên Backend...`);

      const response = await axios.post(
        "http://localhost:8000/user/library",
        {
          ...storyInfo,
          chapters: chaptersToSend,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.timeEnd('Save Story to Backend'); // End timer for saving story
      setCurrentStory(response.data);
      // Sau khi lưu truyện thành công, chuyển sang tab "translating" và load truyện đó
      navigate(`/translate?storyId=${response.data.id}&tab=translating`);
      setActiveTab("translating");
      // Tải lại chapters cho truyện vừa lưu (trang 1)
      loadTranslatingStory(response.data.id, 1, chaptersPerPage);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lưu truyện:", error);
      throw error;
    }
  };

  // Cập nhật thông tin truyện
  const handleUpdateStoryInfo = async (storyInfo) => {
    try {
      const token = localStorage.getItem("auth-token");
      console.log("🔄 Đang cập nhật truyện:", currentStory.id);
      console.log("📋 Thông tin cập nhật:", storyInfo);

      const response = await axios.put(
        `http://localhost:8000/user/library/${currentStory.id}`,
        storyInfo,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("✅ Cập nhật thành công:", response.data);
      // Cập nhật currentStory với dữ liệu mới
      setCurrentStory(prev => ({...prev, ...storyInfo}));
      return response.data;
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật truyện:", error);
      throw error;
    }
  };

  // Cập nhật một trường cụ thể của truyện
  const handleUpdateStoryField = (storyId, field, value) => {
    editStories(storyId, field, value);
    // Cập nhật state local sau khi API call thành công
    setTranslatingStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, [field]: value } : story
      )
    );
    // Nếu đang xem truyện đó, cập nhật luôn currentStory
    if (currentStory && currentStory.id === storyId) {
      setCurrentStory(prev => ({...prev, [field]: value}));
    }
  };

  // Ẩn truyện (xóa mềm)
  const handleHideStory = async (storyId) => {
    await hideStories(storyId);
    // Cập nhật state local sau khi ẩn thành công
    setTranslatingStories((prevStories) =>
      prevStories.filter((story) => story.id !== storyId)
    );
    // Nếu truyện đang được chọn là truyện bị ẩn, reset currentStory và chapters
    if (currentStory && currentStory.id === storyId) {
      setCurrentStory(null);
      setChapters([]);
      navigate("/translate"); // Quay về trang chính của tab translating
    }
  };

  // Xóa truyện vĩnh viễn (xóa cứng)
  const handleDeleteStory = async (storyId) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn truyện này? Hành động này không thể hoàn tác."
      )
    ) {
      await deleteStories(storyId);

      // Xóa cache IndexedDB cho truyện này
      await clearChapters(storyId);

      // Cập nhật state local sau khi xóa thành công
      setTranslatingStories((prevStories) =>
        prevStories.filter((story) => story.id !== storyId)
      );
      // Nếu truyện đang được chọn là truyện bị xóa, reset currentStory và chapters
      if (currentStory && currentStory.id === storyId) {
        setCurrentStory(null);
        setChapters([]);
        navigate("/translate"); // Quay về trang chính của tab translating
      }
    }
  };

  // Xử lý khi click vào một truyện
  const handleStoryClick = (storyId) => {
    console.time('Load and Display Chapters'); // Start timer
    // Cập nhật URL với storyId
    navigate(`/translate?storyId=${storyId}&tab=translating`);
    // Set tab translating active
    setActiveTab("translating");
    // Load truyện được chọn (trang 1)
    loadTranslatingStory(storyId, 1, chaptersPerPage);
  };

  // Thêm hàm để tải lại dữ liệu sau khi thêm chương
  const handleChapterAdded = async () => {
    if (currentStory?.id) {
      // Tải lại chương hiện tại để cập nhật danh sách
      await loadTranslatingStory(currentStory.id, currentPage, chaptersPerPage);
    }
  };

  // Hàm xử lý khi chuyển trang trong ChapterList
  const handlePageChangeInChapterList = useCallback(async (newPage) => {
    setCurrentPage(newPage);
    if (currentStory?.id) {
      await loadTranslatingStory(currentStory.id, newPage, chaptersPerPage);
    }
  }, [currentStory?.id, chaptersPerPage]);

  // Render nội dung Translator
  const renderTranslatorContent = () => {
    if (activeTab === "new") {
      return (
        <UploadForm
          onParsedChapters={handleParsedChapters}
          onSaveStory={handleSaveStory}
        />
      );
    } else {
      return (
        <TranslatorApp
          apiKey={apiKey}
          chapters={chapters}
          setChapters={setChapters}
          model={model}
          setModel={setModel}
          onUpdateChapter={handleUpdateChapterContent}
          onSelectChapter={() => {}}
          addChapter={addChapter}
          storyId={currentStory?.id}
          getAuthToken={getAuthToken}
          onChapterAdded={handleChapterAdded}
          deleteChapter={deleteChapter}
          currentStory={currentStory}
          currentPage={currentPage} // Truyền currentPage xuống
          chaptersPerPage={chaptersPerPage} // Truyền chaptersPerPage xuống
          onPageChange={handlePageChangeInChapterList} // Truyền hàm xử lý chuyển trang xuống
          totalStoryChapters={totalStoryChapters} // Truyền tổng số chương của truyện
        />
      );
    }
  };

  if (!isLoggedIn) {
    return (
      <div>
        {chapters.length === 0 ? (
          <UploadForm onFileParsed={handleParsedChapters} />
        ) : (
          <TranslatorApp
            apiKey={apiKey}
            chapters={chapters}
            model={model}
            setChapters={setChapters}
            onUpdateChapter={handleUpdateChapterContent}
            currentStory={currentStory}
            getAuthToken={getAuthToken}
            currentPage={currentPage} // Truyền currentPage xuống
            chaptersPerPage={chaptersPerPage} // Truyền chaptersPerPage xuống
            onPageChange={handlePageChangeInChapterList} // Truyền hàm xử lý chuyển trang xuống
          />
        )}
      </div>
    );
  }

  return (
    <div className={`translate-page ${isDarkMode ? "dark" : ""}`}>
      <div className="translate-tabs">
        <button
          className={`tab-button ${activeTab === "new" ? "active" : ""}`}
          onClick={() => handleTabChange("new")}
        >
          Dịch truyện mới
        </button>
        <button
          className={`tab-button ${
            activeTab === "translating" ? "active" : ""
          }`}
          onClick={() => handleTabChange("translating")}
        >
          Truyện đang dịch
        </button>
        {activeTab === "translating" && currentStory && (
          <button
            className="tab-button"
            onClick={() => {
              setActiveTab("translating");
              // Khi bấm quay lại, load lại danh sách truyện đang dịch
              setCurrentStory(null);
              setChapters([]);
              // Xóa storyId khỏi URL
              navigate("/translate");
              // Reset currentPage về 1
              setCurrentPage(1);
            }}
          >
            Quay lại chọn truyện
          </button>
        )}
      </div>
      <div className="tab-content">
        {loading && ( // Thêm conditional rendering cho loading indicator
          <div className="loading-overlay">
            <FaSpinner className="spinner" />
            <p>Đang tải chương truyện...</p>
          </div>
        )}
        {activeTab === "new" ? (
          renderTranslatorContent()
        ) : (
          <div className="translating-stories">
            {currentStory ? (
              renderTranslatorContent()
            ) : (
              <div className="stories-grid">
                {translatingStories.length === 0 ? (
                  <p>Chưa có truyện nào đang dịch</p>
                ) : (
                  translatingStories.map((story) => (
                    <div
                      className="tr-story-card"
                      key={story.id}
                      onClick={() => handleStoryClick(story.id)}
                    >
                      <UserStoryCard
                        story={story}
                        onHide={() => handleHideStory(story.id)}
                        onDelete={() => handleDeleteStory(story.id)}
                        onUpdate={handleUpdateStoryField}
                        showCompleteButton={false}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Translate;
