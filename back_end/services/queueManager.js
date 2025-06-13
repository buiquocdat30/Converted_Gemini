const Queue = require('bull');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { translateText } = require('./translateService');

// Khởi tạo Redis connection
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
};

// Tạo các queue
const translationQueue = new Queue('translation', redisConfig);

// Cấu hình Bull Board
const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(translationQueue)],
  serverAdapter: serverAdapter,
});

// Xử lý job translation
translationQueue.process(async (job) => {
  const { chapter, apiKey, model } = job.data;
  
  try {
    console.log(`🔄 Đang xử lý job ${job.id} - Chương ${chapter.chapterNumber}`);
    
    // Gọi service dịch
    const translated = await translateText(chapter.content, apiKey, model);
    
    return {
      success: true,
      translatedContent: translated,
      chapterNumber: chapter.chapterNumber
    };
  } catch (error) {
    console.error(`❌ Lỗi khi xử lý job ${job.id}:`, error);
    throw error;
  }
});

// Xử lý các sự kiện của queue
translationQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} hoàn thành:`, result);
});

translationQueue.on('failed', (job, error) => {
  console.error(`❌ Job ${job.id} thất bại:`, error);
});

translationQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} bị treo`);
});

// Export các hàm cần thiết
module.exports = {
  translationQueue,
  serverAdapter,
  addQueue,
  removeQueue,
  setQueues,
  replaceQueues
}; 