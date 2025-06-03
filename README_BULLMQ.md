# Hướng dẫn tích hợp BullMQ vào dự án

## 1. Cấu trúc Docker Compose

```yaml
version: '3.8'
services:
  # Backend service
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    volumes:
      - ./backend:/app
      - /app/node_modules

  # Redis service
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # Bull Board UI
  bull-board:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - BULL_BOARD_PORT=3001
    command: npm run bull-board

volumes:
  redis_data:
```

## 2. Cài đặt dependencies

```bash
npm install bull ioredis @bull-board/api @bull-board/express @bull-board/ui
```

## 3. Cấu trúc thư mục

```
backend/
  ├── src/
  │   ├── queue/
  │   │   └── queueManager.js    # Quản lý queue và job
  │   ├── app.js                 # Express app với Bull Board
  │   └── ...
  ├── Dockerfile
  └── package.json

front_end/
  └── src/
      └── services/
          └── translateService.js # Service gọi API queue
```

## 4. Các bước triển khai

### Bước 1: Cài đặt môi trường

- Cài đặt Docker và Docker Compose
- Clone repository và cài đặt dependencies

### Bước 2: Cấu hình Queue Manager

- Tạo file `backend/src/queue/queueManager.js`
- Cấu hình Redis và Bull Queue
- Thiết lập Bull Board UI
- Định nghĩa các processor cho job

### Bước 3: Tích hợp vào Express

- Mount Bull Board UI vào `/admin/queues`
- Thêm các endpoint API để thêm job vào queue
- Xử lý request từ frontend

### Bước 4: Tích hợp Frontend

- Tạo service để gọi API queue
- Cập nhật UI để hiển thị trạng thái job
- Xử lý response và error

### Bước 5: Chạy và Test

1. Chạy `docker-compose up`
2. Truy cập Bull Board UI tại `http://localhost:3001/admin/queues`
3. Test các chức năng:
   - Dịch một chương
   - Dịch nhiều chương
   - Xem trạng thái job
   - Xử lý lỗi và retry

## 5. Tính năng chính

### Queue Management

- Xử lý đồng thời nhiều task dịch
- Tự động retry khi thất bại
- Ưu tiên các task quan trọng
- Lưu trữ lịch sử job

### Monitoring

- Bull Board UI để theo dõi jobs
- Xem trạng thái, lỗi, thời gian xử lý
- Quản lý và xóa jobs thủ công

### Scaling

- Dễ dàng thêm worker nodes
- Phân tán tải giữa các worker
- Xử lý đồng thời nhiều truyện

### Security & Stability

- Redis persistence
- Job retry với backoff
- Xử lý lỗi và logging

### Resource Optimization

- Kiểm soát số lượng job đồng thời
- Ưu tiên job theo độ ưu tiên
- Tự động dọn dẹp job đã hoàn thành

## 6. Mở rộng trong tương lai

- Rate limiting cho API
- Job scheduling
- Worker scaling
- Error reporting
- Metrics collection

## 7. Lưu ý quan trọng

1. Backup Redis data thường xuyên
2. Monitor memory usage của Redis
3. Cấu hình retry và timeout phù hợp
4. Xử lý lỗi và logging đầy đủ
5. Bảo mật Bull Board UI

## 8. Troubleshooting

1. Redis connection issues

   - Kiểm tra REDIS_URL
   - Kiểm tra network trong Docker
   - Xem logs của Redis container

2. Job processing errors

   - Kiểm tra logs của worker
   - Xem job details trong Bull Board
   - Kiểm tra retry settings

3. Performance issues
   - Monitor Redis memory usage
   - Kiểm tra số lượng concurrent jobs
   - Tối ưu job priority

## 9. Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Bull Board Documentation](https://github.com/felixmosh/bull-board)
- [Docker Documentation](https://docs.docker.com/)
