// routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const modelController = require('../adminControllers/userController'); // Đảm bảo đường dẫn này chính xác

// Route để lấy tất cả models, có thể có query param ?providerId=...
router.get('/', modelController.getAllModels);
router.post('/', modelController.createModel);
router.get('/:id', modelController.getModelById);
router.put('/:id', modelController.updateModel);
router.delete('/:id', modelController.deleteModel);

module.exports = router;