//hàm dịch toàn bộ chương
import axios from "axios";

export const translateAllChapters = async ({
  chaptersToTranslate,
  chapters,
  apiKey,
  model,
  setResults,
  setTranslatedCount,
  setErrorMessages,
  onTranslationResult,
  isStopped,
  onChapterStartProgress,
  onChapterStopProgress,
  onUpdateTotalProgress,
}) => {
  const totalChapters = chaptersToTranslate.length;
  let translatedCount = 0;

  for (let i = 0; i < totalChapters; i++) {
    if (isStopped) {
      console.log("🛑 Dừng dịch theo yêu cầu người dùng");
      break;
    }

    const chapter = chaptersToTranslate[i];
    const originalIndex = chapter.originalIndex;

    // Bắt đầu progress từng chương
    if (typeof onChapterStartProgress === 'function') {
      onChapterStartProgress(originalIndex);
    }

    try {
      console.log(`📖 Đang dịch chương ${i + 1}/${totalChapters}`);
      
      // Format dữ liệu gửi đi - hỗ trợ cả single key và multiple keys
      const requestData = {
        chapters: [{
          title: chapter.chapterName || `Chương ${originalIndex + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || originalIndex + 1
        }],
        userKeys: Array.isArray(apiKey) ? apiKey : [apiKey], // Luôn gửi dưới dạng array
        model: model,
      };

      console.log('Request data:', requestData);
      
      const token = localStorage.getItem("auth-token");
      const res = await axios.post("http://localhost:8000/translate", requestData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log("Response data:", res.data);

      const chapterData = res?.data?.chapters?.[0];
      const translated = chapterData?.translatedContent || "";
      const translatedTitle = chapterData?.translatedTitle || "";
      const duration = chapterData?.timeTranslation || 0;

      console.log("📌 Dịch chương:", {
        index: originalIndex,
        title: translatedTitle,
        content: translated,
        duration: duration.toFixed(2) + "s"
      });

      // Cập nhật kết quả dịch
      setResults((prev) => ({
        ...prev,
        [originalIndex]: {
          translated,
          translatedTitle,
          chapterName: translatedTitle || chapter.chapterName,
          duration: duration
        },
      }));

      // Gọi callback với kết quả dịch
      onTranslationResult(originalIndex, translated, translatedTitle, duration);

      translatedCount++;
      setTranslatedCount(translatedCount);

      // Cập nhật tiến độ tổng thực tế
      if (typeof onUpdateTotalProgress === 'function') {
        const percent = Math.floor((translatedCount / totalChapters) * 100);
        onUpdateTotalProgress(percent);
      }

    } catch (error) {
      console.error(`❌ Lỗi khi dịch chương ${originalIndex + 1}:`, error);
      console.error("Error response:", error.response?.data);

      let errorMessage = `❌ Lỗi khi dịch chương ${originalIndex + 1}: ${chapter.chapterName || `Chương ${originalIndex + 1}`}`;
      if (error.response?.data?.message) {
        errorMessage += " - " + error.response.data.message;
      }

      setErrorMessages((prev) => ({ ...prev, [originalIndex]: errorMessage }));
    }

    // Kết thúc progress từng chương
    if (typeof onChapterStopProgress === 'function') {
      onChapterStopProgress(originalIndex);
    }

    translatedCount++;
    setTranslatedCount(translatedCount);

    // Cập nhật tiến độ tổng thực tế
    if (typeof onUpdateTotalProgress === 'function') {
      const percent = Math.floor((translatedCount / totalChapters) * 100);
      onUpdateTotalProgress(percent);
    }

    // Xóa thông báo lỗi nếu có
    setErrorMessages((prev) => {
      const newErrors = { ...prev };
      delete newErrors[originalIndex];
      return newErrors;
    });

    // Thêm delay để tránh quá tải server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Đảm bảo progress tổng lên 100% khi xong
  if (typeof onUpdateTotalProgress === 'function') {
    onUpdateTotalProgress(100);
  }

  return translatedCount;
};
