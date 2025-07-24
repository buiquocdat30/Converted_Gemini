import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/config';

export default function useTranslationSocket(roomId, onChapterTranslated) {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    // Join room (userId hoặc storyId)
    socketRef.current.emit('join', roomId);

    // Lắng nghe kết quả dịch
    socketRef.current.on('chapterTranslated', (data) => {
      onChapterTranslated(data);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, onChapterTranslated]);
}
