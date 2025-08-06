const { myQueue } = require('../utils/queue');
const ApiKeyManager = require("../services/apiKeyManagers");
const { translateText } = require("../services/translateService");

// Khởi tạo queue và clear các job cũ khi start server
const initializeQueue = async () => {
  try {
    console.log('[QUEUE] 🧹 Đang clear queue cũ...');
    
    // Sử dụng BullMQ API đúng cách để clear queue
    const waitingJobs = await myQueue.getWaiting();
    const activeJobs = await myQueue.getActive();
    const delayedJobs = await myQueue.getDelayed();
    const failedJobs = await myQueue.getFailed();
    
    console.log(`[QUEUE] 📊 Tìm thấy jobs cũ:`, {
      waiting: waitingJobs.length,
      active: activeJobs.length,
      delayed: delayedJobs.length,
      failed: failedJobs.length
    });
    
    // Xóa tất cả jobs cũ
    if (waitingJobs.length > 0) {
      await Promise.all(waitingJobs.map(job => job.remove()));
      console.log(`[QUEUE] ✅ Đã xóa ${waitingJobs.length} waiting jobs`);
    }
    
    if (activeJobs.length > 0) {
      await Promise.all(activeJobs.map(job => job.remove()));
      console.log(`[QUEUE] ✅ Đã xóa ${activeJobs.length} active jobs`);
    }
    
    if (delayedJobs.length > 0) {
      await Promise.all(delayedJobs.map(job => job.remove()));
      console.log(`[QUEUE] ✅ Đã xóa ${delayedJobs.length} delayed jobs`);
    }
    
    if (failedJobs.length > 0) {
      await Promise.all(failedJobs.map(job => job.remove()));
      console.log(`[QUEUE] ✅ Đã xóa ${failedJobs.length} failed jobs`);
    }
    
    console.log('[QUEUE] ✅ Đã clear queue thành công');
  } catch (error) {
    console.error('[QUEUE] ❌ Lỗi khi clear queue:', error);
  }
};

// Gọi initializeQueue khi module được load
initializeQueue();

