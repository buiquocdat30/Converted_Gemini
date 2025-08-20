import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/config';

export default function useTranslationSocket(roomId, onChapterTranslated, onChapterProgress, onChapterStarted) {
  const socketRef = useRef(null);
  const callbackRef = useRef(onChapterTranslated);
  const progressCallbackRef = useRef(onChapterProgress);
  const startedCallbackRef = useRef(onChapterStarted);

  // Luôn giữ callback mới nhất
  useEffect(() => {
    ///console.log('[FE-SOCKET] 🔄 Cập nhật callback onChapterTranslated');
    callbackRef.current = onChapterTranslated;
  }, [onChapterTranslated]);

  useEffect(() => {
    //console.log('[FE-SOCKET] 🔄 Cập nhật callback onChapterProgress');
    progressCallbackRef.current = onChapterProgress;
  }, [onChapterProgress]);

  useEffect(() => {
    //console.log('[FE-SOCKET] 🔄 Cập nhật callback onChapterStarted');
    startedCallbackRef.current = onChapterStarted;
  }, [onChapterStarted]);

  // Chỉ tạo socket một lần duy nhất
  useEffect(() => {
    //console.log('🔌 [FE-SOCKET] ===== KHỞI TẠO SOCKET ====');
    //console.log('[FE-SOCKET] 🌐 Kết nối đến:', SOCKET_URL);
    //console.log('[FE-SOCKET] 🏠 Room ID:', roomId);
    
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    // Lắng nghe kết nối
    socketRef.current.on('connect', () => {
      console.log('[FE-SOCKET] ✅ Đã kết nối thành công:', socketRef.current.id);
      console.log('[FE-SOCKET] 📡 Socket URL:', SOCKET_URL);
      console.log('[FE-SOCKET] 🏠 Room ID hiện tại:', roomId);
    });

    // Lắng nghe ngắt kết nối
    socketRef.current.on('disconnect', (reason) => {
      console.log('[FE-SOCKET] ❌ Đã ngắt kết nối, lý do:', reason);
    });

    // Lắng nghe kết quả dịch
    socketRef.current.on('chapterTranslated', (data) => {
      console.log('📥 [FE-SOCKET] ===== NHẬN KẾT QUẢ DỊCH ====');
      console.log('[FE-SOCKET] 📋 Dữ liệu nhận được:', {
        chapterNumber: data.chapterNumber,
        hasTranslatedTitle: !!data.translatedTitle,
        hasTranslatedContent: !!data.translatedContent,
        titleLength: data.translatedTitle?.length || 0,
        contentLength: data.translatedContent?.length || 0,
        duration: data.duration,
        hasError: data.hasError,
        error: data.error,
        jobIndex: data.jobIndex,
        totalJobs: data.totalJobs
      });
      const titlePreview = (data.translatedTitle || '').replace(/\s+/g, ' ').slice(0, 120);
      const contentPreview = (data.translatedContent || '').replace(/\s+/g, ' ').slice(0, 250);
      console.log(`[FE-SOCKET] 🧩 Preview chương ${data.chapterNumber}:`);
      console.log(`             • Tiêu đề: "${titlePreview}"`);
      console.log(`             • Nội dung[0..250]: "${contentPreview}"`);
      console.log('[FE-SOCKET] 🔍 Kiểm tra callback có tồn tại:', !!callbackRef.current);
      console.log('[FE-SOCKET] 🔍 Callback function type:', typeof callbackRef.current);
      console.log('[FE-SOCKET] 🔍 Callback function name:', callbackRef.current?.name || 'anonymous');

      // Gọi callback với dữ liệu nhận được
      if (callbackRef.current) {
        console.log('[FE-SOCKET] 🔄 Gọi callback xử lý kết quả...');
        console.log('[FE-SOCKET] 📤 Data gửi cho callback:', data);
        try {
          const result = callbackRef.current(data);
          console.log('[FE-SOCKET] ✅ Đã xử lý kết quả thành công');
          console.log('[FE-SOCKET] 📤 Kết quả callback:', result);
        } catch (error) {
          console.error('[FE-SOCKET] ❌ Lỗi khi gọi callback:', error);
          console.error('[FE-SOCKET] ❌ Error stack:', error.stack);
        }
      } else {
        console.warn('[FE-SOCKET] ⚠️ Không có callback để xử lý kết quả dịch');
        console.warn('[FE-SOCKET] ⚠️ Callback ref:', callbackRef.current);
      }
      console.log('📥 [FE-SOCKET] ===== HOÀN THÀNH XỬ LÝ ====');
    });

    // Lắng nghe progress
    socketRef.current.on('chapterProgress', (data) => {
      console.log('📊 [FE-SOCKET] ===== NHẬN PROGRESS ====');
      console.log('[FE-SOCKET] 📋 Progress data:', {
        chapterNumber: data.chapterNumber,
        status: data.status,
        progress: data.progress,
        jobIndex: data.jobIndex,
        totalJobs: data.totalJobs
      });
      console.log('[FE-SOCKET] 🔍 Kiểm tra progress callback có tồn tại:', !!progressCallbackRef.current);
      console.log('[FE-SOCKET] 🔍 Progress callback type:', typeof progressCallbackRef.current);

      // Gọi callback progress
      if (progressCallbackRef.current) {
        console.log('[FE-SOCKET] 🔄 Gọi callback xử lý progress...');
        console.log('[FE-SOCKET] 📤 Progress data gửi cho callback:', data);
        try {
          const result = progressCallbackRef.current(data);
          console.log('[FE-SOCKET] ✅ Đã xử lý progress thành công');
          console.log('[FE-SOCKET] 📤 Progress callback result:', result);
        } catch (error) {
          console.error('[FE-SOCKET] ❌ Lỗi khi gọi progress callback:', error);
          console.error('[FE-SOCKET] ❌ Progress error stack:', error.stack);
        }
      } else {
        console.warn('[FE-SOCKET] ⚠️ Không có callback để xử lý progress');
        console.warn('[FE-SOCKET] ⚠️ Progress callback ref:', progressCallbackRef.current);
      }
      console.log('📊 [FE-SOCKET] ===== HOÀN THÀNH XỬ LÝ PROGRESS ====');
    });

    // Lắng nghe event chapterStarted
    socketRef.current.on('chapterStarted', (data) => {
      console.log('🚀 [FE-SOCKET] ===== NHẬN EVENT CHAPTER STARTED ====');
      console.log('[FE-SOCKET] 📋 Chapter started data:', {
        chapterNumber: data.chapterNumber,
        jobIndex: data.jobIndex,
        totalJobs: data.totalJobs,
        startTime: data.startTime,
        modelRpm: data.modelRpm
      });
      console.log('[FE-SOCKET] 🔍 Kiểm tra started callback có tồn tại:', !!startedCallbackRef.current);
      console.log('[FE-SOCKET] 🔍 Started callback type:', typeof startedCallbackRef.current);

      // Gọi callback chapterStarted
      if (startedCallbackRef.current) {
        console.log('[FE-SOCKET] 🔄 Gọi callback xử lý chapter started...');
        console.log('[FE-SOCKET] 📤 Started data gửi cho callback:', data);
        try {
          const result = startedCallbackRef.current(data);
          console.log('[FE-SOCKET] ✅ Đã xử lý chapter started thành công');
          console.log('[FE-SOCKET] 📤 Started callback result:', result);
        } catch (error) {
          console.error('[FE-SOCKET] ❌ Lỗi khi gọi started callback:', error);
          console.error('[FE-SOCKET] ❌ Started error stack:', error.stack);
        }
      } else {
        console.warn('[FE-SOCKET] ⚠️ Không có callback để xử lý chapter started');
        console.warn('[FE-SOCKET] ⚠️ Started callback ref:', startedCallbackRef.current);
      }
      console.log('🚀 [FE-SOCKET] ===== HOÀN THÀNH XỬ LÝ CHAPTER STARTED ====');
    });

    // Lắng nghe lỗi socket
    socketRef.current.on('connect_error', (error) => {
      console.error('[FE-SOCKET] ❌ Lỗi kết nối:', error);
      console.error('[FE-SOCKET] ❌ Error details:', {
        message: error.message,
        type: error.type,
        description: error.description
      });
    });

    // Lắng nghe lỗi kết nối
    socketRef.current.on('error', (error) => {
      console.error('[FE-SOCKET] ❌ Socket error:', error);
    });

    // Lắng nghe reconnect
    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('[FE-SOCKET] 🔄 Đã kết nối lại, lần thử:', attemptNumber);
    });

    // Lắng nghe reconnect_attempt
    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('[FE-SOCKET] 🔄 Đang thử kết nối lại, lần thử:', attemptNumber);
    });

    return () => {
      console.log('[FE-SOCKET] 🔌 Đóng socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Khi roomId đổi thì emit join
  useEffect(() => {
    if (roomId && socketRef.current) {
      console.log('🏠 [FE-SOCKET] ===== JOIN ROOM ====');
      console.log('[FE-SOCKET] 📍 Join room:', roomId);
      console.log('[FE-SOCKET] 🔍 Socket connected:', socketRef.current.connected);
      
      try {
        socketRef.current.emit('join', roomId);
        console.log('[FE-SOCKET] ✅ Đã emit join room thành công');
      } catch (error) {
        console.error('[FE-SOCKET] ❌ Lỗi khi emit join room:', error);
      }
      
      console.log('🏠 [FE-SOCKET] ===== JOIN ROOM HOÀN THÀNH ====');
    } else {
      console.log('[FE-SOCKET] ⚠️ Không thể join room:', {
        roomId,
        socketExists: !!socketRef.current,
        socketConnected: socketRef.current?.connected
      });
    }
  }, [roomId]);

  // Log thông tin socket mỗi khi roomId thay đổi
  useEffect(() => {
    console.log('[FE-SOCKET] 📊 Thông tin socket hiện tại:', {
      roomId,
      socketExists: !!socketRef.current,
      socketConnected: socketRef.current?.connected,
      socketId: socketRef.current?.id
    });
  }, [roomId]);

  // Trả về socket ref để component có thể sử dụng nếu cần
  return socketRef.current;
}
