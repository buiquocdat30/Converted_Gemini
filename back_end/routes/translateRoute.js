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

// Thêm job vào hàng đợi BullMQ
router.post('/add-job', translateController.addJobToQueue);

module.exports = router;
