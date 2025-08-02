const { Worker, connection } = require('./queue');
const { io } = require('socket.io-client');
const { translateText } = require("../services/translateService");

const SOCKET_PORT = 8001; // Socket.io server port

// Hàm tạo socket connection với retry
function createSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log(`[WORKER] 🔌 Đang kết nối đến Socket.io server ws://localhost:${SOCKET_PORT}...`);
    
    const socket = io(`ws://localhost:${SOCKET_PORT}`, {
      transports: ['websocket'],
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
    contentLength: job.data.chapter?.content?.length || 0
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

    // Emit progress bắt đầu
    if (socket && socket.connected) {
      const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
      console.log(`[WORKER] 📤 Emit progress bắt đầu về room: ${room}`);
      socket.emit('chapterProgress', {
        chapterNumber: job.data.chapter.chapterNumber,
        status: 'PROCESSING',
        progress: 0,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room
      });
    }

    console.log("[WORKER] 🔄 Bắt đầu dịch chương...");
    
    // Lưu thời gian bắt đầu dịch
    const translationStartTime = Date.now();
    
    // Thêm delay để đảm bảo không vượt quá RPM của model
    if (job.data.model && job.data.model.rpm) {
      const delayMs = Math.max((60 / job.data.model.rpm) * 1000, 1000); // Tối thiểu 1s
      console.log(`[WORKER] ⏱️ Delay ${delayMs}ms để đảm bảo không vượt quá RPM ${job.data.model.rpm}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    // Emit progress từng bước nhỏ trong quá trình dịch
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      try {
        if (socket && socket.connected) {
          // Tính progress dựa trên thời gian đã trôi qua
          const elapsedTime = (Date.now() - translationStartTime) / 1000;
          
          // Ước tính thời gian dựa trên độ dài nội dung và model
          const titleLength = job.data.chapter?.title?.length || 0;
          const contentLength = job.data.chapter?.content?.length || 0;
          const totalLength = titleLength + contentLength;
          
          // Tính thời gian ước tính dựa trên model và độ dài
          let estimatedTimePerChar = 0.001; // Default: 1ms/char
          
          // Điều chỉnh dựa trên model (model chậm hơn = thời gian lâu hơn)
          if (job.data.model?.rpm) {
            // Model có RPM thấp = chậm hơn
            const rpm = job.data.model.rpm;
            if (rpm <= 10) estimatedTimePerChar = 0.005; // 5ms/char cho model chậm
            else if (rpm <= 30) estimatedTimePerChar = 0.003; // 3ms/char cho model trung bình
            else if (rpm <= 60) estimatedTimePerChar = 0.002; // 2ms/char cho model nhanh
            else estimatedTimePerChar = 0.001; // 1ms/char cho model rất nhanh
          }
          
          // Điều chỉnh dựa trên độ phức tạp của nội dung
          const complexityFactor = Math.max(1, totalLength / 1000); // Nội dung dài = phức tạp hơn
          const estimatedTotalTime = totalLength * estimatedTimePerChar * complexityFactor;
          
          // Tính progress dựa trên thời gian thực tế với điều chỉnh để chậm hơn
          if (estimatedTotalTime > 0) {
            // Sử dụng hàm easing để làm mượt progress
            const progressRatio = elapsedTime / estimatedTotalTime;
            
            // Hàm easing: chậm ở đầu, nhanh ở giữa, chậm ở cuối
            let adjustedProgressRatio;
            if (progressRatio < 0.5) {
              // Nửa đầu: tăng chậm
              adjustedProgressRatio = 2 * progressRatio * progressRatio;
            } else {
              // Nửa sau: tăng nhanh hơn
              const t = 2 * progressRatio - 1;
              adjustedProgressRatio = 1 - 2 * (1 - progressRatio) * (1 - progressRatio);
            }
            
            // Giới hạn progress tối đa 95% trong quá trình xử lý
            // Đảm bảo progress không giảm khi thời gian thực tế vượt quá ước tính
            const newProgress = Math.min(adjustedProgressRatio * 95, 95);
            currentProgress = Math.max(currentProgress, newProgress); // Không bao giờ giảm
          } else {
            // Fallback: tăng 0.2% mỗi 1s nếu không tính được
            currentProgress = Math.min(currentProgress + 0.2, 95);
          }
          
          const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
          socket.emit('chapterProgress', {
            chapterNumber: job.data.chapter.chapterNumber,
            status: 'PROCESSING',
            progress: Math.round(currentProgress),
            jobIndex: job.data.jobIndex,
            totalJobs: job.data.totalJobs,
            room: room
          });
          console.log(`[WORKER] 📊 Progress chương ${job.data.chapter.chapterNumber}: ${Math.round(currentProgress)}% (${elapsedTime.toFixed(1)}s/${estimatedTotalTime.toFixed(1)}s)`);
        }
      } catch (error) {
        console.error('[WORKER] ❌ Lỗi khi emit progress:', error);
      }
    }, 1000); // Tăng lên 1 giây để chậm hơn và mượt mà hơn
    
    const result = await callTranslateAPI(job.data.chapter, job.data.model, job.data.apiKey, job.data.storyId);
    
    // Dừng interval progress
    clearInterval(progressInterval);
    
    // Emit progress 100% ngay lập tức khi hoàn thành
    if (socket && socket.connected) {
      const room = job.data.userId ? `user:${job.data.userId}` : `story:${job.data.storyId}`;
      
      // Emit progress 100% ngay lập tức
      socket.emit('chapterProgress', {
        chapterNumber: job.data.chapter.chapterNumber,
        status: 'COMPLETE',
        progress: 100,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room
      });
      console.log(`[WORKER] ✅ Progress chương ${job.data.chapter.chapterNumber}: 100% - Hoàn thành ngay lập tức`);
      
      // Thêm delay nhỏ để đảm bảo progress 100% được hiển thị trước khi emit kết quả
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
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
    // Đảm bảo clear interval nếu có lỗi
    if (typeof progressInterval !== 'undefined') {
      clearInterval(progressInterval);
    }
    
    console.error(`[WORKER] ❌ Lỗi dịch chương ${job.data.chapter?.chapterNumber}:`, err);
    
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

      // Emit progress lỗi
      socket.emit('chapterProgress', {
        chapterNumber: job.data.chapter.chapterNumber,
        status: 'FAILED',
        progress: 0,
        jobIndex: job.data.jobIndex,
        totalJobs: job.data.totalJobs,
        room: room
      });
    }
    
    console.log("🔄 [WORKER] ===== JOB THẤT BẠI =====");
    throw err;
  } finally {
    // 🚀 Giảm số lượng active jobs khi job hoàn thành (thành công hoặc thất bại)
    activeJobs--;
    console.log(`[WORKER] 🚦 Active jobs sau khi hoàn thành: ${activeJobs}/${MAX_CONCURRENT_JOBS}`);
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
});

// Khởi tạo socket khi worker start
initializeSocket().then(() => {
  console.log('[WORKER] ✅ Worker đã sẵn sàng với Socket.io connection');
}).catch(error => {
  console.error('[WORKER] ❌ Không thể khởi tạo Socket.io connection:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[WORKER] Đang đóng worker...');
  try {
    await worker.close();
    if (socket) {
      socket.disconnect();
    }
    console.log('[WORKER] Đã đóng worker và socket');
  } catch (error) {
    console.error('[WORKER] Lỗi khi đóng worker:', error);
  }
  process.exit(0);
}); 