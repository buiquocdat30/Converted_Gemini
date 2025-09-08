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

      const resultItem = {
        chapterNumber: ch.chapterNumber || i + 1,
        translatedTitle: titleResult.translated,
        translatedContent: contentResult.translated,
        timeTranslation: duration,
        hasError: titleResult.hasError || contentResult.hasError,
        error: titleResult.error || contentResult.error
      };

      // 🔎 Thêm preview rõ ràng cho REST flow
      const titlePreview = (resultItem.translatedTitle || '').replace(/\s+/g, ' ').slice(0, 120);
      const contentPreview = (resultItem.translatedContent || '').replace(/\s+/g, ' ').slice(0, 250);
      console.log(`[API] 🧩 Preview chương ${resultItem.chapterNumber}:`);
      console.log(`      • Tiêu đề: "${titlePreview}"`);
      console.log(`      • Nội dung[0..250]: "${contentPreview}"`);

      results.push(resultItem);

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
  
  // Kiểm tra xem có lỗi nào không
  const hasAnyError = results.some(result => result.hasError);
  const errorCount = results.filter(result => result.hasError).length;
  const successCount = results.filter(result => !result.hasError).length;
  
  console.log("[API] 📊 Thống kê kết quả:", {
    total: results.length,
    success: successCount,
    errors: errorCount,
    hasAnyError: hasAnyError
  });
  
  console.log("[API] 📤 Trả về response cho FE");
  console.log("🚀 [API] ===== HOÀN THÀNH DỊCH =====");

  // Trả về kết quả dịch với thông tin lỗi
  res.json({ 
    success: !hasAnyError, // Chỉ success khi không có lỗi nào
    message: hasAnyError 
      ? `Dịch hoàn thành với ${errorCount} lỗi` 
      : `Đã dịch xong ${results.length} chương thành công`,
    chapters: results,
    errorCount: errorCount,
    successCount: successCount
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

// Endpoint mới: Dịch các trang cụ thể
exports.translateRangePages = async (req, res) => {
  console.log("🚀 [RANGE-PAGES-API] ===== BẮT ĐẦU DỊCH CÁC TRANG =====");
  
  const { 
    pageNumbers, 
    chapters, 
    userKeys, 
    model, 
    storyId, 
    userId, 
    isBatchTranslation,
    pageInfo 
  } = req.body;
  
  console.log("[RANGE-PAGES-API] 📋 Thông tin request:", {
    pageNumbers: pageNumbers,
    pagesCount: pageNumbers?.length || 0,
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
    isBatchTranslation: isBatchTranslation,
    pageInfo: pageInfo
  });

  // Validation
  if (!pageNumbers || !Array.isArray(pageNumbers) || pageNumbers.length === 0) {
    return res.status(400).json({ error: "Không có trang nào được chọn để dịch." });
  }

  if (!chapters || chapters.length === 0) {
    return res.status(400).json({ error: "Không có chương nào để dịch." });
  }

  if (!model) {
    return res.status(400).json({ error: "Không có model được chọn." });
  }

  try {
    // Lấy key khả dụng
    const keyManager = new ApiKeyManager();
    const keysToUse = userKeys || [];
    const userIdFromToken = req.user?.id || userId || 'anonymous';
    
    console.log("[RANGE-PAGES-API] 🔑 Tìm key khả dụng...");
    const modelValueForKey = model?.value || model;
    const keyResult = await keyManager.getKeyToUse(userIdFromToken, keysToUse, modelValueForKey);
    const keyToUse = keyResult.key;
    
    console.log(`[RANGE-PAGES-API] ✅ Đã tìm thấy key: ${typeof keyToUse === 'string' ? keyToUse.substring(0, 8) + '...' : 'unknown'}`);

    // Lấy thông tin model đầy đủ từ database nếu cần
    let fullModelInfo = model;
    if (model && model.value && (!model.rpm || !model.tpm || !model.rpd)) {
      console.log("[RANGE-PAGES-API] 🔍 Tìm thông tin model đầy đủ từ database...");
      try {
        const { prisma } = require("../config/prismaConfig");
        const dbModel = await prisma.model.findFirst({
          where: { value: model.value },
          select: { value: true, label: true, rpm: true, tpm: true, rpd: true }
        });
        if (dbModel) {
          fullModelInfo = { ...model, ...dbModel };
          console.log(`[RANGE-PAGES-API] ✅ Đã lấy thông tin model từ DB:`, {
            value: fullModelInfo.value,
            label: fullModelInfo.label,
            rpm: fullModelInfo.rpm,
            tpm: fullModelInfo.tpm,
            rpd: fullModelInfo.rpd
          });
        }
      } catch (error) {
        console.error("[RANGE-PAGES-API] ⚠️ Không thể lấy thông tin model từ DB:", error.message);
      }
    }

    const results = {
      success: true,
      totalPages: pageNumbers.length,
      totalChapters: chapters.length,
      pageResults: {},
      timing: null,
      errors: []
    };

    // Thêm từng trang vào queue
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNumber = pageNumbers[i];
      
      console.log(`[RANGE-PAGES-API] 📄 Xử lý trang ${pageNumber} (${i + 1}/${pageNumbers.length})`);
      
      try {
        // Tính toán các chương trong trang này
        const CHAPTERS_PER_PAGE = 10;
        const startIndex = (pageNumber - 1) * CHAPTERS_PER_PAGE;
        const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, chapters.length);
        const chaptersInPage = chapters.slice(startIndex, endIndex);
        
        console.log(`[RANGE-PAGES-API] 📚 Trang ${pageNumber} có ${chaptersInPage.length} chương (từ chương ${startIndex + 1} đến ${endIndex})`);

        // Thêm từng chương trong trang vào queue
        const jobs = [];
        for (let j = 0; j < chaptersInPage.length; j++) {
          const chapter = chaptersInPage[j];
          
          const jobData = {
            chapter: {
              title: chapter.title,
              content: chapter.content,
              chapterNumber: chapter.chapterNumber,
              originalIndex: startIndex + j // Lưu index gốc
            },
            model: fullModelInfo,
            apiKey: keyToUse,
            storyId: storyId,
            userId: userIdFromToken,
            jobIndex: startIndex + j, // Index tổng thể
            totalJobs: chapters.length,
            pageNumber: pageNumber, // Thêm thông tin trang
            pageInfo: {
              pageNumber: pageNumber,
              startIndex: startIndex,
              endIndex: endIndex,
              chaptersCount: chaptersInPage.length,
              chapterInPage: j
            },
            timestamp: Date.now(),
            serverId: process.pid,
            isRangePageTranslation: true // Flag đặc biệt
          };

          console.log(`[RANGE-PAGES-API] 📝 Thêm job chương ${chapter.chapterNumber} của trang ${pageNumber}:`, {
            chapterNumber: chapter.chapterNumber,
            titleLength: chapter.title?.length || 0,
            contentLength: chapter.content?.length || 0,
            pageNumber: pageNumber
          });

          // Tính delay dựa trên RPM của model
          let delayPerJob = 2000;
          if (fullModelInfo && fullModelInfo.rpm) {
            delayPerJob = Math.max((60 / fullModelInfo.rpm) * 1000, 1000);
          }

          const job = await myQueue.add('translate-chapter', jobData, {
            delay: 0, // Semaphore kiểm soát RPM
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000
            },
            removeOnComplete: true,
            removeOnFail: true,
            timeout: 300000
          });

          jobs.push(job);
          console.log(`[RANGE-PAGES-API] ✅ Đã thêm job ${job.id} vào queue`);
        }

        // Lưu kết quả trang
        results.pageResults[pageNumber] = {
          success: true,
          jobCount: jobs.length,
          chaptersCount: chaptersInPage.length,
          startIndex: startIndex,
          endIndex: endIndex,
          jobIds: jobs.map(job => job.id)
        };

        console.log(`[RANGE-PAGES-API] ✅ Đã thêm ${jobs.length} jobs của trang ${pageNumber} vào queue`);

      } catch (error) {
        console.error(`[RANGE-PAGES-API] ❌ Lỗi xử lý trang ${pageNumber}:`, error);
        
        const errorMsg = `Lỗi xử lý trang ${pageNumber}: ${error.message}`;
        results.errors.push(errorMsg);
        results.pageResults[pageNumber] = {
          success: false,
          error: errorMsg
        };
      }
    }

    // Tính toán kết quả tổng thể
    const successfulPages = Object.values(results.pageResults).filter(page => page.success).length;
    const totalJobs = Object.values(results.pageResults).reduce((total, page) => total + (page.jobCount || 0), 0);

    console.log(`[RANGE-PAGES-API] 📊 Kết quả tổng thể:`, {
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      failedPages: results.totalPages - successfulPages,
      totalJobs: totalJobs,
      errors: results.errors.length
    });

    // Cập nhật timing
    const estimatedTotalTime = totalJobs * 10;
    results.timing = {
      totalJobs: totalJobs,
      strategy: 'Range Pages Translation',
      concurrency: 3,
      estimatedTotalTime: Math.floor(estimatedTotalTime / 1000),
      efficiency: 'Tối ưu cho dịch nhiều trang'
    };

    console.log("🚀 [RANGE-PAGES-API] ===== HOÀN THÀNH DỊCH CÁC TRANG =====");

    res.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0 
        ? `Đã thêm ${successfulPages} trang (${totalJobs} chương) vào hàng đợi dịch thành công`
        : `Hoàn thành ${successfulPages}/${results.totalPages} trang (${totalJobs} chương). Có ${results.errors.length} trang bị lỗi`,
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      totalJobs: totalJobs,
      pageResults: results.pageResults,
      timing: results.timing,
      errors: results.errors
    });

  } catch (error) {
    console.error("[RANGE-PAGES-API] ❌ Lỗi khi dịch các trang:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi dịch các trang",
      error: error.message
    });
  }
};

