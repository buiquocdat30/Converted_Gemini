const express = require("express");
const router = express.Router();
const glossaryController = require("../controllers/glossaryController");
const authenticateToken = require("../middleware/authMiddleware");

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// Lấy tất cả glossary items của một truyện
router.get("/:storyId", glossaryController.getGlossary);

// Tìm kiếm glossary items
router.get("/:storyId/search", glossaryController.searchGlossaryItems);

// Cập nhật một glossary item
router.put("/items/:itemId", glossaryController.updateGlossaryItem);

// Xóa một glossary item
router.delete("/items/:itemId", glossaryController.deleteGlossaryItem);

module.exports = router; 