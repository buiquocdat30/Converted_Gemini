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
    socketRef.current = io(SOCKET_URL);

    // Lắng nghe kết quả dịch
    socketRef.current.on('chapterTranslated', (data) => {
      callbackRef.current(data);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Khi roomId đổi thì emit join
  useEffect(() => {
    if (roomId && socketRef.current) {
      socketRef.current.emit('join', roomId);
    }
  }, [roomId]);
}