// Endpoint mới: Dịch tất cả các trang chưa dịch
exports.translateAllPages = async (req, res) => {
  console.log("🚀 [ALL-PAGES-API] ===== BẮT ĐẦU DỊCH TẤT CẢ CÁC TRANG =====");
  
  const { 
    chapters, 
    userKeys, 
    model, 
    storyId, 
    userId, 
    isBatchTranslation,
    forceTranslate = false,
    maxPagesPerBatch = 5
  } = req.body;
  
  console.log("[ALL-PAGES-API] 📋 Thông tin request:", {
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
    isBatchTranslation: isBatchTranslation,
    forceTranslate: forceTranslate,
    maxPagesPerBatch: maxPagesPerBatch
  });

  // Validation nghiêm ngặt
  if (!chapters || chapters.length === 0) {
    return res.status(400).json({ error: "Không có chương nào để dịch." });
  }

  if (!model) {
    return res.status(400).json({ error: "Không có model được chọn." });
  }

  if (!userKeys || (Array.isArray(userKeys) && userKeys.length === 0) || userKeys === "") {
    return res.status(400).json({ error: "Dịch tất cả trang cần API key. Vui lòng nhập API key để tiếp tục." });
  }

  try {
    // Tính toán tổng số trang
    const CHAPTERS_PER_PAGE = 10;
    const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
    console.log(`[ALL-PAGES-API] 📊 Tổng số trang: ${totalPages}`);

    // Phân tích các trang cần dịch (giả lập logic từ frontend)
    const pagesToTranslate = [];
    const pageAnalysis = {
      totalPages: totalPages,
      pagesNeedingTranslation: 0,
      pagesAlreadyTranslated: 0,
      pagesWithErrors: 0,
      totalChaptersToTranslate: 0
    };

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
      const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, chapters.length);
      const chaptersInPage = chapters.slice(startIndex, endIndex);
      
      // Kiểm tra trạng thái của các chương trong trang
      let needsTranslation = false;
      let hasErrors = false;
      let translatedCount = 0;

      for (let i = startIndex; i < endIndex; i++) {
        const chapter = chapters[i];
        
        if (chapter?.translatedContent && !forceTranslate) {
          translatedCount++;
        } else if (chapter?.hasError) {
          hasErrors = true;
        }
        
        if (!chapter?.translatedContent || forceTranslate) {
          needsTranslation = true;
        }
      }

      if (needsTranslation) {
        pagesToTranslate.push({
          pageNumber: pageNum,
          startIndex: startIndex,
          endIndex: endIndex,
          chaptersCount: chaptersInPage.length,
          translatedCount: translatedCount,
          hasErrors: hasErrors
        });
        pageAnalysis.pagesNeedingTranslation++;
        pageAnalysis.totalChaptersToTranslate += chaptersInPage.length;
      } else {
        pageAnalysis.pagesAlreadyTranslated++;
      }

      if (hasErrors) {
        pageAnalysis.pagesWithErrors++;
      }
    }

    console.log(`[ALL-PAGES-API] 📊 Phân tích trang:`, pageAnalysis);
    console.log(`[ALL-PAGES-API] 📄 Các trang cần dịch:`, pagesToTranslate.map(p => p.pageNumber));

    // Kiểm tra nếu không có trang nào cần dịch
    if (pagesToTranslate.length === 0) {
      const message = forceTranslate ? "Tất cả các trang đã được dịch!" : "Tất cả các trang đã được dịch hoàn chỉnh!";
      console.log(`[ALL-PAGES-API] ✅ ${message}`);
      return res.json({ 
        success: true, 
        message: message,
        pageAnalysis: pageAnalysis,
        pagesToTranslate: []
      });
    }

    // Lấy key khả dụng
    const keyManager = new ApiKeyManager();
    const keysToUse = userKeys || [];
    const userIdFromToken = req.user?.id || userId || 'anonymous';
    
    console.log("[ALL-PAGES-API] 🔑 Tìm key khả dụng...");
    const modelValueForKey = model?.value || model;
    const keyResult = await keyManager.getKeyToUse(userIdFromToken, keysToUse, modelValueForKey);
    const keyToUse = keyResult.key;
    
    console.log(`[ALL-PAGES-API] ✅ Đã tìm thấy key: ${typeof keyToUse === 'string' ? keyToUse.substring(0, 8) + '...' : 'unknown'}`);

    // Lấy thông tin model đầy đủ từ database nếu cần
    let fullModelInfo = model;
    if (model && model.value && (!model.rpm || !model.tpm || !model.rpd)) {
      console.log("[ALL-PAGES-API] 🔍 Tìm thông tin model đầy đủ từ database...");
      try {
        const { prisma } = require("../config/prismaConfig");
        const dbModel = await prisma.model.findFirst({
          where: { value: model.value },
          select: { value: true, label: true, rpm: true, tpm: true, rpd: true }
        });
        if (dbModel) {
          fullModelInfo = { ...model, ...dbModel };
        }
      } catch (error) {
        console.error("[ALL-PAGES-API] ⚠️ Không thể lấy thông tin model từ DB:", error.message);
      }
    }

    const results = {
      success: true,
      totalPages: pagesToTranslate.length,
      totalChapters: pageAnalysis.totalChaptersToTranslate,
      pageResults: {},
      timing: null,
      errors: [],
      pageAnalysis: pageAnalysis
    };

    // Chia thành các batch để tránh quá tải
    const batches = [];
    for (let i = 0; i < pagesToTranslate.length; i += maxPagesPerBatch) {
      batches.push(pagesToTranslate.slice(i, i + maxPagesPerBatch));
    }

    console.log(`[ALL-PAGES-API] 📦 Chia thành ${batches.length} batch, mỗi batch tối đa ${maxPagesPerBatch} trang`);

    // Xử lý từng batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`[ALL-PAGES-API] 📦 Xử lý batch ${batchIndex + 1}/${batches.length} với ${batch.length} trang`);

      // Dịch từng trang trong batch
      for (let pageIndex = 0; pageIndex < batch.length; pageIndex++) {
        const pageInfo = batch[pageIndex];
        const pageNumber = pageInfo.pageNumber;
        
        console.log(`[ALL-PAGES-API] 📄 Bắt đầu dịch trang ${pageNumber} (batch ${batchIndex + 1}, trang ${pageIndex + 1}/${batch.length})`);
        
        try {
          const chaptersInPage = chapters.slice(pageInfo.startIndex, pageInfo.endIndex);
          
          // Thêm từng chương trong trang vào queue
          const jobs = [];
          for (let j = 0; j < chaptersInPage.length; j++) {
            const chapter = chaptersInPage[j];
            
            const jobData = {
              chapter: {
                title: chapter.title,
                content: chapter.content,
                chapterNumber: chapter.chapterNumber,
                originalIndex: pageInfo.startIndex + j
              },
              model: fullModelInfo,
              apiKey: keyToUse,
              storyId: storyId,
              userId: userIdFromToken,
              jobIndex: pageInfo.startIndex + j,
              totalJobs: chapters.length,
              pageNumber: pageNumber,
              pageInfo: {
                pageNumber: pageNumber,
                startIndex: pageInfo.startIndex,
                endIndex: pageInfo.endIndex,
                chaptersCount: chaptersInPage.length,
                batchIndex: batchIndex,
                pageInBatch: pageIndex
              },
              timestamp: Date.now(),
              serverId: process.pid,
              isAllPagesTranslation: true // Flag đặc biệt
            };

            const job = await myQueue.add('translate-chapter', jobData, {
              delay: 0,
              attempts: 2,
              backoff: {
                type: 'exponential',
                delay: 5000
              },
              removeOnComplete: true,
              removeOnFail: true,
              timeout: 300000
            });

            jobs.push(job);
          }

          // Lưu kết quả trang
          results.pageResults[pageNumber] = {
            success: true,
            jobCount: jobs.length,
            chaptersCount: chaptersInPage.length,
            startIndex: pageInfo.startIndex,
            endIndex: pageInfo.endIndex,
            batchIndex: batchIndex,
            jobIds: jobs.map(job => job.id)
          };

          console.log(`[ALL-PAGES-API] ✅ Đã thêm ${jobs.length} jobs của trang ${pageNumber} vào queue`);

        } catch (error) {
          console.error(`[ALL-PAGES-API] ❌ Lỗi xử lý trang ${pageNumber}:`, error);
          
          const errorMsg = `Lỗi xử lý trang ${pageNumber}: ${error.message}`;
          results.errors.push(errorMsg);
          results.pageResults[pageNumber] = {
            success: false,
            error: errorMsg
          };
        }
      }
    }

    // Tính toán kết quả tổng thể
    const successfulPages = Object.values(results.pageResults).filter(page => page.success).length;
    const totalJobs = Object.values(results.pageResults).reduce((total, page) => total + (page.jobCount || 0), 0);

    console.log(`[ALL-PAGES-API] 📊 Kết quả tổng thể:`, {
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      failedPages: results.totalPages - successfulPages,
      totalJobs: totalJobs,
      totalChapters: results.totalChapters,
      errors: results.errors.length,
      batches: batches.length
    });

    // Cập nhật timing
    const estimatedTotalTime = totalJobs * 10;
    results.timing = {
      totalJobs: totalJobs,
      strategy: 'All Pages Translation',
      concurrency: 3,
      estimatedTotalTime: Math.floor(estimatedTotalTime / 1000),
      efficiency: 'Tối ưu cho dịch tất cả trang',
      batches: batches.length,
      maxPagesPerBatch: maxPagesPerBatch
    };

    console.log("🚀 [ALL-PAGES-API] ===== HOÀN THÀNH DỊCH TẤT CẢ CÁC TRANG =====");

    res.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0 
        ? `Đã thêm ${successfulPages} trang (${totalJobs} chương) vào hàng đợi dịch thành công`
        : `Hoàn thành ${successfulPages}/${results.totalPages} trang (${totalJobs} chương). Có ${results.errors.length} trang bị lỗi`,
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      totalJobs: totalJobs,
      pageResults: results.pageResults,
      timing: results.timing,
      errors: results.errors,
      pageAnalysis: results.pageAnalysis
    });

  } catch (error) {
    console.error("[ALL-PAGES-API] ❌ Lỗi khi dịch tất cả trang:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi dịch tất cả trang",
      error: error.message
    });
  }
};