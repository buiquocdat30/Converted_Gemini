const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
});

console.log('[QUEUE] Initializing BullMQ queue with rate limiter 15 jobs/minute');
const myQueue = new Queue('my-queue', {
  connection,
  limiter: {
    max: 15, // số job tối đa mỗi duration
    duration: 60000, // 1 phút
  }
});

module.exports = { myQueue, connection, Worker }; 