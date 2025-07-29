const { createClient } = require('redis');

const redisClient = createClient({
  url: 'redis://localhost:6379',
  maxRetriesPerRequest: null
});

redisClient.on('error', (err) => {
  console.error('[REDIS] Lỗi kết nối:', err);
});

redisClient.on('connect', () => {
  console.log('[REDIS] Đã kết nối thành công');
});

redisClient.on('ready', () => {
  console.log('[REDIS] Redis client sẵn sàng');
});

module.exports = redisClient; 