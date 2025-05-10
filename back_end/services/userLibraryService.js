const prisma = require("../config/prismaConfig");

const userLibraryService = {
    // Lấy tất cả truyện của user
    getAllStories: async (userId) => {
        return await prisma.userLibraryStory.findMany({
            where: { userId },
            include: {
                chapters: {
                    include: {
                        translation: true
                    }
                }
            }
        });
    },

    // Lấy truyện theo ID
    getStoryById: async (id, userId) => {
        return await prisma.userLibraryStory.findFirst({
            where: {
                id,
                userId
            },
            include: {
                chapters: {
                    include: {
                        translation: true
                    }
                }
            }
        });
    },

    // Tạo truyện mới
    createStory: async (data) => {
        return await prisma.userLibraryStory.create({
            data
        });
    },

    // Cập nhật truyện
    updateStory: async (id, userId, data) => {
        return await prisma.userLibraryStory.updateMany({
            where: {
                id,
                userId
            },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    },

    // Xóa truyện
    deleteStory: async (id, userId) => {
        return await prisma.userLibraryStory.deleteMany({
            where: {
                id,
                userId
            }
        });
    },

    // Lấy danh sách chương
    getChapters: async (storyId, userId) => {
        return await prisma.userLibraryChapter.findMany({
            where: {
                story: {
                    id: storyId,
                    userId
                }
            },
            include: {
                translation: true,
                versions: true
            },
            orderBy: {
                chapterNumber: 'asc'
            }
        });
    },

    // Thêm chương mới
    addChapter: async (data) => {
        return await prisma.userLibraryChapter.create({
            data
        });
    },

    // Cập nhật chương
    updateChapter: async (storyId, chapterNumber, userId, data) => {
        return await prisma.userLibraryChapter.updateMany({
            where: {
                storyId,
                chapterNumber: parseInt(chapterNumber),
                story: {
                    userId
                }
            },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    },

    // Xóa chương
    deleteChapter: async (storyId, chapterNumber, userId) => {
        return await prisma.userLibraryChapter.deleteMany({
            where: {
                storyId,
                chapterNumber: parseInt(chapterNumber),
                story: {
                    userId
                }
            }
        });
    }
};

module.exports = userLibraryService; 