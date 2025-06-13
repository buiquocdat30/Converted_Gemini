const express = require('express');
const router = express.Router();
const translateController = require('../controllers/translateController');
const authMiddleware = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);

// Route dịch chương với queue
router.post('/queue', translateController.translateChapter);

// Route lấy trạng thái job
router.get('/queue/:jobId', translateController.getJobStatus);

// Route dừng job
router.post('/queue/:jobId/stop', translateController.stopJob);

module.exports = router;
