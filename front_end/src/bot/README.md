# Translation Bot - Hướng dẫn sử dụng

## Tổng quan
Translation Bot là một chatbot hỗ trợ người dùng trong việc dịch truyện, được tích hợp vào trang Translate của ứng dụng.

## Cách sử dụng

### 1. Mở Bot
- Bot xuất hiện dưới dạng nút tròn màu xanh (🤖) ở góc phải dưới màn hình
- Click vào nút để mở cửa sổ chat

### 2. Các lệnh hỗ trợ

#### 🔄 Dịch nội dung
```
dịch [nội dung cần dịch]
```
**Ví dụ:** `dịch Hello world`

#### 📚 Thêm truyện mới
```
thêm truyện [tên truyện]
```
**Ví dụ:** `thêm truyện Truyện kiếm hiệp`

#### 📖 Thêm chương mới
```
thêm chương [tên chương]
```
**Ví dụ:** `thêm chương Chương 1: Khởi đầu`

#### 🔑 Thêm API Key
```
thêm key [api_key]
```
**Ví dụ:** `thêm key AIzaSyC...`

#### ❓ Trợ giúp
```
giúp
help
?
```
Hiển thị danh sách tất cả các lệnh hỗ trợ

#### 🧹 Xóa lịch sử chat
```
xóa
clear
```
Xóa toàn bộ lịch sử chat

## Tính năng

### ✅ Đã hoàn thành
- [x] Giao diện chat đẹp mắt
- [x] Parser lệnh cơ bản
- [x] Hỗ trợ tiếng Việt
- [x] Responsive design
- [x] Dark mode support
- [x] Animation mượt mà

### 🔄 Đang phát triển
- [ ] Tích hợp với ConvertContext
- [ ] Gọi API dịch thực tế
- [ ] Lưu trữ lịch sử chat
- [ ] Tích hợp với hệ thống quản lý truyện

### 📋 Kế hoạch tương lai
- [ ] Hỗ trợ voice chat
- [ ] Tích hợp AI để hiểu lệnh tự nhiên
- [ ] Hỗ trợ đa ngôn ngữ
- [ ] Tích hợp với các service khác

## Cấu trúc code

```
src/bot/
├── TranslationBot.jsx    # Component UI chính
├── BotLogic.js          # Parser lệnh
├── BotService.js        # Xử lý hành động
├── TranslationBot.css    # Style
├── index.js             # Export
└── README.md            # Hướng dẫn này
```

## Tích hợp

Bot đã được tích hợp vào trang Translate và sẽ xuất hiện ở tất cả các tab:
- Tab "Dịch truyện mới"
- Tab "Truyện đang dịch"

## Ghi chú

- Bot hiện tại chỉ xử lý lệnh cơ bản và trả về thông báo
- Để thực hiện các hành động thực tế, cần tích hợp với ConvertContext
- Có thể mở rộng thêm các lệnh mới trong `BotLogic.js`
- Style có thể tùy chỉnh trong `TranslationBot.css`
