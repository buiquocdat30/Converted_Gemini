const {
  translateText: performTranslation,
} = require("../services/translateService");

exports.translateText = async (req, res) => {
  const { chapters, key, model } = req.body;
  
  console.log("📌 Yêu cầu dịch nhận được:", {
    totalChapters: chapters?.length,
    hasKey: !!key,
    modelAI: model,
  });

  // Validate input
  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  // Validate từng chương
  const validChapters = chapters.filter(ch => {
    if (!ch || typeof ch !== 'object') {
      console.log("⚠️ Bỏ qua chương không hợp lệ:", ch);
      return false;
    }
    if (!ch.content && !ch.title) {
      console.log("⚠️ Bỏ qua chương không có nội dung và tiêu đề:", ch);
      return false;
    }
    return true;
  });

  if (validChapters.length === 0) {
    return res.status(400).json({ error: "Không có chương nào hợp lệ để dịch." });
  }

  console.log(`📚 Số chương hợp lệ cần dịch: ${validChapters.length}`);

  try {
    const translationPromises = validChapters.map(async (ch, index) => {
      const startTime = Date.now();
      try {
        // ⚡️ Lấy key riêng cho mỗi chương
        const customKey = key || null;

        // Xử lý nội dung
        let translatedContent = "";
        if (ch.content && typeof ch.content === 'string') {
          translatedContent = await performTranslation(ch.content, customKey, model);
        }

        // Xử lý tiêu đề
        let translatedTitle = "";
        if (ch.title && typeof ch.title === 'string') {
          translatedTitle = await performTranslation(ch.title, customKey, model);
        }

        const endTime = Date.now();

        console.log(
          `✅ Dịch xong chương ${index + 1}/${validChapters.length} | Thời gian: ${
            (endTime - startTime) / 1000
          }s`
        );

        return {
          ...ch,
          translatedTitle: translatedTitle || ch.title,
          translated: translatedContent || ch.content,
        };
      } catch (err) {
        console.error(`❌ Lỗi dịch chương ${index + 1}:`, err.message);
        // Trả về chương gốc nếu dịch thất bại
        return {
          ...ch,
          translatedTitle: ch.title,
          translated: ch.content,
          translationError: err.message
        };
      }
    });

    const translatedChapters = await Promise.all(translationPromises);

    // Lọc các chương có lỗi dịch
    const successfulChapters = translatedChapters.filter(ch => !ch.translationError);
    const failedChapters = translatedChapters.filter(ch => ch.translationError);

    console.log("📊 Kết quả dịch:", {
      total: validChapters.length,
      success: successfulChapters.length,
      failed: failedChapters.length
    });

    res.json({ 
      chapters: translatedChapters,
      stats: {
        total: validChapters.length,
        success: successfulChapters.length,
        failed: failedChapters.length
      }
    });
  } catch (err) {
    console.error("❌ Lỗi dịch chương:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Kiểm tra lại API key hoặc nội dung.",
      details: err.message
    });
  }
};
