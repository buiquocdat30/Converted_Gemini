# Hướng dẫn Test Dịch

## Tổng quan

Các script test này được tạo để kiểm tra và debug vấn đề dịch batch 3 chương. Có 2 loại test:

1. **Test trực tiếp translateService** - Test logic dịch mà không cần server
2. **Test API endpoint** - Test toàn bộ flow từ frontend đến backend

## Các file test

### 1. `test_translation_batch.js`
- Test trực tiếp `translateService.js`
- Không cần server chạy
- Kiểm tra logic dịch cơ bản

### 2. `test_api_endpoint.js`
- Test API endpoint `/api/translate`
- Cần server backend chạy
- Mô phỏng chính xác cách frontend gọi API

### 3. `run_tests.js`
- Script tổng hợp chạy cả 2 test
- Tự động chạy tuần tự

## Cách sử dụng

### Chạy test trực tiếp translateService
```bash
cd back_end
node scripts/test_translation_batch.js
```

### Chạy test API endpoint (cần server chạy)
```bash
# Terminal 1: Khởi động server
cd back_end
npm start

# Terminal 2: Chạy test
cd back_end
node scripts/test_api_endpoint.js
```

### Chạy tất cả test
```bash
cd back_end
node scripts/run_tests.js
```

## Dữ liệu test

Script sử dụng 3 chương truyện tiếng Trung mẫu:

1. **Chương 1**: "第一章 觉醒" - Chương mở đầu về việc thức tỉnh
2. **Chương 2**: "第二章 战斗" - Chương chiến đấu
3. **Chương 3**: "第三章 胜利" - Chương chiến thắng

## Phân tích kết quả

### Kết quả mong đợi
- ✅ Tất cả 3 chương đều dịch thành công
- ✅ Tiêu đề và nội dung đều được dịch sang tiếng Việt
- ✅ Không có lỗi API hoặc key

### Vấn đề có thể gặp
- ❌ Chương 2 chỉ dịch được tiêu đề, nội dung không dịch
- ❌ Lỗi API key hoặc quota
- ❌ Lỗi kết nối server

## Debug vấn đề

### Nếu chương 2 không dịch nội dung:
1. Kiểm tra log chi tiết trong console
2. Xem có lỗi API nào không
3. Kiểm tra key có đủ quota không
4. Xem nội dung chương 2 có ký tự đặc biệt không

### Nếu có lỗi API:
1. Kiểm tra file `.env` có API key hợp lệ
2. Kiểm tra quota của key
3. Thử với key khác

### Nếu không kết nối được server:
1. Đảm bảo server đang chạy: `npm start`
2. Kiểm tra port trong `test_api_endpoint.js`
3. Kiểm tra firewall/antivirus

## Cấu hình

### Thay đổi port server
Sửa trong `test_api_endpoint.js`:
```javascript
const API_BASE_URL = "http://localhost:3001"; // Thay đổi port nếu cần
```

### Thay đổi dữ liệu test
Sửa trong cả 2 file test:
```javascript
const testChapters = [
  // Thay đổi dữ liệu test ở đây
];
```

## Log và file kết quả

- Kết quả chi tiết được in ra console
- File JSON kết quả được lưu với timestamp: `test_result_YYYY-MM-DDTHH-MM-SS.json`
- Log bao gồm:
  - Thời gian dịch từng chương
  - Lỗi chi tiết nếu có
  - So sánh text gốc và text dịch
  - Thống kê tổng quan

## Lưu ý quan trọng

1. **API Key**: Đảm bảo có API key hợp lệ trong `.env`
2. **Quota**: Kiểm tra quota của key trước khi test
3. **Server**: Test API endpoint cần server chạy
4. **Timeout**: API test có timeout 5 phút
5. **Dữ liệu**: Có thể thay đổi dữ liệu test để phù hợp với nhu cầu 