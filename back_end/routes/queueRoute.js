const express = require('express');
const router = express.Router();
const { getQueueStats } = require('../controllers/queueController');

// Lấy thống kê queue BullMQ
router.get('/stats', getQueueStats);

module.exports = router; 