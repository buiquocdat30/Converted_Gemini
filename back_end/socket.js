const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const redisClient = require('./redisClient');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173", 
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = 8001; // Socket.io chạy port khác với Express

// Khởi động socket server
async function startSocketServer() {
  try {
    // Đảm bảo Redis client chính đã connect
    if (!redisClient.isReady) {
      console.log('[SOCKET] Đang kết nối Redis client chính...');
      await redisClient.connect();
    }

    // Redis adapter
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[SOCKET] Redis adapter đã sẵn sàng');

    // Socket events
    io.on('connection', (socket) => {
      console.log('🔌 [SOCKET] ===== CLIENT KẾT NỐI ====');
      console.log('[SOCKET] 📱 Client kết nối:', socket.id);

      socket.on('join', (roomId) => {
        console.log('🏠 [SOCKET] ===== CLIENT JOIN ROOM ====');
        socket.join(roomId);
        let extra = '';
        try {
          // Nếu FE truyền roomId là object JSON, parse và log chi tiết
          let info = roomId;
          if (typeof roomId === 'string' && (roomId.startsWith('{') || roomId.startsWith('['))) {
            info = JSON.parse(roomId);
          }
          if (typeof info === 'object') {
            extra = ` | userId: ${info.userId || ''} | storyId: ${info.storyId || ''} | chapterId: ${info.chapterId || ''}`;
            if (info.chapters) {
              extra += ` | chapters: ${Array.isArray(info.chapters) ? info.chapters.length : JSON.stringify(info.chapters)}`;
            }
          }
        } catch (e) {
          extra = ' | roomId parse error';
        }
        console.log(`[SOCKET] ✅ Socket ${socket.id} joined room ${roomId}${extra}`);
        console.log('🏠 [SOCKET] ===== JOIN ROOM HOÀN THÀNH ====');
      });

      socket.on('disconnect', () => {
        console.log('🔌 [SOCKET] ===== CLIENT NGẮT KẾT NỐI ====');
        console.log('[SOCKET] 📱 Client ngắt kết nối:', socket.id);
      });

      // Lắng nghe event từ worker
      socket.on('chapterTranslated', (data) => {
        console.log('📤 [SOCKET] ===== NHẬN EVENT TỪ WORKER ====');
        console.log('[SOCKET] 📥 Nhận event chapterTranslated:', {
          chapterNumber: data.chapterNumber,
          hasTranslatedTitle: !!data.translatedTitle,
          hasTranslatedContent: !!data.translatedContent,
          titleLength: data.translatedTitle?.length || 0,
          contentLength: data.translatedContent?.length || 0,
          duration: data.duration,
          hasError: data.hasError,
          room: data.room
        });
        
        // Emit về đúng room cho FE với format room rõ ràng
        const room = data.room || (data.userId ? `user:${data.userId}` : `story:${data.storyId}`);
        if (room) {
          console.log(`[SOCKET] 📤 Emit chapterTranslated về room: ${room}`);
          io.to(room).emit('chapterTranslated', data);
          console.log('[SOCKET] ✅ Đã emit thành công');
        } else {
          console.warn('[SOCKET] ⚠️ Không có room để emit chapterTranslated');
        }
        console.log('📤 [SOCKET] ===== EMIT HOÀN THÀNH ====');
      });
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('[SOCKET] Đang đóng kết nối Redis...');
      try {
        await pubClient.quit();
        await subClient.quit();
        console.log('[SOCKET] Đã đóng Redis connections');
      } catch (error) {
        console.error('[SOCKET] Lỗi khi đóng Redis:', error);
      }
      process.exit(0);
    });

    // Khởi động server
    httpServer.listen(PORT, () => {
      console.log(`[SOCKET] Socket.io server chạy trên port ${PORT}`);
    });

  } catch (error) {
    console.error('[SOCKET] Lỗi khởi động:', error);
    process.exit(1);
  }
}

startSocketServer(); 