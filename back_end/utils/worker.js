const { Worker, connection } = require('./queue');
const { myQueue } = require('./queue');
const { io } = require('socket.io-client');
const { translateText } = require("../services/translateService");

const SOCKET_PORT = 8001; // Socket.io server port

// Hàm tạo socket connection với retry
function createSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log(`[WORKER] 🔌 Đang kết nối đến Socket.io server http://localhost:${SOCKET_PORT}...`);
    
    const socket = io(`http://localhost:${SOCKET_PORT}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    const timeout = setTimeout(() => {
      console.error('[WORKER] ❌ Timeout kết nối Socket.io server');
      socket.disconnect();
      reject(new Error('Socket.io connection timeout'));
    }, 15000);

    socket.on('connect', () => {
      console.log('[WORKER] ✅ Đã kết nối Socket.io server thành công');
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('[WORKER] ❌ Lỗi kết nối Socket.io:', error.message);
      clearTimeout(timeout);
      reject(error);
    });

    socket.on('disconnect', () => {
      console.log('[WORKER] 🔌 Đã ngắt kết nối Socket.io server');
    });
  });
}

// Hàm dịch chương (tùy chỉnh lại theo luồng của bạn)
async function callTranslateAPI(chapter, model, apiKey, storyId) {
  console.log(`[WORKER] Bắt đầu dịch chương ${chapter.chapterNumber}`);
  
  // Tạo keyInfo object theo format mà translateText cần
  const keyInfo = {
    key: apiKey,
    usageId: null, // Có thể thêm usageId nếu cần
    isUserKey: true
  };

  try {
    // Gọi hàm dịch tiêu đề và nội dung
    const titleResult = chapter.title
      ? await translateText(chapter.title, keyInfo, model, 'title', storyId)
      : { translated: chapter.title };
    
    const contentResult = chapter.content
      ? await translateText(chapter.content, keyInfo, model, 'content', storyId)
      : { translated: chapter.content };

    console.log(`[WORKER] Dịch xong - Title: ${titleResult.translated?.substring(0, 50)}...`);
    console.log(`[WORKER] Dịch xong - Content: ${contentResult.translated?.substring(0, 50)}...`);

    return {
      translatedTitle: titleResult.translated,
      translatedContent: contentResult.translated,
      duration: (titleResult.duration || 0) + (contentResult.duration || 0),
      hasError: titleResult.hasError || contentResult.hasError,
      error: titleResult.error || contentResult.error
    };
  } catch (error) {
    console.error(`[WORKER] Lỗi trong callTranslateAPI:`, error);
    throw error;
  }
}

console.log(`[WORKER] Worker process started at ${new Date().toLocaleString()} | PID: ${process.pid}`);

// Khởi tạo socket connection
let socket = null;

// 🚀 Thêm semaphore để kiểm soát số lượng request đồng thời
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = 3; // Giới hạn 3 job đồng thời

// 🚀 Thêm semaphore để kiểm soát API calls theo RPM
let lastApiCall = 0; // Timestamp của lần gọi API cuối cùng
const apiCallSemaphore = {
  lastCall: 0,
  minInterval: 0,
  setMinInterval: function(rpm) {
    this.minInterval = (60 / rpm) * 1000; // Chuyển RPM thành milliseconds
  },
  waitForNextCall: async function() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      console.log(`[WORKER] ⏳ Semaphore: Chờ ${waitTime}ms để tuân thủ RPM limit`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
    console.log(`[WORKER] ✅ Semaphore: Cho phép gọi API tại ${new Date().toLocaleTimeString()}`);
  }
};

// 🚀 Thêm semaphore để kiểm soát thời gian bắt đầu giữa các chương
const chapterSemaphore = {
  lastChapterStart: 0,
  minInterval: 2000, // Default 2s, sẽ được cập nhật theo RPM
  setMinInterval: function(rpm) {
    // Tính toán interval dựa trên RPM: 60/rpm giây
    this.minInterval = (60 / rpm) * 1000; // Chuyển thành milliseconds
    console.log(`[WORKER] ⏱️ Chapter Semaphore: Thiết lập interval ${this.minInterval}ms (60/${rpm}s) giữa các chương`);
  },
  waitForNextChapter: async function() {
    const now = Date.now();
    const timeSinceLastChapter = now - this.lastChapterStart;
    
    if (timeSinceLastChapter < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastChapter;
      console.log(`[WORKER] ⏳ Chapter Semaphore: Chờ ${waitTime}ms trước khi bắt đầu chương tiếp theo`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastChapterStart = Date.now();
    console.log(`[WORKER] ✅ Chapter Semaphore: Cho phép bắt đầu chương mới tại ${new Date().toLocaleTimeString()}`);
  }
};

// Hàm khởi tạo socket với retry
async function initializeSocket() {
  let retries = 0;
  const maxRetries = 5;
  
  while (retries < maxRetries) {
    try {
      console.log(`[WORKER] 🔄 Thử kết nối Socket.io lần ${retries + 1}/${maxRetries}...`);
      socket = await createSocketConnection();
      console.log('[WORKER] ✅ Socket.io connection thành công');
      return socket;
    } catch (error) {
      retries++;
      console.error(`[WORKER] ❌ Lần ${retries} thất bại:`, error.message);
      
      if (retries < maxRetries) {
        const delay = retries * 2000; // Tăng delay theo số lần retry
        console.log(`[WORKER] ⏳ Chờ ${delay}ms trước khi thử lại...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('[WORKER] ❌ Không thể kết nối Socket.io sau nhiều lần thử');
        throw error;
      }
    }
  }
}

