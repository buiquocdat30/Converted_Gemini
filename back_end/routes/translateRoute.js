const express = require('express');
const { translateText } = require('../controllers/translateController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
const translateController = require('../controllers/translateController');

// Thêm middleware xác thực cho route translate
router.post('/', authMiddleware, translateText);

// Route test không cần auth (chỉ để debug)
router.post('/test', translateText);

// Route mới: Thêm jobs vào queue
router.post('/queue', authMiddleware, translateController.translateTextQueue);

// Route mới: Dịch các trang cụ thể
router.post('/range-pages', authMiddleware, translateController.translateRangePages);

// Route mới: Dịch 50 trang liên tiếp từ trang đầu tiên
router.post('/50-pages', authMiddleware, translateController.translate50Pages);

// Thêm job vào hàng đợi BullMQ
router.post('/add-job', translateController.addJobToQueue);

module.exports = router;
