const express = require('express');
const router = express.Router();
const userLibraryController = require('../controllers/userLibraryController');
const authMiddleware = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);

// CRUD operations cho truyện
router.get('/', userLibraryController.getAllStories);
router.post('/', userLibraryController.createStory);
router.get('/:id', userLibraryController.getStoryById);
router.put('/:id', userLibraryController.updateStory);
router.delete('/:id', userLibraryController.deleteStory);

// Quản lý chương truyện
router.get('/:storyId/chapters', userLibraryController.getChapters);
router.post('/:storyId/chapters', userLibraryController.addChapter);
router.put('/:storyId/chapters/:chapterNumber', userLibraryController.updateChapter);
router.delete('/:storyId/chapters/:chapterNumber', userLibraryController.deleteChapter);

module.exports = router; 