const worker = new Worker('my-queue', async job => {
  console.log("🔄 [WORKER] ===== BẮT ĐẦU XỬ LÝ JOB =====");
  console.log(`[WORKER] 📥 Nhận job dịch chương: ${job.data.chapter?.chapterNumber}`);
  
  // 🚀 Kiểm tra job có phải là job cũ không
  const jobTimestamp = job.data.timestamp || 0;
  const jobServerId = job.data.serverId || 0;
  const currentTime = Date.now();
  const currentServerId = process.pid;
  
  // Nếu job quá cũ (hơn 5 phút) thì bỏ qua
  if (currentTime - jobTimestamp > 300000) { // 5 phút = 300000ms thay vì 30 phút
    console.log(`[WORKER] 🚫 Bỏ qua job cũ: timestamp ${jobTimestamp}, hiện tại ${currentTime}, chênh lệch ${currentTime - jobTimestamp}ms`);
    return { hasError: true, error: 'Job quá cũ, đã bỏ qua' };
  }
  
  // Chỉ bỏ qua job từ server khác nếu job quá cũ (hơn 2 phút)
  if (jobServerId !== 0 && jobServerId !== currentServerId && (currentTime - jobTimestamp > 120000)) {
    console.log(`[WORKER] 🚫 Bỏ qua job từ server khác: jobServerId ${jobServerId}, currentServerId ${currentServerId}, job cũ ${currentTime - jobTimestamp}ms`);
    return { hasError: true, error: 'Job từ server khác và quá cũ, đã bỏ qua' };
  }
  
  console.log(`[WORKER] ✅ Job hợp lệ: timestamp ${jobTimestamp}, serverId ${jobServerId}, tuổi ${currentTime - jobTimestamp}ms`);
  
  // 🚀 Thêm timeout cho job để tránh chạy quá lâu
  const jobTimeout = setTimeout(() => {
    console.log(`[WORKER] ⏰ Job ${job.id} timeout sau 5 phút`);
    job.moveToFailed(new Error('Job timeout'), '0', true);
  }, 300000); // 5 phút
  
  console.log("[WORKER] 📋 Job data:", {
    chapterNumber: job.data.chapter?.chapterNumber,
    model: job.data.model?.label || job.data.model?.name || job.data.model,
    modelValue: job.data.model?.value,
    modelRpm: job.data.model?.rpm,
    modelTpm: job.data.model?.tpm,
    modelRpd: job.data.model?.rpd,
    storyId: job.data.storyId,
    userId: job.data.userId,
    jobIndex: job.data.jobIndex,
    totalJobs: job.data.totalJobs,
    titleLength: job.data.chapter?.title?.length || 0,
    contentLength: job.data.chapter?.content?.length || 0,
    timestamp: job.data.timestamp,
    serverId: job.data.serverId
  });
  
  // 🚀 Kiểm soát concurrency để tránh quá tải API
  activeJobs++;
  console.log(`[WORKER] 🚦 Active jobs: ${activeJobs}/${MAX_CONCURRENT_JOBS}`);
  
  try {
    // Đảm bảo socket đã kết nối
    if (!socket || !socket.connected) {
      console.log('[WORKER] 🔌 Socket chưa kết nối, thử kết nối lại...');
      try {
        socket = await initializeSocket();
      } catch (error) {
        console.error('[WORKER] ❌ Không thể kết nối Socket.io, bỏ qua emit kết quả');
      }
    }

    // 🚀 Emit ngay khi bắt đầu xử lý job để FE biết chương đã bắt đầu
    if (socket && socket.connected) {
      const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
      console.log(`[WORKER] 🚀 Emit chapterStarted về room: ${room}`);
      socket.emit('chapterStarted', {
        chapterNumber: job.data.chapter.chapterNumber,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room,
        startTime: Date.now(),
        modelRpm: job.data.model?.rpm
      });
    }

    // 🚀 Sử dụng chapterSemaphore để kiểm soát thời gian bắt đầu giữa các chương
    if (job.data.model && job.data.model.rpm) {
      // Thiết lập interval cho chapterSemaphore dựa trên RPM
      chapterSemaphore.setMinInterval(job.data.model.rpm);
      
      // Chờ semaphore cho phép bắt đầu chương mới
      await chapterSemaphore.waitForNextChapter();
    }

    // (ĐÃ BỎ) Không emit progress bắt đầu nữa

    console.log("[WORKER] 🔄 Bắt đầu dịch chương...");
    
    // Lưu thời gian bắt đầu dịch
    const translationStartTime = Date.now();
    
    // 🚀 Sử dụng semaphore thay vì delay cố định
    if (job.data.model && job.data.model.rpm) {
      // Thiết lập RPM limit cho semaphore
      apiCallSemaphore.setMinInterval(job.data.model.rpm);
      console.log(`[WORKER] ⏱️ Semaphore: Thiết lập RPM limit ${job.data.model.rpm} (${apiCallSemaphore.minInterval}ms giữa các lần gọi)`);
      
      // Chờ semaphore cho phép gọi API
      await apiCallSemaphore.waitForNextCall();
    }
    
    // 🚀 Thêm delay bổ sung nếu có lỗi 503 gần đây
    const recent503Errors = job.data.recent503Errors || 0;
    if (recent503Errors > 0) {
      const additionalDelay = recent503Errors * 5000; // 5s cho mỗi lỗi 503
      console.log(`[WORKER] ⏱️ Thêm delay ${additionalDelay}ms do có ${recent503Errors} lỗi 503 gần đây`);
      await new Promise(resolve => setTimeout(resolve, additionalDelay));
    }
    
    // (ĐÃ BỎ) Không gửi progress từng bước nữa
    
    const result = await callTranslateAPI(job.data.chapter, job.data.model, job.data.apiKey, job.data.storyId);
    
    // (ĐÃ BỎ) Không clear/emit progress 100% nữa
    
    // Tính thời gian thực tế đã dịch
    const actualDuration = (Date.now() - translationStartTime) / 1000;
    
    console.log(`[WORKER] ✅ Dịch xong chương ${job.data.chapter?.chapterNumber} trong ${actualDuration.toFixed(1)}s`);
    console.log("[WORKER] 📊 Kết quả dịch:", {
      chapterNumber: job.data.chapter.chapterNumber,
      hasTranslatedTitle: !!result.translatedTitle,
      hasTranslatedContent: !!result.translatedContent,
      titleLength: result.translatedTitle?.length || 0,
      contentLength: result.translatedContent?.length || 0,
      duration: result.duration,
      actualDuration: actualDuration,
      hasError: result.hasError
    });
    // 🔎 Thêm preview rõ ràng để debug: tên chương và 250 ký tự đầu nội dung
    const titlePreview = (result.translatedTitle || '').replace(/\s+/g, ' ').slice(0, 120);
    const contentPreview = (result.translatedContent || '').replace(/\s+/g, ' ').slice(0, 250);
    console.log(`[WORKER] 🧩 Preview chương ${job.data.chapter?.chapterNumber}:`);
    console.log(`        • Tiêu đề: "${titlePreview}"`);
    console.log(`        • Nội dung[0..250]: "${contentPreview}"`);

    // Emit kết quả về FE qua socket với format room rõ ràng
    if (socket && socket.connected) {
      const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
      console.log(`[WORKER] 📤 Emit kết quả về room: ${room}`);
      console.log(`[WORKER] 📋 Dữ liệu emit:`, {
        chapterNumber: job.data.chapter.chapterNumber,
        hasTranslatedTitle: !!result.translatedTitle,
        hasTranslatedContent: !!result.translatedContent,
        titleLength: result.translatedTitle?.length || 0,
        contentLength: result.translatedContent?.length || 0,
        duration: result.duration,
        actualDuration: actualDuration,
        hasError: result.hasError,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room
      });
      console.log(`[WORKER] 🧩 Emit preview: title="${titlePreview}", content[0..250]="${contentPreview}"`);
      
      socket.emit('chapterTranslated', {
        chapterNumber: job.data.chapter.chapterNumber,
        translatedContent: result.translatedContent,
        translatedTitle: result.translatedTitle,
        duration: result.duration,
        actualDuration: actualDuration,
        hasError: result.hasError,
        error: result.error,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room
      });
    } else {
      console.warn('[WORKER] ⚠️ Socket không kết nối, không thể emit kết quả');
    }
    
    console.log("🔄 [WORKER] ===== HOÀN THÀNH JOB =====");
    return result;
  } catch (err) {
    
    console.error(`[WORKER] ❌ Lỗi dịch chương ${job.data.chapter?.chapterNumber}:`, err);
    
    // Đảm bảo clear timeout cho job
    if (typeof jobTimeout !== 'undefined') {
      clearTimeout(jobTimeout);
    }

    // 🚀 Kiểm tra nếu là lỗi 503, không retry
    if (err.message && err.message.includes('503')) {
      console.log(`[WORKER] 🚫 Lỗi 503 - Service Unavailable, bỏ qua retry cho chương ${job.data.chapter?.chapterNumber}`);
      
      // Emit lỗi về FE qua socket với format room rõ ràng
      if (socket && socket.connected) {
        const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
        console.log(`[WORKER] 📤 Emit lỗi 503 về room: ${room}`);
        
        socket.emit('chapterTranslated', {
          chapterNumber: job.data.chapter.chapterNumber,
          error: 'Service Unavailable - API quá tải, vui lòng thử lại sau',
          hasError: true,
          jobIndex: job.data.jobIndex,
          totalJobs: job.data.totalJobs,
          room: room
        });

        // (ĐÃ BỎ) Không emit progress lỗi
      }
      
      console.log("🔄 [WORKER] ===== JOB 503 THẤT BẠI =====");
      // Không throw error để tránh retry
      return { hasError: true, error: 'Service Unavailable' };
    }
    
    // Emit lỗi về FE qua socket với format room rõ ràng
    if (socket && socket.connected) {
      const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
      console.log(`[WORKER] 📤 Emit lỗi về room: ${room}`);
      
      socket.emit('chapterTranslated', {
        chapterNumber: job.data.chapter.chapterNumber,
        error: err.message,
        hasError: true,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room
      });
      // (ĐÃ BỎ) Không emit progress lỗi
    }
    
    console.log("🔄 [WORKER] ===== JOB THẤT BẠI =====");
    throw err;
  } finally {
    // 🚀 Giảm số lượng active jobs khi job hoàn thành (thành công hoặc thất bại)
    activeJobs--;
    console.log(`[WORKER] 🚦 Active jobs sau khi hoàn thành: ${activeJobs}/${MAX_CONCURRENT_JOBS}`);
    
    // 🚀 Clear timeout cho job
    if (typeof jobTimeout !== 'undefined') {
      clearTimeout(jobTimeout);
    }
  }
}, { 
  connection,
  concurrency: 3 // 🚀 Xử lý 3 job song song thay vì 1 job tuần tự
});

