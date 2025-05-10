// routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../adminControllers/userController'); // Đảm bảo đường dẫn này chính xác

// Route để lấy tất cả models, có thể có query param ?providerId=...
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;