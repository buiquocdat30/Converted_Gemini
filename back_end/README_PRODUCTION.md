# 🚀 Production Setup Guide

## Cấu trúc Production

```
back_end/
├── index.js           ← Express server (port 8000)
├── socket.js          ← Socket.io server (port 8001)  
├── utils/worker.js    ← BullMQ worker
├── redisClient.js     ← Redis connection
├── start-production.js ← Script chạy tất cả
└── ...
```

## 📋 Yêu cầu

1. **Redis** đang chạy trên `localhost:6379`
2. **Node.js** và **npm** đã cài đặt
3. **Dependencies** đã cài: `@socket.io/redis-adapter`, `redis`, `socket.io-client`
4. **Environment variables** (tạo file `.env`):

```env
# CORS Origin (cho Socket.io và Express) - Hỗ trợ nhiều domain
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"

# Google API
GOOGLE_API_KEY="your_google_api_key_here"

# JWT Secret
JWT_SECRET="your_jwt_secret_here"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

## 🔧 Cài đặt Dependencies

```bash
cd back_end
npm install @socket.io/redis-adapter redis socket.io-client
```

## 🚀 Chạy Production

### Cách 1: Chạy tất cả cùng lúc
```bash
cd back_end
node start-production.js
```

### Cách 2: Chạy từng service riêng biệt

**Terminal 1 - Express server:**
```bash
cd back_end
node index.js
```

**Terminal 2 - Socket.io server:**
```bash
cd back_end  
node socket.js
```

**Terminal 3 - Worker:**
```bash
cd back_end
node utils/worker.js
```

## 🌐 Ports

- **Express Server**: `http://localhost:8000`
- **Socket.io Server**: `http://localhost:8001`
- **Redis**: `localhost:6379`

## 📊 Luồng hoạt động

1. **FE** kết nối Socket.io server qua port 8001
2. **FE** gọi API qua Express server port 8000
3. **Express** nhận request, đưa job vào BullMQ queue
4. **Worker** lấy job từ queue, dịch và emit kết quả qua Socket.io
5. **Socket.io** nhận event từ worker, emit về FE

## 🔍 Kiểm tra hoạt động

1. **Express server**: Truy cập `http://localhost:8000/models`
2. **Socket.io server**: Log sẽ hiện "Socket.io server chạy trên port 8001"
3. **Worker**: Log sẽ hiện "Worker process đã sẵn sàng"
4. **Redis**: Đảm bảo Redis đang chạy

## 🛠️ Troubleshooting

### Lỗi "Redis connection failed"
- Kiểm tra Redis có đang chạy không: `redis-cli ping`
- Khởi động Redis: `redis-server`

### Lỗi "Port already in use"
- Kiểm tra port 8000, 8001 có đang được sử dụng không
- Dừng process đang sử dụng port đó

### Lỗi "Worker không nhận job"
- Kiểm tra Redis connection
- Kiểm tra BullMQ queue configuration

### Lỗi "CORS error"
- Kiểm tra `CORS_ORIGIN` trong file `.env`
- Đảm bảo FE đang chạy trên đúng domain
- **Mới**: Hệ thống đã hỗ trợ cả `localhost:3000` và `localhost:5173`
- Nếu vẫn lỗi, restart cả FE và BE

### Lỗi "Socket connection failed"
- Kiểm tra Socket.io server có đang chạy trên port 8001 không
- Kiểm tra CORS origin có khớp với domain FE không
- Kiểm tra firewall có chặn port 8001 không

## 📝 Logs

- `[SERVER]`: Express server logs
- `[SOCKET]`: Socket.io server logs  
- `[WORKER]`: Worker process logs
- `[REDIS]`: Redis connection logs

## 🎯 Cải tiến Production

### ✅ Graceful Shutdown
- Tất cả services đều có xử lý `SIGINT` để đóng kết nối an toàn
- Redis connections được đóng đúng cách
- Worker và Socket.io client được disconnect gracefully

### ✅ Room Management
- Format room rõ ràng: `user:{userId}` hoặc `story:{storyId}`
- Tránh trùng lặp room ID
- Dễ quản lý khi scale

### ✅ Environment Variables
- `CORS_ORIGIN` có thể cấu hình qua `.env`
- Hỗ trợ nhiều domain khác nhau

### ✅ Redis Optimization
- Tránh connect Redis 2 lần
- Sử dụng `pubClient` và `subClient` cho adapter
- Graceful disconnect khi shutdown

## 🎯 Ưu điểm Production Setup

✅ **Separation of Concerns**: Mỗi service có trách nhiệm riêng  
✅ **Scalability**: Có thể scale từng service độc lập  
✅ **Reliability**: Một service lỗi không ảnh hưởng service khác  
✅ **Redis Pub/Sub**: Worker emit socket về FE qua Redis adapter  
✅ **Graceful Shutdown**: Đóng kết nối an toàn khi shutdown  
✅ **Environment Config**: Cấu hình linh hoạt qua .env  
✅ **Room Management**: Quản lý room rõ ràng, tránh trùng lặp  
✅ **Microservices**: Chuẩn architecture cho production 