const { translateText, addTranslationJob, getJobStatus } = require('../services/translateService');
const ApiKeyManager = require("../services/apiKeyManagers");
const { prisma } = require("../config/prismaConfig");
const { toObjectId } = require("../config/prismaConfig");

const translateController = {
  // Dịch một chương
  translateChapter: async (req, res) => {
    try {
      const { chapters, userKey, model } = req.body;
      const userId = req.user?.id;
      
      if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
        return res.status(400).json({ error: 'Thiếu thông tin chương cần dịch' });
      }

      const results = [];
      
      for (const chapter of chapters) {
        try {
          // Kiểm tra xem chương đã được dịch chưa
          const existingChapter = await prisma.chapter.findFirst({
            where: {
              storyId: chapter.storyId,
              chapterNumber: chapter.chapterNumber,
              translatedContent: { not: null }
            }
          });

          if (existingChapter) {
            console.log(`📝 Chương ${chapter.chapterNumber} đã được dịch trước đó`);
            results.push({
              chapterNumber: chapter.chapterNumber,
              title: chapter.title,
              translatedTitle: existingChapter.translatedTitle,
              content: chapter.content,
              translatedContent: existingChapter.translatedContent,
              status: 'TRANSLATED',
              jobId: null,
              message: 'Chương đã được dịch trước đó'
            });
            continue;
          }

          // Nếu chưa dịch, tạo job mới
          const job = await addTranslationJob(chapter, userKey, model);
          
          // Lấy kết quả dịch
          const translated = await translateText(chapter.content, userKey, model);
          
          results.push({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            translatedTitle: chapter.title, // Có thể thêm logic dịch tiêu đề sau
            content: chapter.content,
            translatedContent: translated,
            status: 'TRANSLATED',
            jobId: job.id
          });
        } catch (error) {
          console.error(`❌ Lỗi khi dịch chương ${chapter.chapterNumber}:`, error);
          results.push({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            error: error.message,
            status: 'FAILED'
          });
        }
      }

      res.json({ chapters: results });
    } catch (error) {
      console.error('❌ Lỗi khi xử lý yêu cầu dịch:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Lấy trạng thái job
  getJobStatus: async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = await getJobStatus(jobId);
      res.json(status);
    } catch (error) {
      console.error('❌ Lỗi khi lấy trạng thái job:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Dừng job
  stopJob: async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await translationQueue.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Không tìm thấy job' });
      }

      // Lấy thông tin chương từ job data
      const { chapter } = job.data;
      
      // Kiểm tra xem job đã hoàn thành chưa
      const state = await job.getState();
      if (state === 'completed') {
        // Nếu đã hoàn thành, trả về rawText và thông báo
        return res.json({ 
          message: 'Đã dừng dịch',
          status: 'stopped',
          chapter: {
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.rawText || chapter.content, // Trả về rawText
            translatedContent: null,
            status: 'STOPPED'
          }
        });
      }

      // Nếu job đang chạy, dừng và xóa job
      await job.remove();
      
      res.json({ 
        message: 'Đã dừng dịch',
        status: 'stopped',
        chapter: {
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          content: chapter.rawText || chapter.content,
          translatedContent: null,
          status: 'STOPPED'
        }
      });
    } catch (error) {
      console.error('❌ Lỗi khi dừng job:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = translateController;
