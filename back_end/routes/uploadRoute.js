const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { handleUpload, handleImageUpload, upload } = require("../controllers/uploadController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Route upload truyện
router.post("/", handleUpload);

// Route upload ảnh (yêu cầu đăng nhập)
router.post("/image/:type", authMiddleware, upload.single('image'), handleImageUpload);

module.exports = router;
