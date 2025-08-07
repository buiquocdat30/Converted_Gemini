const express = require("express");
const router = express.Router();
const userApiKeyController = require("../controllers/userApiKeyController");
const authMiddleware = require("../middleware/authMiddleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);

// CRUD operations cho API keys
router.get("/", userApiKeyController.getAllKeys);
router.post("/", userApiKeyController.createKey);
router.put("/:id/status", userApiKeyController.updateKeyStatus);
router.delete("/:id", userApiKeyController.deleteKey);
router.get("/models/:modelId", userApiKeyController.getKeysByModel);
// Lấy usage thống kê trong ngày cho user
router.get("/usage/today", userApiKeyController.getTodayUsageStats);

module.exports = router;