// Endpoint dịch trực tiếp (giữ nguyên)
exports.translateText = async (req, res) => {
  const { chapters, userKey, userKeys, model, storyId } = req.body;
  const userId = req.user?.id || "anonymous";
  
  console.log("🚀 [API] ===== BẮT ĐẦU NHẬN YÊU CẦU DỊCH =====");
  console.log("[API] 📥 Dữ liệu nhận từ FE:", {
    storyId,
    userId,
    model: model?.label || model?.name || model,
    modelValue: model?.value,
    modelRpm: model?.rpm,
    modelTpm: model?.tpm,
    modelRpd: model?.rpd,
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
    const modelValueForKey = model?.value || model;
    const keyPromise = keyManager.getKeyToUse(userId, keysToUse, modelValueForKey);
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
    // Truyền model.value thay vì toàn bộ model object
    const modelValueForKey = model?.value || model;
    const keyResult = await keyManager.getKeyToUse(userIdFromToken, keysToUse, modelValueForKey);
    const keyToUse = keyResult.key;
    
    console.log(`[QUEUE-API] ✅ Đã tìm thấy key: ${typeof keyToUse === 'string' ? keyToUse.substring(0, 8) + '...' : 'unknown'}`);

    // Lấy thông tin model đầy đủ từ database nếu cần
    let fullModelInfo = model;
    if (model && model.value && (!model.rpm || !model.tpm || !model.rpd)) {
      console.log("[QUEUE-API] 🔍 Tìm thông tin model đầy đủ từ database...");
      try {
        const { prisma } = require("../config/prismaConfig");
        const dbModel = await prisma.model.findFirst({
          where: { value: model.value },
          select: { value: true, label: true, rpm: true, tpm: true, rpd: true }
        });
        if (dbModel) {
          fullModelInfo = { ...model, ...dbModel };
          console.log(`[QUEUE-API] ✅ Đã lấy thông tin model từ DB:`, {
            value: fullModelInfo.value,
            label: fullModelInfo.label,
            rpm: fullModelInfo.rpm,
            tpm: fullModelInfo.tpm,
            rpd: fullModelInfo.rpd
          });
        }
      } catch (error) {
        console.error("[QUEUE-API] ⚠️ Không thể lấy thông tin model từ DB:", error.message);
      }
    }

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
        model: fullModelInfo, // Sử dụng fullModelInfo ở đây
        apiKey: keyToUse,
        storyId: storyId,
        userId: userIdFromToken,
        jobIndex: i, // Index để track thứ tự
        totalJobs: chapters.length, // Tổng số jobs
        timestamp: Date.now(), // 🚀 Thêm timestamp để tránh job cũ
        serverId: process.pid // 🚀 Thêm server ID để tránh conflict
      };

      console.log(`[QUEUE-API] 📝 Thêm job ${i + 1}/${chapters.length}:`, {
        chapterNumber: chapter.chapterNumber,
        titleLength: chapter.title?.length || 0,
        contentLength: chapter.content?.length || 0
      });

      // Tính delay dựa trên RPM của model - đảm bảo không vượt quá RPM
      let delayPerJob = 2000; // Default 2s giữa các job
      if (fullModelInfo && fullModelInfo.rpm) {
        // Đảm bảo delay >= 60/rpm để không vượt quá RPM
        delayPerJob = Math.max((60 / fullModelInfo.rpm) * 1000, 1000); // Tối thiểu 1s
        console.log(`[QUEUE-API] ⏱️ Model ${fullModelInfo.label || fullModelInfo.name} có RPM ${fullModelInfo.rpm}, delay tối thiểu: ${delayPerJob}ms (60/${fullModelInfo.rpm}s)`);
      } else {
        console.log(`[QUEUE-API] ⏱️ Không có thông tin RPM, dùng delay mặc định: ${delayPerJob}ms`);
      }

      // ✅ GIỮ DELAY TÍCH LŨY để tránh vượt quá RPM
      // Job 1: delay 0ms (chạy ngay)
      // Job 2: delay delayPerJob (chạy sau delayPerJob ms)
      // Job 3: delay 2*delayPerJob (chạy sau 2*delayPerJob ms)
      // Job 4: delay 3*delayPerJob (chạy sau 3*delayPerJob ms)
      // => Đảm bảo không bao giờ vượt quá RPM limit
      
      const job = await myQueue.add('translate-chapter', jobData, {
        delay: 0, // 🚀 Bỏ delay tích lũy, để semaphore kiểm soát
        attempts: 2, // Giảm từ 3 xuống 2 lần retry
        backoff: {
          type: 'exponential',
          delay: 5000 // Tăng delay từ 2000ms lên 5000ms
        },
        removeOnComplete: true, // Tự động xóa job khi hoàn thành
        removeOnFail: true, // Tự động xóa job khi fail
        timeout: 300000 // 🚀 Timeout 5 phút cho mỗi job
      });

      jobs.push(job);
      console.log(`[QUEUE-API] ✅ Đã thêm job ${job.id} vào queue`);
    }

    console.log(`[QUEUE-API] ✅ Đã thêm ${jobs.length} jobs vào queue thành công`);
    console.log("🚀 [QUEUE-API] ===== HOÀN THÀNH THÊM JOBS =====");
    
    // 🚀 Cập nhật thông tin debug về timing với semaphore
    const estimatedTotalTime = chapters.length * 10; // Ước tính thời gian dịch trung bình
    const concurrencyEfficiency = Math.min(3, chapters.length); // Số worker thực tế sử dụng
    
    console.log(`[QUEUE-API] 📊 Thông tin timing với Semaphore:`, {
      totalJobs: chapters.length,
      strategy: 'Semaphore kiểm soát RPM thay vì delay tích lũy',
      concurrency: `${concurrencyEfficiency} jobs song song`,
      rpmLimit: fullModelInfo?.rpm ? `${fullModelInfo.rpm} RPM` : 'Unknown',
      estimatedTotalTime: `${Math.floor(estimatedTotalTime / 1000)}s`,
      efficiency: 'Tối ưu thời gian với kiểm soát RPM chính xác'
    });

    res.json({
      success: true,
      message: `Đã thêm ${jobs.length} chương vào hàng đợi dịch`,
      jobCount: jobs.length,
      jobIds: jobs.map(job => job.id),
      timing: {
        totalJobs: chapters.length,
        strategy: 'Semaphore RPM Control',
        concurrency: 3,
        estimatedTotalTime: Math.floor(estimatedTotalTime / 1000),
        efficiency: 'Tối ưu với kiểm soát RPM chính xác'
      }
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
