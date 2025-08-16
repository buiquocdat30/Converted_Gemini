const userLibraryService = require("../services/userLibraryService");
const { readEpub } = require("../services/epubService");
const { readTxt } = require("../services/txtServices");
const path = require("path");
const redisClient = require("../redisClient");

const userLibraryController = {
  // ==============================================
  // PHẦN 1: QUẢN LÝ TRUYỆN (STORY MANAGEMENT)
  // ==============================================

  /**
   * Lấy danh sách tất cả truyện của user
   */
  getAllStories: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log("getAllStories - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const stories = await userLibraryService.getAllStories(userId);
      res.json(stories);
    } catch (error) {
      console.error("Error getting stories:", error);
      res.status(500).json({ error: "Lỗi khi lấy danh sách truyện" });
    }
  },

  /**
   * Lấy thông tin chi tiết một truyện theo ID
   */
  getStoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      console.log("getStoryById - Story ID:", id);
      console.log("getStoryById - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const story = await userLibraryService.getStoryById(id, userId);
      if (!story) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      

      res.json(story);
    } catch (error) {
      console.error("Error getting story:", error);
      res.status(500).json({ error: "Lỗi khi lấy thông tin truyện" });
    }
  },

  /**
   * Tạo truyện mới
   */
  createStory: async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, author, chapters, filePath } = req.body;
      console.log("createStory - User ID:", userId);
      console.log("createStory - Story data:", { name, author, filePath });

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      if (!name || !author) {
        return res
          .status(400)
          .json({ error: "Thiếu thông tin truyện (tên hoặc tác giả)" });
      }

      let processedChapters = [];

      // Xử lý file nếu có
      if (filePath) {
        const ext = path.extname(filePath).toLowerCase();
        try {
          if (ext === ".epub") {
            processedChapters = await readEpub(filePath);
          } else if (ext === ".txt") {
            processedChapters = await readTxt(filePath);
          }
        } catch (error) {
          console.error("Error processing file:", error);
          return res
            .status(400)
            .json({ error: "Lỗi khi xử lý file: " + error.message });
        }
      } else if (chapters && Array.isArray(chapters)) {
        processedChapters = chapters;
      }

      const newStory = await userLibraryService.createStory({
        name,
        author,
        userId,
        chapters: processedChapters,
      });

      res.status(201).json(newStory);
    } catch (error) {
      console.error("Error creating story:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi tạo truyện mới: " + error.message });
    }
  },

  /**
   * Cập nhật thông tin truyện
   */
  updateStory: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, author, storyAvatar, isComplete } = req.body;
      console.log("updateStory - Story ID:", id);
      console.log("updateStory - User ID:", userId);
      console.log("updateStory - Update data:", { name, author, isComplete });

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const updatedStory = await userLibraryService.updateStory(id, userId, {
        name,
        author,
        storyAvatar,
        isComplete
      });

      if (updatedStory.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      res.json({ message: "Cập nhật truyện thành công" });
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ error: "Lỗi khi cập nhật truyện" });
    }
  },

  /**
   * Ẩn truyện (xóa mềm)
   */
  hideStory: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      console.log("hideStory - Story ID:", id);
      console.log("hideStory - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const hiddenStory = await userLibraryService.hideStory(id, userId);

      if (hiddenStory.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      res.json({ message: "Đã ẩn truyện thành công" });
    } catch (error) {
      console.error("Error hiding story:", error);
      res.status(500).json({ error: "Lỗi khi ẩn truyện" });
    }
  },

  /**
   * Xóa truyện vĩnh viễn (xóa cứng)
   */
  deleteStory: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      console.log("deleteStory - Story ID:", id);
      console.log("deleteStory - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const deletedStory = await userLibraryService.deleteStory(id, userId);

      if (deletedStory.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      res.json({ message: "Đã xóa truyện vĩnh viễn" });
    } catch (error) {
      console.error("Error deleting story:", error);
      res.status(500).json({ error: "Lỗi khi xóa truyện" });
    }
  },

  // ==============================================
  // PHẦN 2: QUẢN LÝ CHƯƠNG (CHAPTER MANAGEMENT)
  // ==============================================

  /**
   * Lấy danh sách chương của truyện
   */
  getChapters: async (req, res) => {
    try {
      const { storyId } = req.params;
      const { page = 1, limit = 10 } = req.query; // Thêm phân trang
      const userId = req.user.id;
      console.log("getChapters - Story ID:", storyId);
      console.log("getChapters - User ID:", userId);
      console.log(`getChapters - Page: ${page}, Limit: ${limit}`);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const cacheKey = `chapters:${storyId}:${page}:${limit}:userId:${userId}`;
      console.log(`[REDIS] Kiểm tra cache cho key: ${cacheKey}`);
      const cachedChapters = await redisClient.get(cacheKey);

      if (cachedChapters) {
        console.log(`[REDIS] Cache HIT cho key: ${cacheKey}`);
        const parsedChapters = JSON.parse(cachedChapters);
        // Thêm trường hasError cho từng chương từ cache
        const chaptersWithError = parsedChapters.map(chapter => ({
          ...chapter,
          hasError: chapter.status === 'FAILED' || !!chapter.translationError
        }));
        return res.json(chaptersWithError);
      }

      console.log(`[REDIS] Cache MISS cho key: ${cacheKey}. Đang lấy từ DB...`);
      console.log("Giá trị của userLibraryService trước khi gọi: ", userLibraryService);
      const chapters = await userLibraryService.getChapters(storyId, userId, parseInt(page), parseInt(limit));
      
      // Thêm trường hasError cho từng chương từ DB
      const chaptersWithError = chapters.map(chapter => ({
        ...chapter,
        hasError: chapter.status === 'FAILED' || !!chapter.translationError
      }));

      // Lưu vào Redis cache với TTL (ví dụ: 1 giờ = 3600 giây)
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(chaptersWithError));
      console.log(`[REDIS] Đã lưu vào cache cho key: ${cacheKey}`);
      
      res.json(chaptersWithError);
    } catch (error) {
      console.error("Error getting chapters in controller:", error);
      res.status(500).json({ error: "Lỗi khi lấy danh sách chương" });
    }
  },

  /**
   * Thêm chương mới vào truyện
   */
  addChapter: async (req, res) => {
    try {
      const { storyId } = req.params;
      const { chapterNumber, rawText, chapterName } = req.body;
      const userId = req.user.id;
      console.log("addChapter - Story ID:", storyId);
      console.log("addChapter - User ID:", userId);
      console.log("addChapter - Chapter data:", { chapterNumber, rawText });

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const story = await userLibraryService.getStoryById(storyId, userId);

      if (!story) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      const newChapter = await userLibraryService.addChapter({
        storyId,
        chapterNumber,
        chapterName,
        rawText,
      });

      res.status(201).json(newChapter);
    } catch (error) {
      console.error("Error adding chapter:", error);
      res.status(500).json({ error: "Lỗi khi thêm chương mới" });
    }
  },

  /**
   * Cập nhật nội dung chương
   */
  updateChapter: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const { rawText } = req.body;
      const userId = req.user.id;
      console.log("updateChapter - Story ID:", storyId);
      console.log("updateChapter - Chapter number:", chapterNumber);
      console.log("updateChapter - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const updatedChapter = await userLibraryService.updateChapter(
        storyId,
        chapterNumber,
        userId,
        { rawText }
      );

      if (updatedChapter.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy chương" });
      }

      res.json({ message: "Cập nhật chương thành công" });
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ error: "Lỗi khi cập nhật chương" });
    }
  },

  /**
   * Xóa chương
   */
  deleteChapter: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const userId = req.user.id;
      console.log("deleteChapter - Story ID:", storyId);
      console.log("deleteChapter - Chapter number:", chapterNumber);
      console.log("deleteChapter - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const deletedChapter = await userLibraryService.deleteChapter(
        storyId,
        chapterNumber,
        userId
      );

      if (deletedChapter.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy chương" });
      }

      res.json({ message: "Xóa chương thành công" });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ error: "Lỗi khi xóa chương" });
    }
  },

  // ==============================================
  // PHẦN 3: QUẢN LÝ BẢN DỊCH (TRANSLATION MANAGEMENT)
  // ==============================================

  /**
   * Tạo bản dịch mới cho chương
   */
  createTranslation: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const userId = req.user.id;
      const { translatedTitle, translatedContent, timeTranslation } = req.body;
      console.log("createTranslation - Story ID:", storyId);
      console.log("createTranslation - Chapter number:", chapterNumber);
      console.log("createTranslation - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      if (!translatedTitle || !translatedContent) {
        return res.status(400).json({ error: "Thiếu thông tin bản dịch" });
      }

      const translation = await userLibraryService.createTranslation(
        storyId,
        chapterNumber,
        userId,
        { translatedTitle, translatedContent, timeTranslation }
      );

      res.status(201).json(translation);
    } catch (error) {
      console.error("Error creating translation:", error);
      res.status(500).json({ error: "Lỗi khi tạo bản dịch: " + error.message });
    }
  },

  /**
   * Cập nhật bản dịch của chương
   */
  updateTranslation: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const userId = req.user.id;
      const { translatedTitle, translatedContent, timeTranslation } = req.body;
      console.log("updateTranslation - Story ID:", storyId);
      console.log("updateTranslation - Chapter number:", chapterNumber);
      console.log("updateTranslation - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      if (!translatedTitle || !translatedContent) {
        return res.status(400).json({ error: "Thiếu thông tin bản dịch" });
      }

      const translation = await userLibraryService.updateTranslation(
        storyId,
        chapterNumber,
        userId,
        { translatedTitle, translatedContent, timeTranslation }
      );

      res.json(translation);
    } catch (error) {
      console.error("Error updating translation:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi cập nhật bản dịch: " + error.message });
    }
  },

  /**
   * Xóa bản dịch của chương
   */
  deleteTranslation: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const userId = req.user.id;
      console.log("deleteTranslation - Story ID:", storyId);
      console.log("deleteTranslation - Chapter number:", chapterNumber);
      console.log("deleteTranslation - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const result = await userLibraryService.deleteTranslation(
        storyId,
        chapterNumber,
        userId
      );
      res.json(result);
    } catch (error) {
      console.error("Error deleting translation:", error);
      res.status(500).json({ error: "Lỗi khi xóa bản dịch: " + error.message });
    }
  },

  /**
   * Lấy danh sách tất cả các phiên bản dịch của chương
   */
  getAllTranslationVersion: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const userId = req.user.id;
      console.log("getAllTranslationVersion - Story ID:", storyId);
      console.log("getAllTranslationVersion - Chapter number:", chapterNumber);
      console.log("getAllTranslationVersion - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const versions = await userLibraryService.getTranslationVersions(
        storyId,
        chapterNumber,
        userId
      );

      res.json(versions);
    } catch (error) {
      console.error("Error getting translation versions:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi lấy danh sách phiên bản: " + error.message });
    }
  },

  /**
   * Lấy chi tiết một phiên bản dịch cụ thể
   */
  getOneTranslationVersion: async (req, res) => {
    try {
      const { storyId, chapterNumber, versionId } = req.params;
      const userId = req.user.id;
      console.log("getOneTranslationVersion - Story ID:", storyId);
      console.log("getOneTranslationVersion - Chapter number:", chapterNumber);
      console.log("getOneTranslationVersion - Version ID:", versionId);
      console.log("getOneTranslationVersion - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const version = await userLibraryService.getTranslationVersion(
        storyId,
        chapterNumber,
        versionId,
        userId
      );

      res.json(version);
    } catch (error) {
      console.error("Error getting translation version:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi lấy phiên bản: " + error.message });
    }
  },
};

module.exports = userLibraryController;
