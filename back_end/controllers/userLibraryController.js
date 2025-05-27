const userLibraryService = require("../services/userLibraryService");
const { readEpub } = require("../services/epubService");
const { readTxt } = require("../services/txtServices");
const path = require("path");

const userLibraryController = {
  // Lấy tất cả truyện của user
  getAllStories: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy userId từ middleware
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

  // Lấy truyện theo ID
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

  // Tạo truyện mới
  createStory: async (req, res) => {
    try {
      const userId = req.user.id;
      //console.log("createStory - Request body:", req.body);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const { name, author, chapters, filePath } = req.body;
      console.log("createStory - User ID:", userId);
      console.log("createStory - Story data:", { name, author, filePath });

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
        // Sử dụng chapters từ request nếu không có file
       console.log(" ĐÂY LÀ ĐẦU VÀO USERLIRARYUSER:", processedChapters);
        processedChapters = chapters;
      }

      // Tạo truyện với chapters
      const newStory = await userLibraryService.createStory({
        name,
        author,
        userId,
        chapters: processedChapters,
      });

      // console.log("createStory - Created story:", newStory);
      res.status(201).json(newStory);
    } catch (error) {
      console.error("Error creating story:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi tạo truyện mới: " + error.message });
    }
  },

  // Cập nhật truyện
  updateStory: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, author, storyAvatar } = req.body;
      console.log("updateStory - Story ID:", id);
      console.log("updateStory - User ID:", userId);
      console.log("updateStory - Update data:", { name, author });

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const updatedStory = await userLibraryService.updateStory(id, userId, {
        name,
        author,
        storyAvatar,
      });
      console.log("updateStory - Update result:", updatedStory);

      if (updatedStory.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      res.json({ message: "Cập nhật truyện thành công" });
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ error: "Lỗi khi cập nhật truyện" });
    }
  },

  // Ẩn truyện (xóa mềm)
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
      console.log("hideStory - Hide result:", hiddenStory);

      if (hiddenStory.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      res.json({ message: "Đã ẩn truyện thành công" });
    } catch (error) {
      console.error("Error hiding story:", error);
      res.status(500).json({ error: "Lỗi khi ẩn truyện" });
    }
  },

  // Xóa truyện vĩnh viễn (xóa cứng)
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
      console.log("deleteStory - Delete result:", deletedStory);

      if (deletedStory.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      res.json({ message: "Đã xóa truyện vĩnh viễn" });
    } catch (error) {
      console.error("Error deleting story:", error);
      res.status(500).json({ error: "Lỗi khi xóa truyện" });
    }
  },

  // Lấy danh sách chương
  getChapters: async (req, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user.id;
      console.log("getChapters - Story ID:", storyId);
      console.log("getChapters - User ID:", userId);

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const chapters = await userLibraryService.getChapters(storyId, userId);
      console.log("getChapters - Found chapters:", chapters);
      res.json(chapters);
    } catch (error) {
      console.error("Error getting chapters:", error);
      res.status(500).json({ error: "Lỗi khi lấy danh sách chương" });
    }
  },

  // Thêm chương mới
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

      // Kiểm tra truyện tồn tại và thuộc về user
      const story = await userLibraryService.getStoryById(storyId, userId);
      console.log("addChapter - Found story:", story.chapters.map(c => `${c.chapterNumber}. ${c.chapterName}`));

      if (!story) {
        return res.status(404).json({ error: "Không tìm thấy truyện" });
      }

      const newChapter = await userLibraryService.addChapter({
        storyId,
        chapterNumber,
        chapterName,
        rawText,
      });
      console.log("addChapter - Created chapter:", newChapter);

      res.status(201).json(newChapter);
    } catch (error) {
      console.error("Error adding chapter:", error);
      res.status(500).json({ error: "Lỗi khi thêm chương mới" });
    }
  },

  // Cập nhật chương
  updateChapter: async (req, res) => {
    try {
      const { storyId, chapterNumber } = req.params;
      const { rawText } = req.body;
      const userId = req.user.id;
      console.log("updateChapter - Story ID:", storyId);
      console.log("updateChapter - Chapter number:", chapterNumber);
      console.log("updateChapter - User ID:", userId);
      console.log("updateChapter - Update data:", { rawText });

      if (!userId) {
        return res.status(400).json({ error: "Không tìm thấy ID người dùng" });
      }

      const updatedChapter = await userLibraryService.updateChapter(
        storyId,
        chapterNumber,
        userId,
        { rawText }
      );
      console.log("updateChapter - Update result:", updatedChapter);

      if (updatedChapter.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy chương" });
      }

      res.json({ message: "Cập nhật chương thành công" });
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ error: "Lỗi khi cập nhật chương" });
    }
  },

  // Xóa chương
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
      console.log("deleteChapter - Delete result:", deletedChapter);

      if (deletedChapter.count === 0) {
        return res.status(404).json({ error: "Không tìm thấy chương" });
      }

      res.json({ message: "Xóa chương thành công" });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ error: "Lỗi khi xóa chương" });
    }
  },
};

module.exports = userLibraryController;
