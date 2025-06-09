const { translateText } = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");
const { prisma } = require("../config/prismaConfig");
const { toObjectId } = require("../config/prismaConfig");

exports.translateText = async (req, res) => {
  const { chapters, userKey, model } = req.body;
  const userId = req.user?.id; // Lấy userId từ token nếu có
  
  console.log("📌 Yêu cầu dịch nhận được:", {
    chapters: chapters,
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
  console.log("validChapters nội dung của nó", validChapters)
  if (validChapters.length === 0) {
    return res.status(400).json({ error: "Không có chương nào hợp lệ để dịch." });
  }

  console.log(`📚 Số chương hợp lệ cần dịch: ${validChapters.length}`);

  try {
    // Khởi tạo ApiKeyManager cho model này
    const keyManager = new ApiKeyManager(model);
    
    // Kiểm tra và lưu key mới trước khi sử dụng
    if (userKey && userId) {
      try {
        // Kiểm tra xem key có tồn tại trong database không
        const existingKey = await prisma.userApiKey.findFirst({
          where: {
            userId: toObjectId(userId),
            key: userKey
          }
        });

        if (!existingKey) {
          console.log("🔑 Phát hiện key mới, đang kiểm tra và lưu...");
          
          // Kiểm tra key có hợp lệ không
          const isValid = await keyManager.validateKey(userKey);
          if (!isValid) {
            throw new Error("API key không hợp lệ");
          }

          // Xác định provider và model
          const { provider, models } = await keyManager.determineProviderAndModel(userKey, req.user?.id);
          console.log("provider translateController", provider);
          console.log("models translateController", models.map(m => m.value));

          if (!provider || !models || models.length === 0) {
            throw new Error("Không thể xác định provider hoặc models cho key này");
          }

          // Lấy model IDs từ danh sách models
          const modelIds = models.map(m => m.id);

          // Lưu key mới vào database với tất cả model IDs
          const newKey = await prisma.userApiKey.create({
            data: {
              userId: toObjectId(userId),
              key: userKey,
              modelIds: modelIds,
            }
          });

          console.log("✅ Đã lưu key mới:", {
            keyId: newKey.id,
            userId: newKey.userId,
            modelIds: newKey.modelIds,
            status: newKey.status,
            usageCount: newKey.usageCount,
            createdAt: newKey.createdAt,
            updatedAt: newKey.updatedAt
          });
        }
      } catch (err) {
        console.error("❌ Lỗi khi xử lý key mới:", err);
        return res.status(400).json({
          error: "Không thể sử dụng key này",
          details: err.message
        });
      }
    }

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
        // Log thông tin chương để kiểm tra
        console.log(`📖 Thông tin chương ${index + 1}:`, {
          chapterNumber: ch.chapterNumber,
          chapterName: ch.title,
          content: ch.content ? ch.content.substring(0, 100) + '...' : 'Không có nội dung',
          hasChapterName: !!ch.chapterName,
          chapterKeys: Object.keys(ch)
        });

        // Lấy key để sử dụng (userKey hoặc default key)
        const keyToUse = await keyManager.getKeyToUse(userId, userKey, model);
        if (!keyToUse) {
          throw new Error("Không tìm thấy key khả dụng");
        }
        console.log(`🔑 Sử dụng key cho chương ${ch.chapterNumber }`);

        // Xử lý nội dung
        let translatedTitle = "";
        let translatedContent = "";
        if (ch.content && typeof ch.content === 'string') {
          try {
            // Dịch tiêu đề chương
            translatedTitle = await translateText(ch.title, keyToUse, model);
            console.log("translatedTitle translationPromises", translatedTitle)
            // Dịch nội dung chương
            translatedContent = await translateText(ch.content, keyToUse, model);
            console.log("translatedContent translationPromises", translatedContent)
            
          } catch (err) {
            const errorMessage = err.message || err.toString();
            console.error(`❌ Lỗi dịch chương ${index + 1}:`, errorMessage);

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

        // Log dữ liệu trước khi return
        console.log(`📤 Dữ liệu chương ${index + 1} trước khi return:`, {
          originalTitle: ch.title,
          translatedTitle,
          hasTranslatedTitle: !!translatedTitle,
          originalContent: ch.content ? ch.content.substring(0, 100) + '...' : 'Không có nội dung',
          translatedContent: translatedContent ? translatedContent.substring(0, 100) + '...' : 'Không có nội dung',
          hasTranslatedContent: !!translatedContent
        });

        return {
          ...ch,
          translatedTitle: translatedTitle || ch.title,
          translatedContent: translatedContent || ch.content,
          status: "TRANSLATED"
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
    
    // Log kết quả sau khi dịch xong tất cả các chương
    console.log("📚 Kết quả dịch tất cả các chương:", {
      totalChapters: translatedChapters.length,
      chapters: translatedChapters.map((ch, index) => ({
        chapterNumber: ch.chapterNumber,
        originalTitle: ch.title,
        translatedTitle: ch.translatedTitle,
        hasTranslatedTitle: !!ch.translatedTitle,
        originalContent: ch.content ? ch.content.substring(0, 100) + '...' : 'Không có nội dung',
        translatedContent: ch.translatedContent ? ch.translatedContent.substring(0, 100) + '...' : 'Không có nội dung',
        hasTranslatedContent: !!ch.translatedContent,
        status: ch.status
      }))
    });

    // Lọc các chương có lỗi dịch (bao gồm cả lỗi translationError và lỗi thiếu nội dung)
    const failedChapters = translatedChapters.filter(ch => 
      ch.translationError || !ch.translatedTitle || !ch.translatedContent
    );
    const successfulChapters = translatedChapters.filter(ch => 
      !ch.translationError && ch.translatedTitle && ch.translatedContent
    );

    if (failedChapters.length > 0) {
      console.warn("⚠️ Có chương dịch không thành công:", 
        failedChapters.map(ch => ({
          chapterNumber: ch.chapterNumber,
          error: ch.translationError || 'Thiếu nội dung dịch'
        }))
      );
    }

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
