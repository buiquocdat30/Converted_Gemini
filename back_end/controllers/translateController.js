const { myQueue } = require('../utils/queue');
const ApiKeyManager = require("../services/apiKeyManagers");
const { translateText } = require("../services/translateService");

// Endpoint dịch trực tiếp (giữ nguyên)
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

// Endpoint mới: Thêm jobs vào queue
exports.translateTextQueue = async (req, res) => {
  console.log("🚀 [QUEUE-API] ===== BẮT ĐẦU THÊM JOBS VÀO QUEUE =====");
  
  const { chapters, userKeys, model, storyId, userId, isBatchTranslation } = req.body;
  
  console.log("[QUEUE-API] 📋 Thông tin request:", {
    chaptersCount: chapters?.length || 0,
    hasUserKeys: !!userKeys,
    userKeysCount: userKeys?.length || 0,
    model: model?.label || model?.name || model,
    modelValue: model?.value,
    modelRpm: model?.rpm,
    modelTpm: model?.tpm,
    modelRpd: model?.rpd,
    storyId: storyId,
    userId: userId,
    isBatchTranslation: isBatchTranslation
  });

  if (!chapters || chapters.length === 0) {
    return res.status(400).json({ error: "Không có chương nào để dịch." });
  }

  try {
    // Lấy key khả dụng
    const keyManager = new ApiKeyManager();
    const keysToUse = userKeys || [];
    const userIdFromToken = req.user?.id || userId || 'anonymous';
    
    console.log("[QUEUE-API] 🔑 Tìm key khả dụng...");
    const keyResult = await keyManager.getKeyToUse(userIdFromToken, keysToUse, model);
    const keyToUse = keyResult.key;
    
    console.log(`[QUEUE-API] ✅ Đã tìm thấy key: ${typeof keyToUse === 'string' ? keyToUse.substring(0, 8) + '...' : 'unknown'}`);

    // Thêm từng chương vào queue
    const jobs = [];
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      const jobData = {
        chapter: {
          title: chapter.title,
          content: chapter.content,
          chapterNumber: chapter.chapterNumber
        },
        model: model,
        apiKey: keyToUse,
        storyId: storyId,
        userId: userIdFromToken,
        jobIndex: i, // Index để track thứ tự
        totalJobs: chapters.length // Tổng số jobs
      };

      console.log(`[QUEUE-API] 📝 Thêm job ${i + 1}/${chapters.length}:`, {
        chapterNumber: chapter.chapterNumber,
        titleLength: chapter.title?.length || 0,
        contentLength: chapter.content?.length || 0
      });

      // Tính delay dựa trên RPM của model
      let delayPerJob = 6000; // Default 5s
      if (model && model.rpm) {
        delayPerJob = Math.max((60 / model.rpm) * 1000, 2000); // Tối thiểu 1s
        console.log(`[QUEUE-API] ⏱️ Model ${model.label || model.name} có RPM ${model.rpm}, delay: ${delayPerJob}ms`);
      } else {
        console.log(`[QUEUE-API] ⏱️ Không có thông tin RPM, dùng delay mặc định: ${delayPerJob}ms`);
      }

      const job = await myQueue.add('translate-chapter', jobData, {
        delay: i * delayPerJob, // Delay dựa trên RPM
        attempts: 3, // Retry 3 lần nếu fail
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      jobs.push(job);
      console.log(`[QUEUE-API] ✅ Đã thêm job ${job.id} vào queue`);
    }

    console.log(`[QUEUE-API] ✅ Đã thêm ${jobs.length} jobs vào queue thành công`);
    console.log("🚀 [QUEUE-API] ===== HOÀN THÀNH THÊM JOBS =====");

    res.json({
      success: true,
      message: `Đã thêm ${jobs.length} chương vào hàng đợi dịch`,
      jobCount: jobs.length,
      jobIds: jobs.map(job => job.id)
    });

  } catch (error) {
    console.error("[QUEUE-API] ❌ Lỗi khi thêm jobs vào queue:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm jobs vào queue",
      error: error.message
    });
  }
};

// Thêm job vào hàng đợi BullMQ (giữ nguyên cho compatibility)
exports.addJobToQueue = async (req, res) => {
  try {
    const { storyId, chapterNumber, content } = req.body;
    await myQueue.add('translate-chapter', { storyId, chapterNumber, content });
    res.json({ success: true, message: 'Đã thêm job dịch chương vào hàng đợi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi thêm job vào queue', error: err.message });
  }
};
