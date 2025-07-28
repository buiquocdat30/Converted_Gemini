# 🔧 Hướng dẫn Debug Worker và Socket

## 🚀 Cách chạy hệ thống

### 1. Chạy Redis (bắt buộc)
```bash
# Windows
redis-server

# Linux/Mac
sudo service redis start
```

### 2. Chạy Backend với Worker
```bash
# Cách 1: Chạy riêng biệt
npm run start    # Terminal 1 - Server chính
npm run worker   # Terminal 2 - Worker process

# Cách 2: Chạy cùng lúc (cần cài concurrently)
npm run dev
```

### 3. Chạy Frontend
```bash
cd ../front_end
npm start
```

## 🔍 Debug Steps

### 1. Kiểm tra Redis
```bash
redis-cli ping
# Kết quả: PONG
```

### 2. Kiểm tra Queue
```bash
redis-cli
> KEYS *queue*
> LLEN bull:my-queue:wait
```

### 3. Logs cần theo dõi

#### Backend Server (index.js):
```
[SERVER] Server is running on http://localhost:8000
[SOCKET] User connected: [socket-id]
[SOCKET] Socket [socket-id] joined room [room-id]
```

#### Worker Process:
```
[WORKER] Worker process started at [time] | PID: [pid]
[WORKER] Nhận job dịch chương: [chapter-number]
[WORKER] Job data: { chapterNumber, model, storyId, userId }
[WORKER] Bắt đầu dịch chương [chapter-number]
[WORKER] Dịch xong - Title: [preview]...
[WORKER] Dịch xong - Content: [preview]...
[WORKER] Dịch xong chương [chapter-number], emit về room [room-id]
[WORKER] Kết quả emit: { chapterNumber, hasTranslatedTitle, hasTranslatedContent, duration, hasError }
[WORKER] Job [job-id] đã hoàn thành!
```

#### Frontend Socket:
```
[SOCKET] Khởi tạo socket connection đến: http://localhost:8000
[SOCKET] Đã kết nối thành công: [socket-id]
[SOCKET] Join room: [room-id]
[SOCKET] Nhận kết quả dịch: { chapterNumber, hasTranslatedTitle, hasTranslatedContent, duration, hasError, error }
```

## 🐛 Các lỗi thường gặp

### 1. "Redis connection failed"
- **Nguyên nhân**: Redis chưa chạy
- **Giải pháp**: Khởi động Redis server

### 2. "Worker không nhận job"
- **Nguyên nhân**: Worker process chưa chạy
- **Giải pháp**: Chạy `npm run worker`

### 3. "Socket không kết nối"
- **Nguyên nhân**: CORS hoặc URL sai
- **Giải pháp**: Kiểm tra SOCKET_URL trong frontend config

### 4. "Không nhận được kết quả dịch"
- **Nguyên nhân**: 
  - Worker không emit đúng room
  - Frontend không join đúng room
  - translateText trả về lỗi
- **Giải pháp**: 
  - Kiểm tra log worker
  - Kiểm tra roomId trong FE
  - Kiểm tra API key và model

## 📊 Kiểm tra trạng thái

### 1. Queue Status
```bash
redis-cli
> KEYS bull:my-queue:*
> LLEN bull:my-queue:wait
> LLEN bull:my-queue:active
> LLEN bull:my-queue:completed
> LLEN bull:my-queue:failed
```

### 2. Socket Connections
```bash
# Trong browser console
console.log(socket.connected);
console.log(socket.id);
```

### 3. Worker Status
```bash
# Kiểm tra process worker
ps aux | grep worker.js
```

## 🔧 Các thay đổi đã thực hiện

### 1. Worker (utils/worker.js)
- ✅ Sửa tham số gọi translateText
- ✅ Thêm logging chi tiết
- ✅ Xử lý lỗi tốt hơn
- ✅ Emit đúng format data

### 2. Socket Hook (useTranslationSocket.js)
- ✅ Thêm logging kết nối
- ✅ Thêm logging nhận data
- ✅ Xử lý lỗi socket
- ✅ Trả về socket ref

### 3. Package.json
- ✅ Thêm script worker
- ✅ Thêm script dev (chạy cả 2)
- ✅ Thêm concurrently dependency

## 🎯 Kết quả mong đợi

Khi chạy đúng, bạn sẽ thấy:
1. Backend server chạy trên port 8000
2. Worker process chạy và log "Worker process started"
3. Frontend kết nối socket thành công
4. Khi gửi request dịch:
   - Controller nhận request và đưa vào queue
   - Worker nhận job và bắt đầu dịch
   - Worker emit kết quả về FE qua socket
   - FE nhận được kết quả và cập nhật UI 