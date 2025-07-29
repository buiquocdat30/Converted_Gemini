const { Worker, connection } = require('./queue');
const { io } = require('socket.io-client');
const { translateText } = require("../services/translateService");

const SOCKET_PORT = 8001; // Socket.io server port
const socket = io(`ws://localhost:${SOCKET_PORT}`, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('[WORKER] Đã kết nối socket server');
});

socket.on('disconnect', () => {
  console.log('[WORKER] Đã ngắt kết nối socket server');
});

socket.on('connect_error', (error) => {
  console.error('[WORKER] Lỗi kết nối socket:', error);
});

// Hàm dịch chương (tùy chỉnh lại theo luồng của bạn)
async function callTranslateAPI(chapter, model, apiKey, storyId) {
  console.log(`[WORKER] Bắt đầu dịch chương ${chapter.chapterNumber}`);
  
  // Tạo keyInfo object theo format mà translateText cần
  const keyInfo = {
    key: apiKey,
    usageId: null, // Có thể thêm usageId nếu cần
    isUserKey: true
  };

  try {
    // Gọi hàm dịch tiêu đề và nội dung
    const titleResult = chapter.title
      ? await translateText(chapter.title, keyInfo, model, 'title', storyId)
      : { translated: chapter.title };
    
    const contentResult = chapter.content
      ? await translateText(chapter.content, keyInfo, model, 'content', storyId)
      : { translated: chapter.content };

    console.log(`[WORKER] Dịch xong - Title: ${titleResult.translated?.substring(0, 50)}...`);
    console.log(`[WORKER] Dịch xong - Content: ${contentResult.translated?.substring(0, 50)}...`);

    return {
      translatedTitle: titleResult.translated,
      translatedContent: contentResult.translated,
      duration: (titleResult.duration || 0) + (contentResult.duration || 0),
      hasError: titleResult.hasError || contentResult.hasError,
      error: titleResult.error || contentResult.error
    };
  } catch (error) {
    console.error(`[WORKER] Lỗi trong callTranslateAPI:`, error);
    throw error;
  }
}

console.log(`[WORKER] Worker process started at ${new Date().toLocaleString()} | PID: ${process.pid}`);

const worker = new Worker('my-queue', async job => {
  console.log("🔄 [WORKER] ===== BẮT ĐẦU XỬ LÝ JOB =====");
  console.log(`[WORKER] 📥 Nhận job dịch chương: ${job.data.chapter?.chapterNumber}`);
  console.log("[WORKER] 📋 Job data:", {
    chapterNumber: job.data.chapter?.chapterNumber,
    model: job.data.model?.name || job.data.model,
    storyId: job.data.storyId,
    userId: job.data.userId,
    titleLength: job.data.chapter?.title?.length || 0,
    contentLength: job.data.chapter?.content?.length || 0
  });
  
  try {
    console.log("[WORKER] 🔄 Bắt đầu dịch chương...");
    const result = await callTranslateAPI(job.data.chapter, job.data.model, job.data.apiKey, job.data.storyId);
    
    console.log(`[WORKER] ✅ Dịch xong chương ${job.data.chapter?.chapterNumber}`);
    console.log("[WORKER] 📊 Kết quả dịch:", {
      chapterNumber: job.data.chapter.chapterNumber,
      hasTranslatedTitle: !!result.translatedTitle,
      hasTranslatedContent: !!result.translatedContent,
      titleLength: result.translatedTitle?.length || 0,
      contentLength: result.translatedContent?.length || 0,
      duration: result.duration,
      hasError: result.hasError
    });

    // Emit kết quả về FE qua socket với format room rõ ràng
    const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
    console.log(`[WORKER] 📤 Emit kết quả về room: ${room}`);
    
    socket.emit('chapterTranslated', {
      chapterNumber: job.data.chapter.chapterNumber,
      translatedContent: result.translatedContent,
      translatedTitle: result.translatedTitle,
      duration: result.duration,
      hasError: result.hasError,
      error: result.error,
      room: room
    });
    
    console.log("🔄 [WORKER] ===== HOÀN THÀNH JOB =====");
    return result;
  } catch (err) {
    console.error(`[WORKER] ❌ Lỗi dịch chương ${job.data.chapter?.chapterNumber}:`, err);
    
    // Emit lỗi về FE qua socket với format room rõ ràng
    const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
    console.log(`[WORKER] 📤 Emit lỗi về room: ${room}`);
    
    socket.emit('chapterTranslated', {
      chapterNumber: job.data.chapter.chapterNumber,
      error: err.message,
      hasError: true,
      room: room
    });
    
    console.log("🔄 [WORKER] ===== JOB THẤT BẠI =====");
    throw err;
  }
}, { connection });

worker.on('completed', job => {
  console.log(`[WORKER] Job ${job.id} đã hoàn thành!`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} thất bại:`, err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[WORKER] Đang đóng worker...');
  try {
    await worker.close();
    socket.disconnect();
    console.log('[WORKER] Đã đóng worker và socket');
  } catch (error) {
    console.error('[WORKER] Lỗi khi đóng worker:', error);
  }
  process.exit(0);
}); 