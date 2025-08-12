# Hướng Dẫn Debug Usage Stats

## 🔍 Vấn Đề
Phần KeyManagement trong Users.jsx không hiển thị được thống kê usage theo ngày, dù đã sử dụng nhiều lần trong ngày.

## 📋 Các Script Test

### 1. `debug_usage_stats.js`
**Mục đích**: Phân tích toàn bộ dữ liệu usage và tìm vấn đề
```bash
node debug_usage_stats.js
```

**Kết quả mong đợi**:
- Hiển thị tất cả user keys và usage records
- Kiểm tra xem có usage records nào được cập nhật hôm nay không
- Phân tích vấn đề có thể có

### 2. `fix_usage_data.js`
**Mục đích**: Sửa dữ liệu usage không nhất quán
```bash
node fix_usage_data.js
```

**Kết quả mong đợi**:
- Sửa các usage records có usageCount > 0 nhưng lastUsedAt null
- Sửa các usage records có lastUsedAt nhưng usageCount = 0
- Tạo dữ liệu test cho các records trống

### 3. `test_simple_usage.js`
**Mục đích**: Test đơn giản để kiểm tra dữ liệu
```bash
node test_simple_usage.js
```

### 4. `test_update_usage.js`
**Mục đích**: Test cập nhật usage và kiểm tra thống kê
```bash
node test_update_usage.js
```

### 5. `test_translate_usage.js`
**Mục đích**: Test việc cập nhật usage trong quá trình translate
```bash
node test_translate_usage.js
```

## 🔧 Các Vấn Đề Đã Sửa

### Backend (`userApiKeyController.js`)
1. ✅ Sửa logic trong `getTodayUsageStats()`:
   - Lấy tất cả usage records thay vì chỉ lọc theo lastUsedAt
   - Lọc usage records theo ngày trong JavaScript thay vì trong query
   - Thêm logging để debug

### Frontend (`Users.jsx`)
1. ✅ Sửa logic hiển thị trong KeyManagement:
   - Sử dụng `key.usage` thay vì `key.models`
   - Hiển thị trạng thái dựa trên usage records
   - Hiển thị usage trong ngày

## 🚀 Cách Sử Dụng

### Bước 1: Debug dữ liệu
```bash
cd back_end
node debug_usage_stats.js
```

### Bước 2: Sửa dữ liệu nếu cần
```bash
node fix_usage_data.js
```

### Bước 3: Test API endpoint
```bash
# Khởi động server
npm start

# Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/user/keys/usage/today
```

### Bước 4: Kiểm tra frontend
- Vào trang Users
- Chọn tab "Quản lý khoá (key)"
- Kiểm tra xem có hiển thị usage hôm nay không

## 🔍 Các Vấn Đề Có Thể Có

### 1. Dữ liệu không nhất quán
- `usageCount > 0` nhưng `lastUsedAt = null`
- `lastUsedAt` có giá trị nhưng `usageCount = 0`

### 2. API không được gọi
- `updateUsageStats` không được gọi trong quá trình translate
- `usageId` không được truyền đúng

### 3. Logic hiển thị sai
- Frontend sử dụng sai field để hiển thị
- API trả về sai format

## 📊 Cấu Trúc Dữ Liệu

### UserApiKey
```javascript
{
  id: "string",
  key: "string",
  label: "string",
  userId: "string",
  usage: [UserApiKeyUsage]
}
```

### UserApiKeyUsage
```javascript
{
  id: "string",
  userApiKeyId: "string",
  modelId: "string",
  status: "ACTIVE|COOLDOWN|EXHAUSTED",
  usageCount: number,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  lastUsedAt: Date,
  model: Model
}
```

## 🎯 Kết Quả Mong Đợi

Sau khi chạy các script và sửa lỗi, bạn sẽ thấy:

1. **Backend**: API `/user/keys/usage/today` trả về dữ liệu usage trong ngày
2. **Frontend**: KeyManagement hiển thị usage hôm nay cho từng key
3. **Database**: Usage records có `lastUsedAt` được cập nhật đúng

## 📝 Logs Quan Trọng

Khi chạy server, chú ý các logs sau:
- `🔍 Lấy thống kê usage cho user...`
- `📊 Tìm thấy X keys cho user`
- `Key ... có X/Y usage records hôm nay`
- `✅ Trả về X keys có usage hôm nay`
