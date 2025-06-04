const {
  translateText: performTranslation,
} = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");

exports.translateText = async (req, res) => {
  const { chapters, userKey, model } = req.body;
  const userId = req.user?.id; // Lấy userId từ token nếu có
  
  console.log("📌 Yêu cầu dịch nhận được:", {
    totalChapters: chapters?.length,
    hasUserKey: !!userKey,
    modelAI: model,
    userId: userId || 'anonymous'
  });

  // Validate input
  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  if (!model) {
    return res.status(400).json({ error: "Thiếu thông tin model." });
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
    // Khởi tạo ApiKeyManager cho model này
    const keyManager = new ApiKeyManager(model);
    await keyManager.loadDefaultKeys();

    const translationPromises = validChapters.map(async (ch, index) => {
      const startTime = Date.now();
      try {
        // Lấy key để sử dụng (userKey hoặc default key)
        const keyToUse = await keyManager.getKeyToUse(userId, userKey);
        console.log(`🔑 Sử dụng key cho chương ${index + 1}`);

        // Xử lý nội dung
        let translatedContent = "";
        if (ch.content && typeof ch.content === 'string') {
          try {
            translatedContent = await performTranslation(ch.content, keyToUse, model);
          } catch (err) {
            if (err.response?.status === 429) {
              // Xử lý lỗi rate limit
              await keyManager.handle429Error(userId, keyToUse);
              throw new Error("Rate limit exceeded. Thử lại sau.");
            } else if (err.response?.status === 400) {
              // Xử lý lỗi quota hết
              await keyManager.exhaustKey(userId, keyToUse);
              throw new Error("API key đã hết quota.");
            }
            throw err;
          }
        }

        // Xử lý tiêu đề
        let translatedTitle = "";
        if (ch.title && typeof ch.title === 'string') {
          try {
            translatedTitle = await performTranslation(ch.title, keyToUse, model);
          } catch (err) {
            if (err.response?.status === 429) {
              await keyManager.handle429Error(userId, keyToUse);
              throw new Error("Rate limit exceeded. Thử lại sau.");
            } else if (err.response?.status === 400) {
              await keyManager.exhaustKey(userId, keyToUse);
              throw new Error("API key đã hết quota.");
            }
            throw err;
          }
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
