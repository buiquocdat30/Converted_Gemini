// // prismaConfig.js
// const { PrismaClient } = require('@prisma/client');

// // Tắt log query của Prisma
// const prisma = new PrismaClient({
//   log: ['error', 'warn'], // Chỉ log lỗi và cảnh báo
// });

// // Xử lý lỗi kết nối
// prisma.$on('query', (e) => {
//   console.log('Query:', e.query);
//   console.log('Params:', e.params);
//   console.log('Duration:', `${e.duration}ms`);
// });

// prisma.$on('error', (e) => {
//   console.error('Prisma Error:', e);
// });

// // Kiểm tra kết nối
// prisma.$connect()
//   .then(() => {
//     console.log('✅ Kết nối database thành công');
//   })
//   .catch((error) => {
//     console.error('❌ Lỗi kết nối database:', error);
//   });

// module.exports = prisma;

// prismaConfig.js
const { PrismaClient } = require('@prisma/client');
const { ObjectId } = require('mongodb'); // Thay đổi import ObjectId từ mongodb

// Tắt log query của Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'], // Chỉ log lỗi và cảnh báo
});

// Helper functions
const toObjectId = (id) => {
  if (!id) {
    throw new Error("ID không được để trống");
  }
  try {
    // Kiểm tra nếu id đã là ObjectId
    if (id instanceof ObjectId) {
      return id;
    }
    // Kiểm tra nếu id là string hợp lệ
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      return new ObjectId(id);
    }
    throw new Error(`ID không hợp lệ: ${id}`);
  } catch (error) {
    console.error("❌ Lỗi khi chuyển đổi ObjectId:", error);
    throw new Error(`ID không hợp lệ: ${id}`);
  }
};

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

module.exports = {
  prisma,
  toObjectId
};