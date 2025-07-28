const { Worker, connection } = require('./queue');
const { io } = require('../index');
const { translateText } = require("../services/translateService");

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
  console.log(`[WORKER] Nhận job dịch chương:`, job.data.chapter?.chapterNumber);
  console.log(`[WORKER] Job data:`, {
    chapterNumber: job.data.chapter?.chapterNumber,
    model: job.data.model,
    storyId: job.data.storyId,
    userId: job.data.userId
  });
  
  try {
    const result = await callTranslateAPI(job.data.chapter, job.data.model, job.data.apiKey, job.data.storyId);
    
    console.log(`[WORKER] Dịch xong chương ${job.data.chapter?.chapterNumber}, emit về room ${job.data.userId || job.data.storyId}`);
    console.log(`[WORKER] Kết quả emit:`, {
      chapterNumber: job.data.chapter.chapterNumber,
      hasTranslatedTitle: !!result.translatedTitle,
      hasTranslatedContent: !!result.translatedContent,
      duration: result.duration,
      hasError: result.hasError
    });

    // Emit kết quả về FE
    io.to(job.data.userId || job.data.storyId).emit('chapterTranslated', {
      chapterNumber: job.data.chapter.chapterNumber,
      translatedContent: result.translatedContent,
      translatedTitle: result.translatedTitle,
      duration: result.duration,
      hasError: result.hasError,
      error: result.error
    });
    
    return result;
  } catch (err) {
    console.error(`[WORKER] Lỗi dịch chương ${job.data.chapter?.chapterNumber}:`, err);
    
    // Emit lỗi về FE
    io.to(job.data.userId || job.data.storyId).emit('chapterTranslated', {
      chapterNumber: job.data.chapter.chapterNumber,
      error: err.message,
      hasError: true
    });
    
    throw err;
  }
}, { connection });

worker.on('completed', job => {
  console.log(`[WORKER] Job ${job.id} đã hoàn thành!`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} thất bại:`, err);
}); 