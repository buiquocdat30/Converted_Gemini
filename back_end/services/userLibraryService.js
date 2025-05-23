const prisma = require("../config/prismaConfig");
const { readEpub } = require("./epubService");
const { readTxt } = require("./txtServices");

const userLibraryService = {
  // Lấy tất cả truyện của user
  getAllStories: async (userId) => {
    return await prisma.userLibraryStory.findMany({
      where: {
        userId: userId,
        isHidden: false, // Chỉ lấy các truyện không bị ẩn
      },
      include: {
        chapters: {
          select: {
            id: true,
            chapterNumber: true,
            chapterName: true,
            isHidden: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  // Lấy truyện theo ID
  getStoryById: async (id, userId) => {
    try {
      const story = await prisma.userLibraryStory.findFirst({
        where: {
          id: id,
          userId: userId,
        },
        include: {
          chapters: {
            include: {
              translation: true,
            },
          },
        },
      });

      // Nếu tìm thấy story, chuyển đổi các trường DateTime
      if (story) {
        return {
          ...story,
          createdAt: story.createdAt
            ? new Date(story.createdAt).toISOString()
            : null,
          updatedAt: story.updatedAt
            ? new Date(story.updatedAt).toISOString()
            : null,
          chapters: story.chapters.map((chapter) => ({
            ...chapter,
            createdAt: chapter.createdAt
              ? new Date(chapter.createdAt).toISOString()
              : null,
            updatedAt: chapter.updatedAt
              ? new Date(chapter.updatedAt).toISOString()
              : null,
            translation: chapter.translation
              ? {
                  ...chapter.translation,
                  createdAt: chapter.translation.createdAt
                    ? new Date(chapter.translation.createdAt).toISOString()
                    : null,
                  updatedAt: chapter.translation.updatedAt
                    ? new Date(chapter.translation.updatedAt).toISOString()
                    : null,
                }
              : null,
          })),
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getStoryById:", error);
      throw error;
    }
  },

  // Tạo truyện mới
  createStory: async (data) => {
    try {
      // Tạo truyện mới
      const story = await prisma.userLibraryStory.create({
        data: {
          name: data.name,
          author: data.author,
          userId: data.userId,
          storyAvatar: data.storyAvatar || "/default-avatar.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Xử lý chapters nếu có
      if (data.chapters && Array.isArray(data.chapters)) {
        console.log("Check order trước khi tạo:", data.chapters.map(c => c.title));
        // Tạo các chương với chapterNumber được gán đúng
        const chapterPromises = data.chapters.map((chapter, index) => {
          return prisma.userLibraryChapter.create({
            data: {
              storyId: story.id,
              chapterNumber: index + 1, // Gán chapterNumber theo thứ tự
              chapterName: chapter.title,
              rawText: chapter.content,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        });
        console.log("chapterPromises:", chapterPromises)
        await Promise.all(chapterPromises);
      }

      // Lấy lại truyện với chapters đã được sắp xếp
      return await prisma.userLibraryStory.findUnique({
        where: { id: story.id },
        include: {
          chapters: {
            orderBy: {
              chapterNumber: "asc",
            },
          },
        },
      });
    } catch (error) {
      console.error("Error in createStory:", error);
      throw error;
    }
  },

  // Cập nhật truyện
  updateStory: async (id, userId, data) => {
    return await prisma.userLibraryStory.updateMany({
      where: {
        id: id,
        userId: userId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  },

  // Ẩn truyện (xóa mềm)
  hideStory: async (storyId, userId) => {
    try {
      return await prisma.userLibraryStory.updateMany({
        where: {
          id: storyId,
          userId: userId,
        },
        data: {
          isHidden: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error in hideStory service:", error);
      throw error;
    }
  },

  // Xóa truyện vĩnh viễn (xóa cứng)
  deleteStory: async (storyId, userId) => {
    try {
      return await prisma.userLibraryStory.deleteMany({
        where: {
          id: storyId,
          userId: userId,
        },
      });
    } catch (error) {
      console.error("Error in deleteStory service:", error);
      throw error;
    }
  },

  // Lấy danh sách chương
  getChapters: async (storyId, userId) => {
    try {
      const chapters = await prisma.userLibraryChapter.findMany({
        where: {
          story: {
            id: storyId,
            userId: userId,
          },
        },
        include: {
          translation: true,
          versions: true,
        },
        orderBy: {
          chapterNumber: "asc",
        },
      });

      // Chuyển đổi các trường DateTime và đảm bảo thứ tự
      return chapters.map((chapter) => ({
        ...chapter,
        createdAt: chapter.createdAt ? new Date(chapter.createdAt) : null,
        updatedAt: chapter.updatedAt ? new Date(chapter.updatedAt) : null,
        translation: chapter.translation
          ? {
              ...chapter.translation,
              createdAt: chapter.translation.createdAt
                ? new Date(chapter.translation.createdAt)
                : null,
              updatedAt: chapter.translation.updatedAt
                ? new Date(chapter.translation.updatedAt)
                : null,
            }
          : null,
        versions: chapter.versions.map((version) => ({
          ...version,
          createdAt: version.createdAt ? new Date(version.createdAt) : null,
          updatedAt: version.updatedAt ? new Date(version.updatedAt) : null,
        })),
      }));
    } catch (error) {
      console.error("Error in getChapters:", error);
      throw error;
    }
  },

  // Thêm chương mới
  addChapter: async (data) => {
    try {
      // Kiểm tra storyId
      if (!data.storyId) {
        throw new Error("Thiếu storyId");
      }

      // Kiểm tra truyện tồn tại
      const story = await prisma.userLibraryStory.findUnique({
        where: { id: data.storyId },
      });

      if (!story) {
        throw new Error("Không tìm thấy truyện");
      }

      // Tạo chương mới
      return await prisma.userLibraryChapter.create({
        data: {
          storyId: data.storyId,
          chapterNumber: data.chapterNumber,
          chapterName: data.chapterName,
          rawText: data.rawText,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error in addChapter:", error);
      throw error;
    }
  },

  // Cập nhật chương
  updateChapter: async (storyId, chapterNumber, userId, data) => {
    return await prisma.userLibraryChapter.updateMany({
      where: {
        storyId: storyId,
        chapterNumber: parseInt(chapterNumber),
        story: {
          userId: userId,
        },
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  },

  // Xóa chương
  deleteChapter: async (storyId, chapterNumber, userId) => {
    return await prisma.userLibraryChapter.deleteMany({
      where: {
        storyId: storyId,
        chapterNumber: parseInt(chapterNumber),
        story: {
          userId: userId,
        },
      },
    });
  },
};

module.exports = userLibraryService;
