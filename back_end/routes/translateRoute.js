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

// Route mới: Dịch tất cả các trang chưa dịch
router.post('/all-pages', authMiddleware, translateController.translateAllPages);

// Thêm job vào hàng đợi BullMQ
router.post('/add-job', translateController.addJobToQueue);

module.exports = router;
