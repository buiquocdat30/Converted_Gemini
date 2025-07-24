//hàm dịch toàn bộ chương
import axios from "axios";

// Số chương dịch song song tối đa mỗi batch
// const MAX_PARALLEL = 3; // Không dùng nữa, dịch tuần tự

// Lưu batch đã bị huỷ
let cancelledBatchIndexes = new Set();

export const translateAllChapters = async ({
  chaptersToTranslate,
  chapters,
  apiKey,
  model,
  storyId,
  setResults,
  setTranslatedCount,
  setErrorMessages,
  onTranslationResult,
  isStopped,
  onChapterStartProgress,
  onChapterStopProgress,
  onUpdateTotalProgress,
  getChapterStatus,
  onBatchCancel, // callback khi batch bị cancel
}) => {
  const totalChapters = chaptersToTranslate.length;
  let translatedCount = 0;
  let stopped = false;

  // Tạo queue các chương cần dịch
  const queue = [...chaptersToTranslate];

  // Hàm dịch 1 chương (giữ nguyên logic cũ, thêm batchIndex)
  const translateOneChapter = async (chapter, i, batchIndex) => {
    const originalIndex = chapter.originalIndex;
    // Set trạng thái PENDING trước khi bắt đầu dịch
    if (typeof window.setChapterStatusGlobal === 'function') {
      window.setChapterStatusGlobal(originalIndex, 'PENDING');
    }
    if (typeof onChapterStartProgress === 'function') {
      onChapterStartProgress(originalIndex);
    }
    try {
      // Set trạng thái PROCESSING ngay trước khi gửi request
      if (typeof window.setChapterStatusGlobal === 'function') {
        window.setChapterStatusGlobal(originalIndex, 'PROCESSING');
      }
      // Nếu batch đã bị cancel, bỏ qua luôn
      if (cancelledBatchIndexes.has(batchIndex)) {
        if (typeof onChapterStopProgress === 'function') {
          onChapterStopProgress(originalIndex);
        }
        return { success: false };
      }
      console.log(`📖 [Song song] Đang dịch chương ${i + 1}/${totalChapters}`);
      const modelToSend = (model && typeof model === 'object' && model.value) ? model.value : model;
      console.log('[translateAllChapters] Gửi model lên backend:', modelToSend);
      const requestData = {
        chapters: [{
          title: chapter.chapterName || `Chương ${originalIndex + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || originalIndex + 1
        }],
        userKeys: Array.isArray(apiKey) ? apiKey : [apiKey],
        model: modelToSend,
        storyId: storyId,
      };
      const token = localStorage.getItem("auth-token");
      const res = await axios.post("http://localhost:8000/translate", requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Nếu batch đã bị cancel sau khi gửi request, bỏ qua luôn
      if (cancelledBatchIndexes.has(batchIndex)) {
        if (typeof onChapterStopProgress === 'function') {
          onChapterStopProgress(originalIndex);
        }
        return { success: false };
      }
      const chapterData = res?.data?.chapters?.[0];
      const translated = chapterData?.translatedContent || "";
      const translatedTitle = chapterData?.translatedTitle || "";
      const duration = chapterData?.timeTranslation || 0;
      if (getChapterStatus) {
        try {
          const status = await getChapterStatus(originalIndex);
          if (status === "CANCELLED") {
            console.warn(`[LOG] Chương ${originalIndex} đã CANCELLED (realtime), bỏ qua cập nhật kết quả.`);
            if (typeof onChapterStopProgress === 'function') {
              onChapterStopProgress(originalIndex);
            }
            return { success: false };
          }
        } catch (error) {
          console.warn(`[LOG] Lỗi khi kiểm tra trạng thái chương ${originalIndex}:`, error);
        }
      }
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
      
      // Set trạng thái COMPLETE khi dịch thành công
      if (typeof window.setChapterStatusGlobal === 'function') {
        window.setChapterStatusGlobal(originalIndex, 'COMPLETE');
      }
      if (typeof onChapterStopProgress === 'function') {
        onChapterStopProgress(originalIndex);
      }
      
      setTranslatedCount((prev) => prev + 1);
      if (typeof onUpdateTotalProgress === 'function') {
        const percent = Math.floor(((translatedCount + 1) / totalChapters) * 100);
        onUpdateTotalProgress(percent);
      }
      return { success: true };
    } catch (error) {
      if (typeof onChapterStopProgress === 'function') {
        onChapterStopProgress(originalIndex);
      }
      // Set trạng thái FAILED khi có lỗi
      if (typeof window.setChapterStatusGlobal === 'function') {
        window.setChapterStatusGlobal(originalIndex, 'FAILED');
      }
      setErrorMessages((prev) => ({ ...prev, [originalIndex]: `❌ Lỗi khi dịch chương ${originalIndex + 1}` }));
      return { success: false };
    }
  };

  // Dịch tuần tự từng chương, mỗi request cách nhau 60/rpm giây
  const rpm = (model && typeof model === 'object' && model.rpm) ? model.rpm : 1;
  const delayMs = Math.ceil(60000 / rpm);
  let chapterIndex = 0;
  while (queue.length > 0 && !stopped) {
    if (isStopped) {
      console.log('🛑 [Tuần tự] Dừng dịch theo yêu cầu người dùng');
      stopped = true;
      break;
    }
    const chapter = queue.shift();
    await translateOneChapter(chapter, chapterIndex, chapterIndex);
    chapterIndex++;
    if (queue.length > 0 && !stopped) {
      console.log(`[DELAY] Chờ ${delayMs / 1000}s trước khi dịch chương tiếp theo (rpm=${rpm})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Đảm bảo progress tổng lên 100% khi xong
  if (typeof onUpdateTotalProgress === 'function') {
    onUpdateTotalProgress(100);
  }
  cancelledBatchIndexes.clear(); // reset cho lần dịch sau
  return translatedCount;
};
