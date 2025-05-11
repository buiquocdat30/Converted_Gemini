const express = require("express");
const router = express.Router();
const userApiKeyController = require("../controllers/userApiKeyController");
const authMiddleware = require("../middleware/authMiddleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);

// CRUD operations cho API keys
router.get("/", userApiKeyController.getAllKeys);
router.post("/", userApiKeyController.createKey);
router.put("/:id", userApiKeyController.updateKey);
router.delete("/:id", userApiKeyController.deleteKey);
router.get("/models/:modelId", userApiKeyController.getKeysByModel);

module.exports = router;
