//hàm dịch toàn bộ chương
import axios from "axios";

// Số chương dịch song song tối đa mỗi batch
const MAX_PARALLEL = 3;

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
  let stopped = false;

  // Tạo queue các chương cần dịch
  const queue = [...chaptersToTranslate];

  // Hàm dịch 1 chương (giữ nguyên logic cũ)
  const translateOneChapter = async (chapter, i) => {
    const originalIndex = chapter.originalIndex;
    if (typeof onChapterStartProgress === 'function') {
      onChapterStartProgress(originalIndex);
    }
    try {
      console.log(`📖 [Song song] Đang dịch chương ${i + 1}/${totalChapters}`);
      const requestData = {
        chapters: [{
          title: chapter.chapterName || `Chương ${originalIndex + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || originalIndex + 1
        }],
        userKeys: Array.isArray(apiKey) ? apiKey : [apiKey],
        model: model,
      };
      const token = localStorage.getItem("auth-token");
      const res = await axios.post("http://localhost:8000/translate", requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chapterData = res?.data?.chapters?.[0];
      const translated = chapterData?.translatedContent || "";
      const translatedTitle = chapterData?.translatedTitle || "";
      const duration = chapterData?.timeTranslation || 0;
      setResults((prev) => ({
        ...prev,
        [originalIndex]: {
          translated,
          translatedTitle,
          chapterName: translatedTitle || chapter.chapterName,
          duration: duration
        },
      }));
      onTranslationResult(originalIndex, translated, translatedTitle, duration);
      setTranslatedCount((prev) => prev + 1);
      if (typeof onUpdateTotalProgress === 'function') {
        const percent = Math.floor(((translatedCount + 1) / totalChapters) * 100);
        onUpdateTotalProgress(percent);
      }
      console.log(`✅ [Song song] Dịch xong chương ${i + 1}`);
    } catch (error) {
      console.error(`❌ [Song song] Lỗi khi dịch chương ${originalIndex + 1}:`, error);
      let errorMessage = `❌ Lỗi khi dịch chương ${originalIndex + 1}: ${chapter.chapterName || `Chương ${originalIndex + 1}`}`;
      if (error.response?.data?.message) {
        errorMessage += " - " + error.response.data.message;
      }
      setErrorMessages((prev) => ({ ...prev, [originalIndex]: errorMessage }));
    }
    if (typeof onChapterStopProgress === 'function') {
      onChapterStopProgress(originalIndex);
    }
    setErrorMessages((prev) => {
      const newErrors = { ...prev };
      delete newErrors[originalIndex];
      return newErrors;
    });
  };

  // Xử lý queue theo batch song song
  let batchIndex = 0;
  while (queue.length > 0 && !stopped) {
    if (isStopped) {
      console.log('🛑 [Song song] Dừng dịch theo yêu cầu người dùng (trước batch)');
      stopped = true;
      break;
    }
    // Lấy batch chương tiếp theo
    const batch = queue.splice(0, MAX_PARALLEL);
    console.log(`🚀 [Song song] Bắt đầu batch ${batchIndex + 1}:`, batch.map(ch => ch.chapterName || ch.chapterNumber));
    // Dịch song song batch này
    await Promise.all(batch.map((chapter, idx) => translateOneChapter(chapter, batchIndex * MAX_PARALLEL + idx)));
    translatedCount += batch.length;
    if (isStopped) {
      console.log('🛑 [Song song] Dừng dịch theo yêu cầu người dùng (sau batch)');
      stopped = true;
      break;
    }
    // Thêm delay nhỏ giữa các batch để tránh quá tải server
    await new Promise(resolve => setTimeout(resolve, 500));
    batchIndex++;
  }

  // Đảm bảo progress tổng lên 100% khi xong
  if (typeof onUpdateTotalProgress === 'function') {
    onUpdateTotalProgress(100);
  }
  console.log('🎉 [Song song] Dịch xong toàn bộ hoặc đã dừng.');
  return translatedCount;
};
