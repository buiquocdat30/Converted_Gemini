const express = require('express');
const router = express.Router();
const apiKeyController = require('../adminControllers/apiKeyController');
const authMiddleware = require('../../middleware/authMiddleware');
const adminMiddleware = require('../../middleware/adminMiddleware');

// Áp dụng middleware xác thực và kiểm tra quyền admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Lấy tất cả API keys
router.get('/', apiKeyController.getAllKeys);

// Lấy API key theo ID
router.get('/:id', apiKeyController.getKeyById);

// Cập nhật trạng thái API key
router.put('/:id/status', apiKeyController.updateKeyStatus);

// Xóa API key
router.delete('/:id', apiKeyController.deleteKey);

// Lấy thống kê sử dụng API key
router.get('/stats/usage', apiKeyController.getKeyStats);

module.exports = router; 