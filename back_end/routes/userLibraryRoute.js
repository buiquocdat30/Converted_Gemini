const express = require("express");
const router = express.Router();
const userLibraryController = require("../controllers/userLibraryController");
const authMiddleware = require("../middleware/authMiddleware");

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);

// Debug middleware
router.use((req, res, next) => {
  console.log("UserLibrary Route - Request path:", req.path);
  console.log("UserLibrary Route - User from auth:", req.user);
  next();
});

// Quản lý bản dịch và phiên bản
// Tạo bản dịch mới
router.post(
  "/:storyId/chapters/:chapterNumber/translation",
  userLibraryController.createTranslation
); 
// Cập nhật bản dịch
router.put(
  "/:storyId/chapters/:chapterNumber/translation",
  userLibraryController.updateTranslation
); 
// Xóa bản dịch
router.delete(
  "/:storyId/chapters/:chapterNumber/translation",
  userLibraryController.deleteTranslation
); 

router.get(
  "/:storyId/chapters/:chapterNumber/versions",
  userLibraryController.getAllTranslationVersion
); 
// Lấy chi tiết phiên bản
router.get(
  "/:storyId/chapters/:chapterNumber/versions/:versionId",
  userLibraryController.getOneTranslationVersion
); // Lấy chi tiết phiên bản

// Quản lý chương truyện - đặt trước để tránh xung đột với route /:id
router.get("/:storyId/chapters", userLibraryController.getChapters);
router.post("/:storyId/chapters", userLibraryController.addChapter);
router.put(
  "/:storyId/chapters/:chapterNumber",
  userLibraryController.updateChapter
);
router.delete(
  "/:storyId/chapters/:chapterNumber",
  userLibraryController.deleteChapter
);

// CRUD operations cho truyện - đặt sau các route cụ thể
router.get("/", userLibraryController.getAllStories);
router.post("/", userLibraryController.createStory);
router.get("/:id", userLibraryController.getStoryById);
router.put("/:id", userLibraryController.updateStory);
router.patch("/:id/hide", userLibraryController.hideStory); //xoá mềm
router.delete("/:id", userLibraryController.deleteStory); //xoá cứng

module.exports = router;
