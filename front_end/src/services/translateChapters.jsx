//hàm dịch toàn bộ chương
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from '../config/config';

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
  onBatchCancel,
  userData, // Thêm userData parameter
}) => {
  const totalChapters = chaptersToTranslate.length;
  let translatedCount = 0;

  console.log(`📖 [ALL-QUEUE] Bắt đầu dịch ${totalChapters} chương qua Queue`);

  try {
    // Gửi request để thêm jobs vào queue
    const modelToSend = model; // Gửi toàn bộ model object
    console.log('[ALL-QUEUE] Gửi model object lên backend:', modelToSend);
    
    const requestData = {
      chapters: chaptersToTranslate.map(ch => ({
        title: ch.chapterName || `Chương ${ch.originalIndex + 1}`,
        content: ch.rawText || ch.content,
        chapterNumber: ch.chapterNumber || ch.originalIndex + 1
      })),
      userKeys: Array.isArray(apiKey) ? apiKey : [apiKey],
      model: modelToSend, // Gửi toàn bộ model object
      storyId: storyId,
      userId: userData.id, // Thêm userId cho room
      isBatchTranslation: true // Flag để biết đây là dịch batch
    };

    console.log(`[ALL-QUEUE] 📤 Gửi ${requestData.chapters.length} chương vào Queue`);

    const token = localStorage.getItem("auth-token");
    const res = await axios.post(API_URL + "/translate/queue", requestData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`[ALL-QUEUE] 📥 Nhận response từ Queue API:`, {
      success: res.data.success,
      jobCount: res.data.jobCount,
      message: res.data.message
    });

    if (res.data.success) {
      console.log(`[ALL-QUEUE] ✅ Đã thêm ${res.data.jobCount} jobs vào queue`);
      console.log(`[ALL-QUEUE] 🎧 Đang chờ kết quả qua Socket...`);
      
      // Jobs đã được thêm vào queue, Worker sẽ xử lý
      // FE sẽ nhận kết quả qua Socket.io
      return res.data.jobCount;
    } else {
      throw new Error(res.data.message || 'Lỗi khi thêm jobs vào queue');
    }

  } catch (error) {
    console.error(`[ALL-QUEUE] ❌ Lỗi dịch all chương qua Queue:`, error);
    setErrorMessages((prev) => ({ ...prev, general: `❌ Lỗi khi dịch tất cả chương: ${error.message}` }));
    return 0;
  }
};
