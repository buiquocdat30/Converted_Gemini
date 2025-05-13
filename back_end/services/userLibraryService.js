const prisma = require("../config/prismaConfig");

const userLibraryService = {
    // Lấy tất cả truyện của user
    getAllStories: async (userId) => {


        // return await prisma.user.findMany({
        //     where: { id: userId },
        //     include: {
        //       libraryStories: true
        //     }
        //   });

        return await prisma.userLibraryStory.findMany({
            where: { 
                userId: userId 
            },
            include: {
                chapters: true
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

    // Xóa truyện
    deleteStory: async (id, userId) => {
        return await prisma.userLibraryStory.deleteMany({
            where: {
                id: id,
                userId: userId
            }
        });
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