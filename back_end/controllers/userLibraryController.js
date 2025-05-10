const userLibraryService = require('../services/userLibraryService');

const userLibraryController = {
    // Lấy tất cả truyện của user
    getAllStories: async (req, res) => {
        try {
            const userId = req.user.id;
            const stories = await userLibraryService.getAllStories(userId);
            res.json(stories);
        } catch (error) {
            console.error('Error getting stories:', error);
            res.status(500).json({ error: 'Lỗi khi lấy danh sách truyện' });
        }
    },

    // Lấy truyện theo ID
    getStoryById: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const story = await userLibraryService.getStoryById(id, userId);

            if (!story) {
                return res.status(404).json({ error: 'Không tìm thấy truyện' });
            }

            res.json(story);
        } catch (error) {
            console.error('Error getting story:', error);
            res.status(500).json({ error: 'Lỗi khi lấy thông tin truyện' });
        }
    },

    // Tạo truyện mới
    createStory: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, author } = req.body;

            const newStory = await userLibraryService.createStory({
                name,
                author,
                userId
            });

            res.status(201).json(newStory);
        } catch (error) {
            console.error('Error creating story:', error);
            res.status(500).json({ error: 'Lỗi khi tạo truyện mới' });
        }
    },

    // Cập nhật truyện
    updateStory: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { name, author } = req.body;

            const updatedStory = await userLibraryService.updateStory(id, userId, {
                name,
                author
            });

            if (updatedStory.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy truyện' });
            }

            res.json({ message: 'Cập nhật truyện thành công' });
        } catch (error) {
            console.error('Error updating story:', error);
            res.status(500).json({ error: 'Lỗi khi cập nhật truyện' });
        }
    },

    // Xóa truyện
    deleteStory: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const deletedStory = await userLibraryService.deleteStory(id, userId);

            if (deletedStory.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy truyện' });
            }

            res.json({ message: 'Xóa truyện thành công' });
        } catch (error) {
            console.error('Error deleting story:', error);
            res.status(500).json({ error: 'Lỗi khi xóa truyện' });
        }
    },

    // Lấy danh sách chương
    getChapters: async (req, res) => {
        try {
            const { storyId } = req.params;
            const userId = req.user.id;

            const chapters = await userLibraryService.getChapters(storyId, userId);
            res.json(chapters);
        } catch (error) {
            console.error('Error getting chapters:', error);
            res.status(500).json({ error: 'Lỗi khi lấy danh sách chương' });
        }
    },

    // Thêm chương mới
    addChapter: async (req, res) => {
        try {
            const { storyId } = req.params;
            const { chapterNumber, rawText } = req.body;
            const userId = req.user.id;

            // Kiểm tra truyện tồn tại và thuộc về user
            const story = await userLibraryService.getStoryById(storyId, userId);

            if (!story) {
                return res.status(404).json({ error: 'Không tìm thấy truyện' });
            }

            const newChapter = await userLibraryService.addChapter({
                storyId,
                chapterNumber,
                rawText
            });

            res.status(201).json(newChapter);
        } catch (error) {
            console.error('Error adding chapter:', error);
            res.status(500).json({ error: 'Lỗi khi thêm chương mới' });
        }
    },

    // Cập nhật chương
    updateChapter: async (req, res) => {
        try {
            const { storyId, chapterNumber } = req.params;
            const { rawText } = req.body;
            const userId = req.user.id;

            const updatedChapter = await userLibraryService.updateChapter(
                storyId,
                chapterNumber,
                userId,
                { rawText }
            );

            if (updatedChapter.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy chương' });
            }

            res.json({ message: 'Cập nhật chương thành công' });
        } catch (error) {
            console.error('Error updating chapter:', error);
            res.status(500).json({ error: 'Lỗi khi cập nhật chương' });
        }
    },

    // Xóa chương
    deleteChapter: async (req, res) => {
        try {
            const { storyId, chapterNumber } = req.params;
            const userId = req.user.id;

            const deletedChapter = await userLibraryService.deleteChapter(
                storyId,
                chapterNumber,
                userId
            );

            if (deletedChapter.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy chương' });
            }

            res.json({ message: 'Xóa chương thành công' });
        } catch (error) {
            console.error('Error deleting chapter:', error);
            res.status(500).json({ error: 'Lỗi khi xóa chương' });
        }
    }
};

module.exports = userLibraryController; 