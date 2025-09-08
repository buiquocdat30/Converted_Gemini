# 🧪 Translation Test Guide

Hướng dẫn test luồng dữ liệu từ Frontend → Backend → Frontend cho `translateRangePage` và `translateAllPages`.

## 📁 Files đã tạo

### Frontend Test
- **File**: `front_end/src/pages/TranslationTestPage.jsx`
- **Mô tả**: React component để test UI và luồng dữ liệu từ frontend
- **Tính năng**: 
  - Test translateRangePages service
  - Test translateAllPages service  
  - Test backend endpoints trực tiếp
  - Hiển thị kết quả chi tiết
  - Console logging đầy đủ

### Backend Test
- **File**: `back_end/scripts/testTranslationEndpoints.js`
- **Mô tả**: Node.js script để test backend endpoints trực tiếp
- **Tính năng**:
  - Test `/translate/range-pages` endpoint
  - Test `/translate/all-pages` endpoint
  - Test validation
  - Mock data và error handling

## 🚀 Cách sử dụng

### 1. Test Frontend (React Component)

#### Bước 1: Thêm route vào App
```javascript
// Trong App.jsx hoặc AppRoutes.jsx
import TranslationTestPage from './pages/TranslationTestPage';

// Thêm route
<Route path="/test-translation" element={<TranslationTestPage />} />
```

#### Bước 2: Truy cập trang test
```
http://localhost:3000/test-translation
```

#### Bước 3: Sử dụng UI test
1. **Configure Test Data**: Điều chỉnh page input, range input, force translate, max pages per batch
2. **Run Tests**: 
   - 🧪 Test Range Pages: Test translateRangePages service
   - 🧪 Test All Pages: Test translateAllPages service  
   - 🔗 Test Backend Direct: Test backend endpoints trực tiếp
3. **View Results**: Xem kết quả chi tiết trong UI và console

### 2. Test Backend (Node.js Script)

#### Bước 1: Cấu hình
```javascript
// Trong back_end/scripts/testTranslationEndpoints.js
const API_URL = 'http://localhost:5000/api'; // Thay đổi URL server
const TEST_TOKEN = 'your-actual-token'; // Thay đổi token thực tế
```

#### Bước 2: Chạy test
```bash
# Từ thư mục back_end
node scripts/testTranslationEndpoints.js
```

#### Bước 3: Xem kết quả
Script sẽ log chi tiết:
- 📤 Request data gửi lên backend
- 📥 Response data nhận từ backend
- 📊 Timing information
- ❌ Error handling
- ✅ Test summary

## 🔍 Test Cases

### Range Pages Test
- **Input**: `pageNumbers: [1, 2]` (trang 1 và 2)
- **Expected**: 20 chương được chia thành 2 trang, mỗi trang 10 chương
- **Validation**: Kiểm tra pageNumbers, chapters, model

### All Pages Test  
- **Input**: `chapters: 20 chapters`, `forceTranslate: false`
- **Expected**: Tất cả trang chưa dịch được phát hiện và xử lý
- **Validation**: Kiểm tra userKeys bắt buộc, model, chapters

### Validation Test
- **Missing pageNumbers**: Should return 400 error
- **Missing chapters**: Should return 400 error  
- **Missing model**: Should return 400 error
- **Missing userKeys for all-pages**: Should return 400 error

## 📊 Expected Results

### Successful Response Format
```json
{
  "success": true,
  "message": "Đã thêm X trang (Y chương) vào hàng đợi dịch thành công",
  "totalPages": 2,
  "successfulPages": 2,
  "totalJobs": 20,
  "pageResults": {
    "1": {
      "success": true,
      "jobCount": 10,
      "chaptersCount": 10,
      "startIndex": 0,
      "endIndex": 10
    },
    "2": {
      "success": true,
      "jobCount": 10,
      "chaptersCount": 10,
      "startIndex": 10,
      "endIndex": 20
    }
  },
  "timing": {
    "totalJobs": 20,
    "strategy": "Range Pages Translation",
    "concurrency": 3,
    "estimatedTotalTime": 200,
    "efficiency": "Tối ưu cho dịch nhiều trang"
  },
  "errors": []
}
```

## 🐛 Debugging

### Console Logs để theo dõi
- `🧪 [TEST]` - Logs từ test functions
- `📖 [RANGE-PAGE]` - Logs từ translateRangePage service
- `📖 [ALL-PAGES]` - Logs từ translateAllPages service
- `🚀 [RANGE-PAGES-API]` - Logs từ backend range-pages endpoint
- `🚀 [ALL-PAGES-API]` - Logs từ backend all-pages endpoint
- `📤 Request data` - Dữ liệu gửi lên backend
- `📥 Response data` - Dữ liệu nhận từ backend

### Common Issues
1. **CORS Error**: Đảm bảo backend có CORS config đúng
2. **Auth Error**: Kiểm tra token và auth middleware
3. **Timeout**: Tăng timeout trong test script
4. **Missing Dependencies**: Đảm bảo axios được install

## 🔧 Customization

### Thay đổi Mock Data
```javascript
// Trong TranslationTestPage.jsx
const mockChapters = [
  // Thêm/sửa chapters theo nhu cầu
];

const mockModel = {
  value: 'your-model',
  label: 'Your Model',
  // ...
};
```

### Thay đổi Test Parameters
```javascript
// Trong testTranslationEndpoints.js
const mockUserKeys = ['your-api-key'];
const mockStoryId = 'your-story-id';
const mockUserId = 'your-user-id';
```

## 📈 Performance Testing

### Load Testing
```javascript
// Test với nhiều trang
const pageNumbers = Array.from({length: 10}, (_, i) => i + 1);

// Test với nhiều chương
const manyChapters = Array.from({length: 100}, (_, i) => ({
  title: `Chương ${i + 1}`,
  content: `Nội dung chương ${i + 1}...`,
  chapterNumber: i + 1
}));
```

### Memory Testing
- Monitor memory usage khi test với large datasets
- Check queue performance với nhiều jobs
- Verify cleanup của completed jobs

## ✅ Checklist

- [ ] Backend server đang chạy
- [ ] Frontend server đang chạy  
- [ ] Database connection OK
- [ ] Redis connection OK
- [ ] Auth token hợp lệ
- [ ] API keys hợp lệ
- [ ] Model configuration đúng
- [ ] CORS settings đúng
- [ ] Console logs được enable
- [ ] Network connectivity OK

## 🆘 Troubleshooting

### Backend không response
1. Check server logs
2. Verify endpoint routes
3. Check middleware order
4. Verify request format

### Frontend không connect
1. Check API_URL config
2. Verify CORS settings
3. Check network tab
4. Verify auth token

### Queue không hoạt động
1. Check Redis connection
2. Verify BullMQ setup
3. Check worker processes
4. Monitor queue stats

---

**Lưu ý**: Đây là file test để development, không sử dụng trong production!
