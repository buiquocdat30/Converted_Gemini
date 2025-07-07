const { translateText } = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");
const { prisma } = require("../config/prismaConfig");
const { toObjectId } = require("../config/prismaConfig");
const { myQueue } = require('../utils/queue');

exports.translateText = async (req, res) => {
  const { chapters, userKey, userKeys, model, storyId } = req.body;
  const userId = req.user?.id; // Lấy userId từ token nếu có

  console.log("📌 Yêu cầu dịch nhận được:", {
    chapters: chapters,
    totalChapters: chapters?.length,
    hasUserKey: !!userKey,
    hasUserKeys: !!userKeys,
    userKeysCount: userKeys?.length || 0,
    modelAI: model,
    storyId: storyId,
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

    // Tích lũy glossary đã xuất hiện trong batch
    let glossarySet = new Set();

    const translationPromises = validChapters.map(async (ch, index) => {
      const startTime = Date.now();
      let keyData;
      let translatedTitle, translatedContent;
      let glossarySection = "";
      let glossaryRaw = "";

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

        // Xử lý nội dung - truyền storyId vào translateText
        const titlePromise = ch.title
          ? translateText(ch.title, keyData, model, 'title', storyId)
          : Promise.resolve({ translated: ch.title, usage: null, isUnchanged: false });

        // Dịch nội dung nếu có - truyền storyId vào translateText
        const contentPromise = ch.content
          ? translateText(ch.content, keyData, model, 'content', storyId)
          : Promise.resolve({ translated: ch.content, usage: null, isUnchanged: false });

        const [titleResult, contentResult] = await Promise.all([
          titlePromise,
          contentPromise,
        ]);

        // Log chi tiết kết quả từ translateService
        console.log(`🔍 Kết quả titleResult cho chương ${ch.chapterNumber}:`, {
          hasTranslated: !!titleResult.translated,
          translatedLength: titleResult.translated?.length || 0,
          isUnchanged: titleResult.isUnchanged,
          hasError: !!titleResult.error,
          translatedPreview: titleResult.translated?.substring(0, 50) + "..."
        });

        console.log(`🔍 Kết quả contentResult cho chương ${ch.chapterNumber}:`, {
          hasTranslated: !!contentResult.translated,
          translatedLength: contentResult.translated?.length || 0,
          isUnchanged: contentResult.isUnchanged,
          hasError: !!contentResult.error,
          translatedPreview: contentResult.translated?.substring(0, 50) + "..."
        });

        // Xử lý kết quả dịch - Kiểm tra lỗi trước
        if (titleResult.hasError || contentResult.hasError) {
          console.warn(
            `⚠️ Có lỗi trong quá trình dịch chương ${ch.chapterNumber}:`,
            {
              titleError: titleResult.error,
              contentError: contentResult.error,
            }
          );
          
          // Nếu có lỗi, throw error để Promise.allSettled có thể bắt được
          const errorMessage = titleResult.error || contentResult.error || "Lỗi dịch không xác định";
          throw new Error(errorMessage);
        }

        // Nếu không có lỗi, xử lý kết quả bình thường
        translatedTitle = titleResult.translated || ch.title;
        translatedContent = contentResult.translated || ch.content;

        // Log kết quả sau khi xử lý
        console.log(`📋 Kết quả xử lý cho chương ${ch.chapterNumber}:`, {
          originalTitle: ch.title,
          finalTranslatedTitle: translatedTitle,
          originalContentLength: ch.content?.length || 0,
          finalTranslatedContentLength: translatedContent?.length || 0,
          titleChanged: translatedTitle !== ch.title,
          contentChanged: translatedContent !== ch.content
        });

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

        // Log warning nếu bản dịch không thay đổi
        if (titleResult.isUnchanged || contentResult.isUnchanged) {
          console.warn(
            `⚠️ Bản dịch không thay đổi cho chương ${ch.chapterNumber}`
          );
        }

        // Sau khi dịch xong nội dung, parse glossary nếu có
        if (contentResult.translated) {
          const glossaryMatch = contentResult.translated.match(/📚 THƯ VIỆN TỪ MỚI:\n([\s\S]*?)(?=\n---|$)/);
          if (glossaryMatch) {
            glossaryRaw = glossaryMatch[1].trim();
            // Lấy từng dòng glossary
            let glossaryLines = glossaryRaw.split('\n').map(l => l.trim()).filter(l => l && l !== 'Không có từ mới');
            // Loại bỏ các từ đã xuất hiện ở các chương trước
            let newGlossaryLines = [];
            for (let line of glossaryLines) {
              // Lấy tên gốc phía trước dấu =
              const match = line.match(/^(.+?)\s*=\s*/);
              if (match) {
                const original = match[1].trim();
                if (!glossarySet.has(original)) {
                  glossarySet.add(original);
                  newGlossaryLines.push(line);
                }
              }
            }
            if (newGlossaryLines.length > 0) {
              glossarySection = newGlossaryLines.join('\n');
            } else {
              glossarySection = 'Không có từ mới';
            }
          } else {
            glossarySection = 'Không có từ mới';
          }
        } else {
          glossarySection = 'Không có từ mới';
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
        glossary: glossarySection,
        timeTranslation: translationTime, // 👉 Thêm thời gian dịch
        status: "TRANSLATED",
      };
    });

    // Thay vì Promise.all, sử dụng Promise.allSettled để không bị dừng khi 1 chương lỗi
    const settledPromises = await Promise.allSettled(translationPromises);

    console.log("📊 Kết quả Promise.allSettled:", {
      total: settledPromises.length,
      fulfilled: settledPromises.filter(p => p.status === 'fulfilled').length,
      rejected: settledPromises.filter(p => p.status === 'rejected').length,
    });

    const translatedChapters = settledPromises.map((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`✅ Chương ${index + 1} dịch thành công:`, {
          chapterNumber: result.value.chapterNumber,
          hasTranslatedTitle: !!result.value.translatedTitle,
          hasTranslatedContent: !!result.value.translatedContent,
          status: result.value.status,
        });
        return result.value;
      } else {
        console.log(`❌ Chương ${index + 1} dịch thất bại:`, result.reason.message);
        // Lỗi đã được log bên trong, ở đây ta trả về chương gốc với thông tin lỗi
        return {
          ...validChapters[index],
          translatedTitle: validChapters[index].title,
          translatedContent: validChapters[index].content,
          translationError: result.reason.message,
          status: "FAILED",
          timeTranslation: 0,
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
        timeTranslation: ch.timeTranslation,
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

    // Đảm bảo response có đầy đủ thông tin
    const response = {
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
    };

    console.log("📤 Response cuối cùng:", {
      totalChapters: response.chapters.length,
      successCount: response.stats.success,
      failedCount: response.stats.failed,
      hasAvailableKeys: response.keyStatus.hasAvailableKeys,
    });

    // Log chi tiết từng chương trong response
    console.log("📋 Chi tiết chapters trong response:");
    response.chapters.forEach((chapter, index) => {
      console.log(`Chương ${index + 1}:`, {
        chapterNumber: chapter.chapterNumber,
        originalTitle: chapter.title,
        translatedTitle: chapter.translatedTitle,
        hasTranslatedTitle: !!chapter.translatedTitle,
        originalContent: chapter.content ? chapter.content.substring(0, 50) + "..." : "Không có",
        translatedContent: chapter.translatedContent ? chapter.translatedContent.substring(0, 50) + "..." : "Không có",
        hasTranslatedContent: !!chapter.translatedContent,
        status: chapter.status,
        timeTranslation: chapter.timeTranslation,
        translationError: chapter.translationError || null,
      });
    });

    console.log("🚀 Gửi response về frontend...");
    res.json(response);
    console.log("✅ Đã gửi response thành công!");
  } catch (err) {
    console.error("❌ Lỗi dịch chương:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Kiểm tra lại API key hoặc nội dung.",
      details: err.message,
    });
  }
};

// Thêm job vào hàng đợi BullMQ (ví dụ demo)
exports.addJobToQueue = async (req, res) => {
  try {
    const { storyId, chapterNumber, content } = req.body;
    await myQueue.add('translate-chapter', { storyId, chapterNumber, content });
    res.json({ success: true, message: 'Đã thêm job dịch chương vào hàng đợi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi thêm job vào queue', error: err.message });
  }
};
