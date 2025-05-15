const prisma = require("../config/prismaConfig");

const userLibraryService = {
    // Lấy tất cả truyện của user
    getAllStories: async (userId) => {
        return await prisma.userLibraryStory.findMany({
            where: { 
                userId: userId,
                isHidden: false // Chỉ lấy các truyện không bị ẩn
            },
            include: {
                chapters: {
                    select: {
                        id: true,
                        chapterNumber: true,
                        chapterName: true,
                        isHidden: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
    },

    // Lấy truyện theo ID
    getStoryById: async (id, userId) => {
        return await prisma.userLibraryStory.findFirst({
            where: {
                id: id,
                userId: userId
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
            data: {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    },

    // Cập nhật truyện
    updateStory: async (id, userId, data) => {
        return await prisma.userLibraryStory.updateMany({
            where: {
                id: id,
                userId: userId
            },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    },

    // Ẩn truyện (xóa mềm)
    hideStory: async (storyId, userId) => {
        try {
            return await prisma.userLibraryStory.updateMany({
                where: {
                    id: storyId,
                    userId: userId
                },
                data: {
                    isHidden: true,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error in hideStory service:', error);
            throw error;
        }
    },

    // Xóa truyện vĩnh viễn (xóa cứng)
    deleteStory: async (storyId, userId) => {
        try {
            return await prisma.userLibraryStory.deleteMany({
                where: {
                    id: storyId,
                    userId: userId
                }
            });
        } catch (error) {
            console.error('Error in deleteStory service:', error);
            throw error;
        }
    },

    // Lấy danh sách chương
    getChapters: async (storyId, userId) => {
        return await prisma.userLibraryChapter.findMany({
            where: {
                story: {
                    id: storyId,
                    userId: userId
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
            data: {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    },

    // Cập nhật chương
    updateChapter: async (storyId, chapterNumber, userId, data) => {
        return await prisma.userLibraryChapter.updateMany({
            where: {
                storyId: storyId,
                chapterNumber: parseInt(chapterNumber),
                story: {
                    userId: userId
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
                storyId: storyId,
                chapterNumber: parseInt(chapterNumber),
                story: {
                    userId: userId
                }
            }
        });
    }
};

module.exports = userLibraryService; 