const { myQueue } = require('../utils/queue');
const ApiKeyManager = require("../services/apiKeyManagers");
const { translateText } = require("../services/translateService");

exports.translateText = async (req, res) => {
  const { chapters, userKey, userKeys, model, storyId } = req.body;
  const userId = req.user?.id || "anonymous";
  
  console.log("🚀 [API] ===== BẮT ĐẦU NHẬN YÊU CẦU DỊCH =====");
  console.log("[API] 📥 Dữ liệu nhận từ FE:", {
    storyId,
    userId,
    model: model?.name || model,
    chaptersCount: chapters?.length || 0,
    hasUserKey: !!userKey,
    hasUserKeys: !!userKeys,
    userKeysCount: userKeys?.length || 0
  });

  // Validate input
  if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
    console.log("[API] ❌ Lỗi: Thiếu danh sách chương cần dịch");
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }
  if (!model) {
    console.log("[API] ❌ Lỗi: Thiếu thông tin model");
    return res.status(400).json({ error: "Thiếu thông tin model." });
  }

  console.log("[API] ✅ Validation thành công");

  // Lấy key khả dụng với timeout
  console.log("[API] 🔑 Đang tìm key khả dụng...");
  let keyToUse = null;
  
  try {
    const keyManager = new ApiKeyManager();
    let keysToUse = [];
    if (userKeys && Array.isArray(userKeys) && userKeys.length > 0) {
      keysToUse = userKeys;
      console.log(`[API] 📋 Sử dụng ${userKeys.length} user keys`);
    } else if (userKey) {
      keysToUse = [userKey];
      console.log("[API] 📋 Sử dụng 1 user key");
    }

    // Thêm timeout cho việc tìm key
    const keyPromise = keyManager.getKeyToUse(userId, keysToUse, model);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout khi tìm key khả dụng')), 10000)
    );
    
    const keyResult = await Promise.race([keyPromise, timeoutPromise]);
    keyToUse = keyResult.key;
    
    console.log(`[API] ✅ Đã tìm được key: ${keyToUse.substring(0, 8)}...`);
  } catch (error) {
    console.error("[API] ❌ Lỗi khi tìm key khả dụng:", error.message);
    return res.status(500).json({ 
      error: `Lỗi khi tìm key khả dụng: ${error.message}` 
    });
  }
  
  if (!keyToUse) {
    console.log("[API] ❌ Lỗi: Không có key khả dụng");
    return res.status(400).json({ error: "Không có key khả dụng." });
  }

  // Dịch trực tiếp từng chương với timeout
  console.log("[API] 🔄 Bắt đầu dịch trực tiếp...");
  const results = [];
  
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    console.log(`[API] 📝 Đang dịch chương ${ch.chapterNumber || i + 1}:`, {
      chapterNumber: ch.chapterNumber,
      titleLength: ch.title?.length || 0,
      contentLength: ch.content?.length || 0,
      model: model?.name || model
    });

    try {
      // Tạo keyInfo object theo format mà translateText cần
      const keyInfo = {
        key: keyToUse,
        usageId: null,
        isUserKey: true
      };

      // Dịch tiêu đề và nội dung với timeout
      const titlePromise = ch.title
        ? translateText(ch.title, keyInfo, model, 'title', storyId)
        : Promise.resolve({ translated: ch.title });
      
      const contentPromise = ch.content
        ? translateText(ch.content, keyInfo, model, 'content', storyId)
        : Promise.resolve({ translated: ch.content });

      // Timeout cho mỗi chương: 60 giây
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout dịch chương')), 60000)
      );

      const [titleResult, contentResult] = await Promise.race([
        Promise.all([titlePromise, contentPromise]),
        timeoutPromise
      ]);

      const duration = (titleResult.duration || 0) + (contentResult.duration || 0);
      
      console.log(`[API] ✅ Dịch xong chương ${ch.chapterNumber || i + 1}:`, {
        hasTranslatedTitle: !!titleResult.translated,
        hasTranslatedContent: !!contentResult.translated,
        titleLength: titleResult.translated?.length || 0,
        contentLength: contentResult.translated?.length || 0,
        duration: duration,
        titleDuration: titleResult.duration || 0,
        contentDuration: contentResult.duration || 0
      });

      results.push({
        chapterNumber: ch.chapterNumber || i + 1,
        translatedTitle: titleResult.translated,
        translatedContent: contentResult.translated,
        timeTranslation: duration,
        hasError: titleResult.hasError || contentResult.hasError,
        error: titleResult.error || contentResult.error
      });

    } catch (error) {
      console.error(`[API] ❌ Lỗi dịch chương ${ch.chapterNumber || i + 1}:`, error.message);
      results.push({
        chapterNumber: ch.chapterNumber || i + 1,
        translatedTitle: ch.title,
        translatedContent: ch.content,
        timeTranslation: 0,
        hasError: true,
        error: error.message
      });
    }
  }

  console.log(`[API] ✅ Đã dịch xong ${results.length} chương`);
  console.log("[API] 📤 Trả về response cho FE");
  console.log("🚀 [API] ===== HOÀN THÀNH DỊCH =====");

  // Trả về kết quả dịch
  res.json({ 
    success: true, 
    message: `Đã dịch xong ${results.length} chương`,
    chapters: results
  });
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
