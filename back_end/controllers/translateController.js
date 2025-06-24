const { translateText } = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");
const { prisma } = require("../config/prismaConfig");
const { toObjectId } = require("../config/prismaConfig");

exports.translateText = async (req, res) => {
  const { chapters, userKey, userKeys, model } = req.body;
  const userId = req.user?.id; // Lấy userId từ token nếu có

  console.log("📌 Yêu cầu dịch nhận được:", {
    chapters: chapters,
    totalChapters: chapters?.length,
    hasUserKey: !!userKey,
    hasUserKeys: !!userKeys,
    userKeysCount: userKeys?.length || 0,
    modelAI: model,
    userId: userId || "anonymous",
  });

  // Validate input
  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  if (!model) {
    return res.status(400).json({ error: "Thiếu thông tin model." });
  }

  // Validate từng chương
  const validChapters = chapters.filter((ch) => {
    if (!ch || typeof ch !== "object") {
      console.log("⚠️ Bỏ qua chương không hợp lệ:", ch);
      return false;
    }
    if (!ch.content && !ch.title) {
      console.log("⚠️ Bỏ qua chương không có nội dung và tiêu đề:", ch);
      return false;
    }

    return true;
  });
  console.log("validChapters nội dung của nó", validChapters);
  if (validChapters.length === 0) {
    return res
      .status(400)
      .json({ error: "Không có chương nào hợp lệ để dịch." });
  }

  console.log(`📚 Số chương hợp lệ cần dịch: ${validChapters.length}`);

  try {
    // Khởi tạo key manager
    const keyManager = new ApiKeyManager();

    // Xử lý keys - ưu tiên userKeys nếu có, nếu không thì dùng userKey
    let keysToUse = [];
    if (userKeys && Array.isArray(userKeys) && userKeys.length > 0) {
      keysToUse = userKeys;
      console.log(`🔑 Sử dụng ${userKeys.length} keys từ danh sách đã chọn`);
    } else if (userKey) {
      keysToUse = [userKey];
      console.log("🔑 Sử dụng 1 key từ userKey");
    } else {
      console.log("🔑 Không có key nào được cung cấp, sẽ dùng key mặc định");
    }

    // Kiểm tra xem có key khả dụng không
    // Sử dụng logic mới: lấy key khả dụng dựa trên usage record
    const keyToUse = await keyManager.getKeyToUse(userId, keysToUse, model);
    if (!keyToUse) {
      return res.status(400).json({
        error:
          "Không có key khả dụng. Vui lòng kiểm tra lại API key hoặc thử lại sau.",
      });
    }

    const translationPromises = validChapters.map(async (ch, index) => {
      const startTime = Date.now();
      let keyData;
      let translatedTitle, translatedContent;

      try {
        // Log thông tin chương để kiểm tra
        console.log(`📖 Thông tin chương ${index + 1}:`, {
          chapterNumber: ch.chapterNumber,
          chapterName: ch.title,
          content: ch.content
            ? ch.content.substring(0, 100) + "..."
            : "Không có nội dung",
          hasChapterName: !!ch.chapterName,
          chapterKeys: Object.keys(ch),
        });

        // Lấy key để sử dụng cho chương này
        keyData = await keyManager.getKeyToUse(userId, keysToUse, model);
        if (!keyData || !keyData.key) {
          throw new Error("Không tìm thấy key khả dụng cho chương này.");
        }
        console.log(
          `🔑 Sử dụng key cho chương ${
            ch.chapterNumber
          }: ${keyData.key.substring(0, 8)}... (isUserKey: ${
            keyData.isUserKey
          })`
        );

        // Xử lý nội dung
        const titlePromise = ch.title
          ? translateText(ch.title, keyData, model)
          : Promise.resolve({ translated: ch.title, usage: null });

        // Dịch nội dung nếu có
        const contentPromise = ch.content
          ? translateText(ch.content, keyData, model)
          : Promise.resolve({ translated: ch.content, usage: null });

        const [titleResult, contentResult] = await Promise.all([
          titlePromise,
          contentPromise,
        ]);

        translatedTitle = titleResult.translated || ch.title;
        translatedContent = contentResult.translated || ch.content;

        // Log kết quả
        console.log(
          `Chương ${ch.chapterNumber} - Tiêu đề dịch: ${translatedTitle}`
        );
        console.log(
          `Chương ${ch.chapterNumber} - Nội dung dịch: ${
            translatedContent
              ? translatedContent.substring(0, 70) + "..."
              : "Không có"
          }`
        );

        if (titleResult.isUnchanged || contentResult.isUnchanged) {
          throw new Error("Bản dịch không thay đổi so với bản gốc.");
        }
      } catch (err) {
        const errorMessage = err.message || err.toString();
        console.error(
          `❌ Lỗi dịch chương ${index + 1} (${ch.title}):`,
          errorMessage
        );

        // Xử lý lỗi quota/key
        if (keyData && keyData.usageId) {
          if (
            errorMessage.includes("Too Many Requests") ||
            errorMessage.includes("429")
          ) {
            await keyManager.exhaustKey(
              keyData.usageId,
              "COOLDOWN",
              keyData.isUserKey
            );
          } else if (
            errorMessage.includes("API key") ||
            errorMessage.includes("permission") ||
            errorMessage.includes("quota")
          ) {
            await keyManager.exhaustKey(
              keyData.usageId,
              "EXHAUSTED",
              keyData.isUserKey
            );
          }
        }

        // Ném lỗi ra ngoài để Promise.all có thể bắt được
        throw err;
      }

      const endTime = Date.now();
      const translationTime = (endTime - startTime) / 1000; // Thời gian dịch tính bằng giây

      console.log(
        `✅ Dịch xong chương ${index + 1}/${
          validChapters.length
        } | Thời gian: ${translationTime}s`
      );

      // Log dữ liệu trước khi return
      console.log(`📤 Dữ liệu chương ${index + 1} trước khi return:`, {
        originalTitle: ch.title,
        translatedTitle,
        hasTranslatedTitle: !!translatedTitle,
        originalContent: ch.content
          ? ch.content.substring(0, 100) + "..."
          : "Không có nội dung",
        translatedContent: translatedContent
          ? translatedContent.substring(0, 100) + "..."
          : "Không có nội dung",
        hasTranslatedContent: !!translatedContent,
        translationTime: translationTime,
      });

      return {
        ...ch,
        translatedTitle,
        translatedContent,
        timeTranslation: translationTime, // 👉 Thêm thời gian dịch
        status: "TRANSLATED",
      };
    });

    // Thay vì Promise.all, sử dụng Promise.allSettled để không bị dừng khi 1 chương lỗi
    const settledPromises = await Promise.allSettled(translationPromises);

    const translatedChapters = settledPromises.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // Lỗi đã được log bên trong, ở đây ta trả về chương gốc với thông tin lỗi
        return {
          ...validChapters[index],
          translatedTitle: validChapters[index].title,
          translatedContent: validChapters[index].content,
          translationError: result.reason.message,
          status: "FAILED",
        };
      }
    });

    // Log kết quả sau khi dịch xong tất cả các chương
    console.log("📚 Kết quả dịch tất cả các chương:", {
      totalChapters: translatedChapters.length,
      chapters: translatedChapters.map((ch, index) => ({
        chapterNumber: ch.chapterNumber,
        originalTitle: ch.title,
        translatedTitle: ch.translatedTitle,
        hasTranslatedTitle: !!ch.translatedTitle,
        originalContent: ch.content
          ? ch.content.substring(0, 100) + "..."
          : "Không có nội dung",
        translatedContent: ch.translatedContent
          ? ch.translatedContent.substring(0, 100) + "..."
          : "Không có nội dung",
        hasTranslatedContent: !!ch.translatedContent,
        status: ch.status,
      })),
    });

    // Lọc các chương có lỗi dịch (bao gồm cả lỗi translationError và lỗi thiếu nội dung)
    const failedChapters = translatedChapters.filter(
      (ch) =>
        ch.translationError || !ch.translatedTitle || !ch.translatedContent
    );
    const successfulChapters = translatedChapters.filter(
      (ch) => !ch.translationError && ch.translatedTitle && ch.translatedContent
    );

    if (failedChapters.length > 0) {
      console.warn(
        "⚠️ Có chương dịch không thành công:",
        failedChapters.map((ch) => ({
          chapterNumber: ch.chapterNumber,
          error: ch.translationError || "Thiếu nội dung dịch",
        }))
      );
    }

    // Kiểm tra xem còn key khả dụng không sau khi dịch
    const stillHasKeys = await keyManager.hasAvailableKeys(
      keysToUse,
      userId,
      model
    );
    if (!stillHasKeys) {
      console.warn("⚠️ Đã hết key khả dụng sau khi dịch");
    }

    res.json({
      chapters: translatedChapters,
      stats: {
        total: validChapters.length,
        success: successfulChapters.length,
        failed: failedChapters.length,
      },
      keyStatus: {
        hasAvailableKeys: stillHasKeys,
        lastError: keyManager.getLastError(),
      },
    });
  } catch (err) {
    console.error("❌ Lỗi dịch chương:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Kiểm tra lại API key hoặc nội dung.",
      details: err.message,
    });
  }
};
