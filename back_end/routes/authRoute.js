const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Đăng ký và đăng nhập không cần xác thực
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Xác thực token cần middleware
router.get("/verify", authMiddleware, authController.verifyToken);

module.exports = router;