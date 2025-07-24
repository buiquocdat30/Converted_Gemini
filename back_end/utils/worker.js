const { Worker, connection } = require('./queue');
const { io } = require('../index');
const { translateText } = require("../services/translateService"); // Giả sử bạn có hàm này

// Hàm dịch chương (tùy chỉnh lại theo luồng của bạn)
async function callTranslateAPI(chapter, model, apiKey, storyId) {
  // Gọi hàm dịch tiêu đề và nội dung
  const titleResult = chapter.title
    ? await translateText(chapter.title, apiKey, model, 'title', storyId)
    : { translated: chapter.title };
  const contentResult = chapter.content
    ? await translateText(chapter.content, apiKey, model, 'content', storyId)
    : { translated: chapter.content };

  return {
    translatedTitle: titleResult.translated,
    translatedContent: contentResult.translated,
    duration: (titleResult.duration || 0) + (contentResult.duration || 0),
  };
}

const worker = new Worker('my-queue', async job => {
  console.log(`[WORKER] Nhận job dịch chương:`, job.data.chapter?.chapterNumber);
  try {
    const result = await callTranslateAPI(job.data.chapter, job.data.model, job.data.apiKey, job.data.storyId);
    console.log(`[WORKER] Dịch xong chương ${job.data.chapter?.chapterNumber}, emit về room ${job.data.userId || job.data.storyId}`);
    io.to(job.data.userId || job.data.storyId).emit('chapterTranslated', {
      chapterNumber: job.data.chapter.chapterNumber,
      translatedContent: result.translatedContent,
      translatedTitle: result.translatedTitle,
      duration: result.duration,
    });
    return result;
  } catch (err) {
    console.error(`[WORKER] Lỗi dịch chương ${job.data.chapter?.chapterNumber}:`, err);
    io.to(job.data.userId || job.data.storyId).emit('chapterTranslated', {
      chapterNumber: job.data.chapter.chapterNumber,
      error: err.message,
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