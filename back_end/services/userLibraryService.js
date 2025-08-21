const {prisma} = require("../config/prismaConfig");
const { readEpub } = require("./epubService");
const { readTxt } = require("./txtServices");
const { countWords, calculateChapterWordStats } = require("../utils/wordCounter");

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
        // Loại bỏ việc include chapters để chỉ lấy thông tin truyện, không phải toàn bộ chương
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
          // Đã loại bỏ việc xử lý chapters ở đây vì chúng không còn được include
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
          // Tính toán số từ cho chương
          const wordStats = calculateChapterWordStats(
            chapter.title || '',
            chapter.content || ''
          );
          
          return prisma.userLibraryChapter.create({
            data: {
              storyId: story.id,
              chapterNumber: chapter.chapterNumber ?? index + 1,
              chapterName: chapter.title,
              rawText: chapter.content,
              totalWord: wordStats.totalWords, // 👉 Thêm thuộc tính totalWord
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

        // 👉 CẬP NHẬT totalChapters trong bảng UserLibraryStory
        const totalChapters = createdChapters.length;
        await prisma.userLibraryStory.update({
          where: { id: story.id },
          data: {
            totalChapters: totalChapters,
            updatedAt: new Date()
          }
        });
        console.log(`✅ Đã cập nhật totalChapters: ${totalChapters}`);
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
   * @param {number} page - Số trang hiện tại
   * @param {number} limit - Số lượng chương mỗi trang
   * @returns {Promise<Array>} Danh sách chương
   */
  getChapters: async (storyId, userId, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;
      const take = limit;

      // Lấy tổng số chương cho truyện
      const totalChaptersCount = await prisma.userLibraryChapter.count({
        where: {
          story: {
            id: storyId,
            userId: userId,
          },
        },
      });

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
        skip: skip,
        take: take,
      });

      // Đảm bảo chapters là một mảng trước khi map
      const chaptersToFormat = Array.isArray(chapters) ? chapters : [];

      // Chuyển đổi các trường DateTime và đảm bảo thứ tự
      const formattedChapters = chaptersToFormat.map((chapter) => ({
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
      
      return { chapters: formattedChapters, totalChaptersCount }; // Trả về cả danh sách chương và tổng số lượng
    } catch (error) {
      console.error("Error in getChapters service:", error);
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

      // Tính toán số từ cho chương
      const wordStats = calculateChapterWordStats(
        data.chapterName || '',
        data.rawText || ''
      );

      // Tạo chương mới
      const newChapter = await prisma.userLibraryChapter.create({
        data: {
          storyId: data.storyId,
          chapterNumber: data.chapterNumber,
          chapterName: data.chapterName,
          rawText: data.rawText,
          totalWord: wordStats.totalWords, // 👉 Thêm thuộc tính totalWord
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 👉 Sau khi tạo chương mới, cập nhật totalChapters
      const chapterCount = await prisma.userLibraryChapter.count({
        where: { storyId: data.storyId }
      });

      await prisma.userLibraryStory.update({
        where: { id: data.storyId },
        data: {
          totalChapters: chapterCount,
          updatedAt: new Date()
        }
      });
      console.log(`✅ Đã cập nhật totalChapters: ${chapterCount}`);

      return newChapter;
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
    // Nếu có cập nhật rawText, tính toán lại totalWord
    if (data.rawText) {
      // Lấy thông tin chương hiện tại để có chapterName
      const currentChapter = await prisma.userLibraryChapter.findFirst({
        where: {
          storyId: storyId,
          chapterNumber: parseInt(chapterNumber),
          story: {
            userId: userId,
          },
        },
      });

      if (currentChapter) {
        // Tính toán lại số từ
        const wordStats = calculateChapterWordStats(
          currentChapter.chapterName || '',
          data.rawText
        );
        data.totalWord = wordStats.totalWords;
      }
    }

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
    // Xóa chương
    const deleteResult = await prisma.userLibraryChapter.deleteMany({
      where: {
        storyId: storyId,
        chapterNumber: parseInt(chapterNumber),
        story: {
          userId: userId,
        },
      },
    });

    // 👉 Sau khi xóa chương, cập nhật totalChapters
    const chapterCount = await prisma.userLibraryChapter.count({
      where: { storyId: storyId }
    });

    await prisma.userLibraryStory.update({
      where: { id: storyId },
      data: {
        totalChapters: chapterCount,
        updatedAt: new Date()
      }
    });
    console.log(`✅ Đã cập nhật totalChapters sau khi xóa: ${chapterCount}`);

    return deleteResult;
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
    console.log("data createTranslation", data)
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
          timeTranslation: data.timeTranslation || 0, // 👉 Thêm thời gian dịch
          updatedAt: new Date(),
        },
        create: {
          chapterId: chapter.id,
          translatedTitle: data.translatedTitle,
          translatedContent: data.translatedContent,
          timeTranslation: data.timeTranslation || 0, // 👉 Thêm thời gian dịch
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
    console.log("data updateTranslation", data)
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

      if (!chapter) {
        throw new Error("Không tìm thấy chương");
      }

      // Nếu đã có bản dịch, lưu phiên bản cũ
      if (chapter.translation) {
        await prisma.userTranslationVersion.create({
          data: {
            chapterId: chapter.id,
            translatedText: chapter.translation.translatedContent,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Sử dụng upsert để tạo mới hoặc cập nhật bản dịch
      const updatedTranslation = await prisma.userTranslatedChapter.upsert({
        where: {
          chapterId: chapter.id,
        },
        update: {
          translatedTitle: data.translatedTitle,
          translatedContent: data.translatedContent,
          timeTranslation: data.timeTranslation || 0, // 👉 Thêm thời gian dịch
          updatedAt: new Date(),
        },
        create: {
          chapterId: chapter.id,
          translatedTitle: data.translatedTitle,
          translatedContent: data.translatedContent,
          timeTranslation: data.timeTranslation || 0, // 👉 Thêm thời gian dịch
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Cập nhật trạng thái chương
      await prisma.userLibraryChapter.update({
        where: { id: chapter.id },
        data: { 
          status: chapter.translation ? "REVIEWING" : "TRANSLATED" 
        },
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