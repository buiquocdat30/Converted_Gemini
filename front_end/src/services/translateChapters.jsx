//hàm dịch toàn bộ chương
import axios from "axios";

export const translateAllChapters = async ({
  chaptersToTranslate,
  chapters,
  apiKey,
  model,
  setResults,
  setTranslatedCount,
  setTotalProgress,
  setErrorMessages,
  onTranslationResult,
  isStopped,
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

    try {
      console.log(`📖 Đang dịch chương ${i + 1}/${totalChapters}`);
      
      // Format dữ liệu gửi đi
      const requestData = {
        chapters: [{
          title: chapter.chapterName || `Chương ${originalIndex + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || originalIndex + 1
        }],
        userKey: apiKey || "",
        model: model,
      };

      console.log('Request data:', requestData);
      
      const res = await axios.post("http://localhost:8000/translate", requestData);
      console.log("Response data:", res.data);

      const translated = res?.data?.chapters?.[0]?.translated || "";
      const translatedTitle = res?.data?.chapters?.[0]?.translatedTitle || "";

      console.log("📌 Dịch chương:", {
        index: originalIndex,
        title: translatedTitle,
        content: translated
      });

      // Cập nhật kết quả dịch
      setResults((prev) => ({
        ...prev,
        [originalIndex]: {
          translated,
          translatedTitle,
          chapterName: translatedTitle || chapter.chapterName
        },
      }));

      // Gọi callback với kết quả dịch
      onTranslationResult(originalIndex, translated, translatedTitle);

      translatedCount++;
      setTranslatedCount(translatedCount);

      // Cập nhật tiến độ
      const progress = Math.floor((translatedCount / totalChapters) * 100);
      setTotalProgress(progress);

      // Xóa thông báo lỗi nếu có
      setErrorMessages((prev) => {
        const newErrors = { ...prev };
        delete newErrors[originalIndex];
        return newErrors;
      });

    } catch (error) {
      console.error(`❌ Lỗi khi dịch chương ${originalIndex + 1}:`, error);
      console.error("Error response:", error.response?.data);

      let errorMessage = `❌ Lỗi khi dịch chương ${originalIndex + 1}: ${chapter.chapterName || `Chương ${originalIndex + 1}`}`;
      if (error.response?.data?.message) {
        errorMessage += " - " + error.response.data.message;
      }

      setErrorMessages((prev) => ({ ...prev, [originalIndex]: errorMessage }));
    }

    // Thêm delay để tránh quá tải server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return translatedCount;
};
