const express = require('express');
const router = express.Router();
const userLibraryController = require('../controllers/userLibraryController');
const authMiddleware = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);
// Debug middleware
router.use((req, res, next) => {
    console.log('UserLibrary Route - Request path:', req.path);
    console.log('UserLibrary Route - User from auth:', req.user);
    next();
});

// Quản lý chương truyện - đặt trước để tránh xung đột với route /:id
router.get('/:storyId/chapters', userLibraryController.getChapters);
router.post('/:storyId/chapters', userLibraryController.addChapter);
router.put('/:storyId/chapters/:chapterNumber', userLibraryController.updateChapter);
router.delete('/:storyId/chapters/:chapterNumber', userLibraryController.deleteChapter);

// CRUD operations cho truyện - đặt sau các route cụ thể
router.get('/', userLibraryController.getAllStories);
router.post('/', userLibraryController.createStory);
router.get('/:id', userLibraryController.getStoryById);
router.put('/:id', userLibraryController.updateStory);
router.delete('/:id', userLibraryController.deleteStory);

module.exports = router; 