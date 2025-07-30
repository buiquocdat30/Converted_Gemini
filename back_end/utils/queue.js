const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // BẮT BUỘC cho BullMQ!
});

console.log('[QUEUE] Initializing BullMQ queue with dynamic rate limiter');
const myQueue = new Queue('my-queue', {
  connection,
  limiter: {
    max: 60, // Tăng lên để phù hợp với các model có RPM cao
    duration: 60000, // 1 phút
  }
});

module.exports = { myQueue, connection, Worker }; 