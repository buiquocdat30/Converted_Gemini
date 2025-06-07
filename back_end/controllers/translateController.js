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
    
    // Kiểm tra xem có key khả dụng không
    const hasKeys = await keyManager.hasAvailableKeys(userKey, userId, model);
    if (!hasKeys) {
      const error = keyManager.getLastError();
      return res.status(400).json({ 
        error: error || "Không có key nào khả dụng cho model này",
        details: "Vui lòng thêm key mới hoặc liên hệ admin để được hỗ trợ."
      });
    }

    const translationPromises = validChapters.map(async (ch, index) => {
      const startTime = Date.now();
      try {
        // Lấy key để sử dụng (userKey hoặc default key)
        const keyToUse = await keyManager.getKeyToUse(userId, userKey, model);
        if (!keyToUse) {
          throw new Error("Không tìm thấy key khả dụng");
        }
        console.log(`🔑 Sử dụng key cho chương ${index + 1}`);

        // Xử lý nội dung
        let translatedContent = "";
        if (ch.content && typeof ch.content === 'string') {
          try {
            translatedContent = await performTranslation(ch.content, keyToUse, model);
          } catch (err) {
            const errorMessage = err.message || err.toString();
            console.error(`❌ Lỗi dịch nội dung chương ${index + 1}:`, errorMessage);

            // Xử lý các loại lỗi khác nhau
            if (errorMessage.includes("Too Many Requests") || errorMessage.includes("quotaMetric")) {
              if (userId && keyToUse) {
                await keyManager.handle429Error(userId, keyToUse);
              }
              throw new Error("Đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau.");
            }

            if (errorMessage.includes("API key") || errorMessage.includes("permission") || errorMessage.includes("quota")) {
              if (userId && keyToUse) {
                await keyManager.exhaustKey(userId, keyToUse);
              }
              throw new Error("API key không hợp lệ hoặc đã hết quota.");
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
            const errorMessage = err.message || err.toString();
            console.error(`❌ Lỗi dịch tiêu đề chương ${index + 1}:`, errorMessage);

            // Xử lý các loại lỗi khác nhau
            if (errorMessage.includes("Too Many Requests") || errorMessage.includes("quotaMetric")) {
              if (userId && keyToUse) {
                await keyManager.handle429Error(userId, keyToUse);
              }
              throw new Error("Đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau.");
            }

            if (errorMessage.includes("API key") || errorMessage.includes("permission") || errorMessage.includes("quota")) {
              if (userId && keyToUse) {
                await keyManager.exhaustKey(userId, keyToUse);
              }
              throw new Error("API key không hợp lệ hoặc đã hết quota.");
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

    // Kiểm tra xem còn key khả dụng không sau khi dịch
    const stillHasKeys = await keyManager.hasAvailableKeys(userKey, userId, model);
    if (!stillHasKeys) {
      console.warn("⚠️ Đã hết key khả dụng sau khi dịch");
    }

    res.json({ 
      chapters: translatedChapters,
      stats: {
        total: validChapters.length,
        success: successfulChapters.length,
        failed: failedChapters.length
      },
      keyStatus: {
        hasAvailableKeys: stillHasKeys,
        lastError: keyManager.getLastError()
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
