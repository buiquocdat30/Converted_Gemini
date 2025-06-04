// routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const modelController = require("../adminControllers/modelController");
const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

// Áp dụng middleware xác thực và kiểm tra quyền admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Route để lấy tất cả models, có thể có query param ?providerId=...
router.get('/', modelController.getAllModels);

// Lấy danh sách tất cả models
router.get('/list/all', modelController.getModelsList);

// Lấy thông tin chi tiết của một model
router.get('/:id', modelController.getModelById);

// Thêm model mới
router.post('/', modelController.createModel);

// Cập nhật model
router.put('/:id', modelController.updateModel);

// Xóa model
router.delete('/:id', modelController.deleteModel);

module.exports = router;