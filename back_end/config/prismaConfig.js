// prismaConfig.js
const { PrismaClient } = require('@prisma/client');

// Tắt log query của Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'], // Chỉ log lỗi và cảnh báo
});

// Xử lý lỗi kết nối
prisma.$on('query', (e) => {
  console.log('Query:', e.query);
  console.log('Params:', e.params);
  console.log('Duration:', `${e.duration}ms`);
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

// Kiểm tra kết nối
prisma.$connect()
  .then(() => {
    console.log('✅ Kết nối database thành công');
  })
  .catch((error) => {
    console.error('❌ Lỗi kết nối database:', error);
  });

module.exports = prisma;
