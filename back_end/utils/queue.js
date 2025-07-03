const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: 'localhost', // Nếu dùng docker-compose, đổi thành tên service redis
  port: 6379,
});

const myQueue = new Queue('my-queue', { connection });


module.exports = { myQueue, connection, Worker }; 