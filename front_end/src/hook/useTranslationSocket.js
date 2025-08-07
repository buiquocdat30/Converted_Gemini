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
    callbackRef.current = onChapterTranslated;
  }, [onChapterTranslated]);

  useEffect(() => {
    progressCallbackRef.current = onChapterProgress;
  }, [onChapterProgress]);

  useEffect(() => {
    startedCallbackRef.current = onChapterStarted;
  }, [onChapterStarted]);

  // Chỉ tạo socket một lần duy nhất
  useEffect(() => {
    console.log('🔌 [FE-SOCKET] ===== KHỞI TẠO SOCKET ====');
    console.log('[FE-SOCKET] 🌐 Kết nối đến:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL);

    // Lắng nghe kết nối
    socketRef.current.on('connect', () => {
      console.log('[FE-SOCKET] ✅ Đã kết nối thành công:', socketRef.current.id);
    });

    // Lắng nghe ngắt kết nối
    socketRef.current.on('disconnect', () => {
      console.log('[FE-SOCKET] ❌ Đã ngắt kết nối');
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

      // Gọi callback với dữ liệu nhận được
      if (callbackRef.current) {
        console.log('[FE-SOCKET] 🔄 Gọi callback xử lý kết quả...');
        callbackRef.current(data);
        console.log('[FE-SOCKET] ✅ Đã xử lý kết quả thành công');
      } else {
        console.warn('[FE-SOCKET] ⚠️ Không có callback để xử lý kết quả dịch');
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

      // Gọi callback progress
      if (progressCallbackRef.current) {
        console.log('[FE-SOCKET] 🔄 Gọi callback xử lý progress...');
        progressCallbackRef.current(data);
        console.log('[FE-SOCKET] ✅ Đã xử lý progress thành công');
      } else {
        console.warn('[FE-SOCKET] ⚠️ Không có callback để xử lý progress');
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

      // Gọi callback chapterStarted
      if (startedCallbackRef.current) {
        console.log('[FE-SOCKET] 🔄 Gọi callback xử lý chapter started...');
        startedCallbackRef.current(data);
        console.log('[FE-SOCKET] ✅ Đã xử lý chapter started thành công');
      } else {
        console.warn('[FE-SOCKET] ⚠️ Không có callback để xử lý chapter started');
      }
      console.log('🚀 [FE-SOCKET] ===== HOÀN THÀNH XỬ LÝ CHAPTER STARTED ====');
    });

    // Lắng nghe lỗi socket
    socketRef.current.on('connect_error', (error) => {
      console.error('[FE-SOCKET] ❌ Lỗi kết nối:', error);
    });

    return () => {
      console.log('[FE-SOCKET] 🔌 Đóng socket connection');
      socketRef.current.disconnect();
    };
  }, []);

  // Khi roomId đổi thì emit join
  useEffect(() => {
    if (roomId && socketRef.current) {
      console.log('🏠 [FE-SOCKET] ===== JOIN ROOM ====');
      console.log('[FE-SOCKET] 📍 Join room:', roomId);
      socketRef.current.emit('join', roomId);
      console.log('🏠 [FE-SOCKET] ===== JOIN ROOM HOÀN THÀNH ====');
    }
  }, [roomId]);

  // Trả về socket ref để component có thể sử dụng nếu cần
  return socketRef.current;
}
