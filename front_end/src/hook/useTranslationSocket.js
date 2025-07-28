import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/config';

export default function useTranslationSocket(roomId, onChapterTranslated) {
  const socketRef = useRef(null);
  const callbackRef = useRef(onChapterTranslated);

  // Luôn giữ callback mới nhất
  useEffect(() => {
    callbackRef.current = onChapterTranslated;
  }, [onChapterTranslated]);

  // Chỉ tạo socket một lần duy nhất
  useEffect(() => {
    console.log('[SOCKET] Khởi tạo socket connection đến:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL);

    // Lắng nghe kết nối
    socketRef.current.on('connect', () => {
      console.log('[SOCKET] Đã kết nối thành công:', socketRef.current.id);
    });

    // Lắng nghe ngắt kết nối
    socketRef.current.on('disconnect', () => {
      console.log('[SOCKET] Đã ngắt kết nối');
    });

    // Lắng nghe kết quả dịch
    socketRef.current.on('chapterTranslated', (data) => {
      console.log('[SOCKET] Nhận kết quả dịch:', {
        chapterNumber: data.chapterNumber,
        hasTranslatedTitle: !!data.translatedTitle,
        hasTranslatedContent: !!data.translatedContent,
        duration: data.duration,
        hasError: data.hasError,
        error: data.error
      });

      // Gọi callback với dữ liệu nhận được
      if (callbackRef.current) {
        callbackRef.current(data);
      } else {
        console.warn('[SOCKET] Không có callback để xử lý kết quả dịch');
      }
    });

    // Lắng nghe lỗi socket
    socketRef.current.on('connect_error', (error) => {
      console.error('[SOCKET] Lỗi kết nối:', error);
    });

    return () => {
      console.log('[SOCKET] Đóng socket connection');
      socketRef.current.disconnect();
    };
  }, []);

  // Khi roomId đổi thì emit join
  useEffect(() => {
    if (roomId && socketRef.current) {
      console.log('[SOCKET] Join room:', roomId);
      socketRef.current.emit('join', roomId);
    }
  }, [roomId]);

  // Trả về socket ref để component có thể sử dụng nếu cần
  return socketRef.current;
}