worker.on('completed', job => {
  console.log(`[WORKER] Job ${job.id} đã hoàn thành!`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} thất bại:`, err);
  
  // 🚀 Kiểm tra nếu là lỗi 503 (Service Unavailable), không retry
  if (err.message && err.message.includes('503')) {
    console.log(`[WORKER] 🚫 Job ${job.id} bị lỗi 503, bỏ qua retry`);
    return;
  }
  
  // 🚀 Kiểm tra số lần retry đã thực hiện
  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts || 3;
  
  if (attemptsMade >= maxAttempts) {
    console.log(`[WORKER] 🚫 Job ${job.id} đã retry ${attemptsMade}/${maxAttempts} lần, bỏ qua`);
    return;
  }
  
  console.log(`[WORKER] 🔄 Job ${job.id} sẽ retry lần ${attemptsMade + 1}/${maxAttempts}`);
});

// Khởi tạo socket khi worker start
initializeSocket().then(() => {
  console.log('[WORKER] ✅ Worker đã sẵn sàng với Socket.io connection');
  
  // 🚀 Clear queue cũ khi worker start
  clearOldJobs();
}).catch(error => {
  console.error('[WORKER] ❌ Không thể khởi tạo Socket.io connection:', error);
});

// 🚀 Hàm clear job cũ
const clearOldJobs = async () => {
  try {
    console.log('[WORKER] 🧹 Đang clear job cũ...');
    
    const waitingJobs = await myQueue.getWaiting();
    const queueActiveJobs = await myQueue.getActive();
    const delayedJobs = await myQueue.getDelayed();
    const failedJobs = await myQueue.getFailed();
    
    console.log(`[WORKER] 📊 Tìm thấy jobs:`, {
      waiting: waitingJobs.length,
      active: queueActiveJobs.length,
      delayed: delayedJobs.length,
      failed: failedJobs.length
    });
    
    // Xóa tất cả jobs cũ
    let clearedCount = 0;
    
    for (const job of [...waitingJobs, ...queueActiveJobs, ...delayedJobs, ...failedJobs]) {
      try {
        await job.remove();
        clearedCount++;
      } catch (error) {
        console.log(`[WORKER] ⚠️ Không thể xóa job ${job.id}:`, error.message);
      }
    }
    
    console.log(`[WORKER] ✅ Đã clear ${clearedCount} jobs cũ`);
  } catch (error) {
    console.error('[WORKER] ❌ Lỗi khi clear job cũ:', error);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[WORKER] 🛑 Đang đóng worker gracefully...');
  try {
    // 🚀 Dừng nhận job mới
    await worker.pause();
    console.log('[WORKER] ✅ Đã pause worker');
    
    // 🚀 Đợi các job đang chạy hoàn thành (tối đa 30 giây)
    let waitTime = 0;
    const maxWaitTime = 30000; // 30 giây
    const checkInterval = 1000; // 1 giây
    
    while (activeJobs > 0 && waitTime < maxWaitTime) {
      console.log(`[WORKER] ⏳ Đợi ${activeJobs} job hoàn thành... (${waitTime}ms/${maxWaitTime}ms)`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }
    
    if (activeJobs > 0) {
      console.log(`[WORKER] ⚠️ Vẫn còn ${activeJobs} job chưa hoàn thành, force close`);
    } else {
      console.log('[WORKER] ✅ Tất cả job đã hoàn thành');
    }
    
    // 🚀 Đóng worker
    await worker.close();
    console.log('[WORKER] ✅ Đã đóng worker');
    
    // 🚀 Đóng queue
    await myQueue.close();
    console.log('[WORKER] ✅ Đã đóng queue');
    
    // 🚀 Đóng socket
    if (socket) {
      socket.disconnect();
      console.log('[WORKER] ✅ Đã đóng socket');
    }
    
    console.log('[WORKER] ✅ Graceful shutdown hoàn thành');
  } catch (error) {
    console.error('[WORKER] ❌ Lỗi khi đóng worker:', error);
  }
  process.exit(0);
});

// 🚀 Thêm handler cho SIGTERM
process.on('SIGTERM', async () => {
  console.log('[WORKER] 🛑 Nhận SIGTERM, đang đóng worker...');
  try {
    await worker.close();
    await myQueue.close();
    if (socket) {
      socket.disconnect();
    }
    console.log('[WORKER] ✅ Đã đóng worker với SIGTERM');
  } catch (error) {
    console.error('[WORKER] ❌ Lỗi khi đóng worker với SIGTERM:', error);
  }
  process.exit(0);
}); 