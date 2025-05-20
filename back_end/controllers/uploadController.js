const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { readEpub } = require("../services/epubService");
const { readTxt } = require("../services/txtServices");
const os = require("os");
const crypto = require("crypto");
const uploadService = require("../services/uploadService");
const multer = require("multer");

// Cấu hình multer cho upload ảnh
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
});

const handleUpload = async (req, res) => {
  try {
    const { fileName, chapters } = req.body;

    if (!fileName || !chapters) {
      return res.status(400).json({ error: "Thiếu thông tin file hoặc chapters" });
    }

    // Kiểm tra định dạng file
    const ext = path.extname(fileName).toLowerCase();
    if (ext !== ".epub" && ext !== ".txt") {
      return res.status(400).json({ error: "Chỉ hỗ trợ file EPUB hoặc TXT" });
    }

    // Trả về chapters đã xử lý
    res.json({ chapters });
  } catch (err) {
    console.error("❌ Lỗi xử lý upload truyện:", err);
    res.status(500).json({ error: err.message || "Đã xảy ra lỗi khi xử lý file" });
  }
};

const handleImageUpload = async (req, res) => {
  try {
    console.log("req.file", req.file);
    if (!req.file) {
      return res.status(400).json({ error: "Không tìm thấy file ảnh" });
    }

    const type = req.params.type; // Lấy type từ params
    console.log("type ảnh", type);
    const userId = req.user.id;
    console.log("userId khi up ảnh", userId);
    let uploadPath;
    let fileName;

    // Tạo tên file duy nhất
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const originalName = req.file.originalname;
    const fileExtension = originalName.split(".").pop();
    fileName = `${timestamp}_${randomString}.${fileExtension}`;
    console.log("fileName khi up ảnh", fileName);

    // Xác định đường dẫn lưu trữ dựa vào type
    switch (type) {
      case "avatar":
        uploadPath = path.join(__dirname, "../data/upload/avatar");
        break;
      case "background":
        uploadPath = path.join(__dirname, "../data/upload/background");
        break;
      case "storyAvatar":
        uploadPath = path.join(__dirname, "../data/upload/storyAvatar");
        break;
      default:
        return res.status(400).json({ error: "Loại upload không hợp lệ" });
    }

    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Lưu file từ buffer vào thư mục đích
    const filePath = path.join(uploadPath, fileName);
    await fsPromises.writeFile(filePath, req.file.buffer);

    // Trả về đường dẫn file
    const relativePath = path.relative(
      path.join(__dirname, "../data/upload"),
      filePath
    );
    res.json({
      message: "Upload ảnh thành công",
      filePath: relativePath.replace(/\\/g, "/"), // Chuyển đổi đường dẫn Windows sang URL
    });
    console.log("res khi up ảnh", res.json);
    console.log("relativePath khi up ảnh", relativePath);
  } catch (error) {
    console.error("Lỗi khi upload ảnh:", error);
    res.status(500).json({ error: "Lỗi khi upload ảnh" });
  }
};

const getUserImages = async (req, res) => {
  try {
    const userId = req.user.id;
    const images = await uploadService.getUserImages(userId);
    res.json({
      success: true,
      data: images,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy thông tin ảnh:", err);
    res
      .status(500)
      .json({ error: err.message || "Đã xảy ra lỗi khi lấy thông tin ảnh" });
  }
};

module.exports = {
  handleUpload,
  handleImageUpload,
  getUserImages,
  upload,
};
