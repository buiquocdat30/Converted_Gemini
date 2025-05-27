const prisma = require("../config/prismaConfig");
const { readEpub } = require("./epubService");
const { readTxt } = require("./txtServices");

const userLibraryService = {
  // ==============================================
  // PHẦN 1: QUẢN LÝ TRUYỆN (STORY MANAGEMENT)
  // ==============================================

  /**
   * Lấy tất cả truyện của user
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Array>} Danh sách truyện
   */
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

  /**
   * Lấy thông tin chi tiết một truyện theo ID
   * @param {string} id - ID của truyện
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Object|null>} Thông tin truyện hoặc null nếu không tìm thấy
   */
  getStoryById: async (id, userId) => {
    try {
      const story = await prisma.userLibraryStory.findFirst({
        where: {
          id: id,
          userId: userId,
        },
        include: {
          chapters: {
            orderBy: {
              chapterNumber: "asc",
            },
            include: {
              translation: true,
            },
          },
        },
      });

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

  /**
   * Tạo truyện mới
   * @param {Object} data - Dữ liệu truyện mới
   * @returns {Promise<Object>} Truyện đã tạo
   */
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
      console.log(
        "Thứ tự chapterNumber trước khi tạo:",
        data.chapters.map((c) => c.chapterNumber)
      );

      // Xử lý chapters nếu có
      if (data.chapters && Array.isArray(data.chapters)) {
        data.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
        console.log(
          "Check order trước khi tạo:",
          data.chapters.map((c) => c.title)
        );
        // Tạo các chương với chapterNumber được gán đúng
        const chapterPromises = data.chapters.map((chapter, index) => {
          return prisma.userLibraryChapter.create({
            data: {
              storyId: story.id,
              chapterNumber: chapter.chapterNumber ?? index + 1,
              chapterName: chapter.title,
              rawText: chapter.content,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        });
        await Promise.all(chapterPromises);
        const createdChapters = await Promise.all(chapterPromises);

        // 👉 Bây giờ bạn có thể dùng .map
        console.log(
          "📚 Tiêu đề các chương sau khi tạo:",
          createdChapters.map((c) => `${c.chapterNumber}. ${c.chapterName}`)
        );
      }

      // Lấy lại truyện với chapters đã được sắp xếp
      const storyWithChapters = await prisma.userLibraryStory.findUnique({
        where: { id: story.id },
        include: {
          chapters: {
            orderBy: {
              chapterNumber: "asc",
            },
          },
        },
      });

      console.log(
        "📚 Tiêu đề các chương sau khi lấy lại truyện nè má:",
        storyWithChapters.chapters.map(
          (c) => `${c.chapterNumber}. ${c.chapterName}`
        )
      );
      return storyWithChapters;
    } catch (error) {
      console.error("Error in createStory:", error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin truyện
   * @param {string} id - ID của truyện
   * @param {string} userId - ID của người dùng
   * @param {Object} data - Dữ liệu cập nhật
   * @returns {Promise<Object>} Kết quả cập nhật
   */
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

  /**
   * Ẩn truyện (xóa mềm)
   * @param {string} storyId - ID của truyện
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Object>} Kết quả ẩn truyện
   */
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

  /**
   * Xóa truyện vĩnh viễn (xóa cứng)
   * @param {string} storyId - ID của truyện
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Object>} Kết quả xóa truyện
   */
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

  // ==============================================
  // PHẦN 2: QUẢN LÝ CHƯƠNG (CHAPTER MANAGEMENT)
  // ==============================================

  /**
   * Lấy danh sách chương của truyện
   * @param {string} storyId - ID của truyện
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Array>} Danh sách chương
   */
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

  /**
   * Thêm chương mới vào truyện
   * @param {Object} data - Dữ liệu chương mới
   * @returns {Promise<Object>} Chương đã tạo
   */
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

      console.log(
        "đây là thông tin chương mới addChapter name",
        data.chapterName
      );
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

  /**
   * Cập nhật nội dung chương
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} userId - ID của người dùng
   * @param {Object} data - Dữ liệu cập nhật
   * @returns {Promise<Object>} Kết quả cập nhật
   */
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

  /**
   * Xóa chương
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Object>} Kết quả xóa chương
   */
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

  // ==============================================
  // PHẦN 3: QUẢN LÝ BẢN DỊCH (TRANSLATION MANAGEMENT)
  // ==============================================

  /**
   * Tạo bản dịch mới cho chương
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} userId - ID của người dùng
   * @param {Object} data - Dữ liệu bản dịch
   * @returns {Promise<Object>} Bản dịch đã tạo
   */
  createTranslation: async (storyId, chapterNumber, userId, data) => {
    try {
      // Kiểm tra chương tồn tại và thuộc về user
      const chapter = await prisma.userLibraryChapter.findFirst({
        where: {
          storyId: storyId,
          chapterNumber: parseInt(chapterNumber),
          story: {
            userId: userId,
          },
        },
      });

      if (!chapter) {
        throw new Error("Không tìm thấy chương");
      }

      // Tạo hoặc cập nhật bản dịch
      const translation = await prisma.userTranslatedChapter.upsert({
        where: {
          chapterId: chapter.id,
        },
        update: {
          translatedTitle: data.translatedTitle,
          translatedContent: data.translatedContent,
          updatedAt: new Date(),
        },
        create: {
          chapterId: chapter.id,
          translatedTitle: data.translatedTitle,
          translatedContent: data.translatedContent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Cập nhật trạng thái chương thành TRANSLATED
      await prisma.userLibraryChapter.update({
        where: { id: chapter.id },
        data: { status: "TRANSLATED" },
      });

      return translation;
    } catch (error) {
      console.error("Lỗi khi tạo bản dịch:", error);
      throw error;
    }
  },

  /**
   * Cập nhật bản dịch của chương
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} userId - ID của người dùng
   * @param {Object} data - Dữ liệu cập nhật
   * @returns {Promise<Object>} Bản dịch đã cập nhật
   */
  updateTranslation: async (storyId, chapterNumber, userId, data) => {
    try {
      const chapter = await prisma.userLibraryChapter.findFirst({
        where: {
          storyId: storyId,
          chapterNumber: parseInt(chapterNumber),
          story: {
            userId: userId,
          },
        },
        include: {
          translation: true,
        },
      });

      if (!chapter || !chapter.translation) {
        throw new Error("Không tìm thấy bản dịch");
      }

      // Lưu phiên bản cũ trước khi cập nhật
      await prisma.userTranslationVersion.create({
        data: {
          chapterId: chapter.id,
          translatedText: chapter.translation.translatedContent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Cập nhật bản dịch mới
      const updatedTranslation = await prisma.userTranslatedChapter.update({
        where: {
          chapterId: chapter.id,
        },
        data: {
          translatedTitle: data.translatedTitle,
          translatedContent: data.translatedContent,
          updatedAt: new Date(),
        },
      });

      // Cập nhật trạng thái chương thành REVIEWING
      await prisma.userLibraryChapter.update({
        where: { id: chapter.id },
        data: { status: "REVIEWING" },
      });

      return updatedTranslation;
    } catch (error) {
      console.error("Lỗi khi cập nhật bản dịch:", error);
      throw error;
    }
  },

  /**
   * Xóa bản dịch của chương
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Object>} Kết quả xóa bản dịch
   */
  deleteTranslation: async (storyId, chapterNumber, userId) => {
    try {
      const chapter = await prisma.userLibraryChapter.findFirst({
        where: {
          storyId: storyId,
          chapterNumber: parseInt(chapterNumber),
          story: {
            userId: userId,
          },
        },
        include: {
          translation: true,
        },
      });

      if (!chapter || !chapter.translation) {
        throw new Error("Không tìm thấy bản dịch");
      }

      // Lưu phiên bản cuối cùng trước khi xóa
      await prisma.userTranslationVersion.create({
        data: {
          chapterId: chapter.id,
          translatedText: chapter.translation.translatedContent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Xóa bản dịch
      await prisma.userTranslatedChapter.delete({
        where: {
          chapterId: chapter.id,
        },
      });

      // Cập nhật trạng thái chương thành DRAFT
      await prisma.userLibraryChapter.update({
        where: { id: chapter.id },
        data: { status: "DRAFT" },
      });

      return { message: "Đã xóa bản dịch thành công" };
    } catch (error) {
      console.error("Lỗi khi xóa bản dịch:", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách tất cả các phiên bản dịch của chương
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Array>} Danh sách phiên bản
   */
  getTranslationVersions: async (storyId, chapterNumber, userId) => {
    try {
      const chapter = await prisma.userLibraryChapter.findFirst({
        where: {
          storyId: storyId,
          chapterNumber: parseInt(chapterNumber),
          story: {
            userId: userId,
          },
        },
        include: {
          versions: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!chapter) {
        throw new Error("Không tìm thấy chương");
      }

      return chapter.versions.map((version) => ({
        ...version,
        createdAt: version.createdAt
          ? new Date(version.createdAt).toISOString()
          : null,
        updatedAt: version.updatedAt
          ? new Date(version.updatedAt).toISOString()
          : null,
      }));
    } catch (error) {
      console.error("Lỗi khi lấy danh sách phiên bản:", error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết một phiên bản dịch cụ thể
   * @param {string} storyId - ID của truyện
   * @param {number} chapterNumber - Số thứ tự chương
   * @param {string} versionId - ID của phiên bản
   * @param {string} userId - ID của người dùng
   * @returns {Promise<Object>} Chi tiết phiên bản
   */
  getTranslationVersion: async (storyId, chapterNumber, versionId, userId) => {
    try {
      const chapter = await prisma.userLibraryChapter.findFirst({
        where: {
          storyId: storyId,
          chapterNumber: parseInt(chapterNumber),
          story: {
            userId: userId,
          },
        },
        include: {
          versions: {
            where: {
              id: versionId,
            },
          },
        },
      });

      if (!chapter || !chapter.versions.length) {
        throw new Error("Không tìm thấy phiên bản dịch");
      }

      const version = chapter.versions[0];
      return {
        ...version,
        createdAt: version.createdAt
          ? new Date(version.createdAt).toISOString()
          : null,
        updatedAt: version.updatedAt
          ? new Date(version.updatedAt).toISOString()
          : null,
      };
    } catch (error) {
      console.error("Lỗi khi lấy phiên bản:", error);
      throw error;
    }
  },
};

module.exports = userLibraryService;
