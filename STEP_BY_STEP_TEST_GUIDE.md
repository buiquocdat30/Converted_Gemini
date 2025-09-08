# 🧪 HƯỚNG DẪN TEST TỪNG BƯỚC - FRONTEND & BACKEND

## 📋 CHUẨN BỊ

### Bước 1: Kiểm tra môi trường
```bash
# Kiểm tra Node.js version
node --version  # Cần >= 14.0.0

# Kiểm tra npm version  
npm --version

# Kiểm tra Redis (cho backend)
redis-cli ping  # Nên trả về PONG
```

### Bước 2: Cài đặt dependencies
```bash
# Frontend
cd front_end
npm install

# Backend  
cd back_end
npm install
```

## 🚀 TEST BACKEND TRƯỚC

### Bước 1: Khởi động Backend Server
```bash
cd back_end

# Khởi động server
npm start
# hoặc
node index.js

# Kiểm tra server đang chạy
curl http://localhost:5000/api/health
# Nên trả về response OK
```

### Bước 2: Cấu hình Test Script
```bash
# Mở file back_end/scripts/testTranslationEndpoints.js
# Cập nhật các thông số sau:

const API_URL = 'http://localhost:5000/api';  // URL backend
const TEST_TOKEN = 'your-actual-token';       // Token thực tế từ login
```

### Bước 3: Chạy Backend Test
```bash
cd back_end
node scripts/testTranslationEndpoints.js
```

**Kết quả mong đợi:**
```
🚀 [BACKEND-TEST] ===== STARTING BACKEND TESTS =====
🌐 [BACKEND-TEST] API URL: http://localhost:5000/api
🔑 [BACKEND-TEST] Using token: test-token...

📋 [BACKEND-TEST] Running validation tests...
✅ [BACKEND-TEST] Validation test "Missing pageNumbers" correctly returned 400 error
✅ [BACKEND-TEST] Validation test "Missing chapters" correctly returned 400 error
✅ [BACKEND-TEST] Validation test "Missing model" correctly returned 400 error
✅ [BACKEND-TEST] Validation test "Missing userKeys for all-pages" correctly returned 400 error

📄 [BACKEND-TEST] Running range-pages endpoint test...
📤 [BACKEND-TEST] Request data: { pageNumbers: [1, 2], chaptersCount: 20, ... }
📥 [BACKEND-TEST] Response status: 200
📥 [BACKEND-TEST] Response data: { success: true, totalPages: 2, ... }
✅ [BACKEND-TEST] Range-pages endpoint test completed successfully

📚 [BACKEND-TEST] Running all-pages endpoint test...
📤 [BACKEND-TEST] Request data: { chaptersCount: 20, ... }
📥 [BACKEND-TEST] Response status: 200
📥 [BACKEND-TEST] Response data: { success: true, totalPages: 2, ... }
✅ [BACKEND-TEST] All-pages endpoint test completed successfully

🎉 [BACKEND-TEST] ===== ALL TESTS COMPLETED SUCCESSFULLY =====
```

### Bước 4: Kiểm tra Queue Jobs
```bash
# Kiểm tra Redis queue
redis-cli
> KEYS "*queue*"
> LLEN bull:translate-chapter:waiting
> LLEN bull:translate-chapter:active
> LLEN bull:translate-chapter:completed
```

## 🎨 TEST FRONTEND

### Bước 1: Thêm Route vào App
```bash
# Mở file front_end/src/App.jsx hoặc front_end/src/routes/AppRoutes.jsx
# Thêm import và route:

import TranslationTestPage from './pages/TranslationTestPage';

// Trong phần routes, thêm:
<Route path="/test-translation" element={<TranslationTestPage />} />
```

### Bước 2: Khởi động Frontend
```bash
cd front_end
npm start

# Frontend sẽ chạy tại http://localhost:3000
```

### Bước 3: Truy cập Test Page
```bash
# Mở browser và truy cập:
http://localhost:3000/test-translation
```

### Bước 4: Cấu hình Test Data
Trong UI test page:

1. **Page Input**: Nhập `12,16,18` (test trang cụ thể)
2. **Range Input**: Nhập `14-19` (test dải trang)  
3. **Force Translate**: Check/uncheck tùy ý
4. **Max Pages Per Batch**: Đặt `5`

### Bước 5: Chạy Frontend Tests

#### Test 1: Range Pages Service
```bash
# Click button "🧪 Test Range Pages"
# Mở Developer Tools (F12) → Console tab
# Theo dõi logs:

🧪 [TEST] Bắt đầu test translateRangePages
🧪 [TEST] Parsed page numbers: [12, 16, 18]
📖 [RANGE-PAGE] ===== BẮT ĐẦU DỊCH CÁC TRANG =====
📖 [RANGE-PAGE] 📝 Dịch các trang: [12, 16, 18]
📤 [RANGE-PAGE] Gửi model object lên backend: {value: "gpt-3.5-turbo", ...}
🌐 [RANGE-PAGE] Gửi request đến backend...
📥 [RANGE-PAGE] Response từ Range Pages API: {success: true, ...}
✅ [RANGE-PAGE] Đã thêm 3 trang (30 chương) vào queue thành công
```

#### Test 2: All Pages Service
```bash
# Click button "🧪 Test All Pages"  
# Theo dõi logs:

🧪 [TEST] Bắt đầu test translateAllPages
📖 [ALL-PAGES] ===== BẮT ĐẦU DỊCH TẤT CẢ CÁC TRANG =====
📊 [ALL-PAGES] Phân tích trang: {totalPages: 2, pagesNeedingTranslation: 2, ...}
📤 [ALL-PAGES] Gửi model object lên backend: {value: "gpt-3.5-turbo", ...}
🌐 [ALL-PAGES] Gửi request đến backend...
📥 [ALL-PAGES] Response từ All Pages API: {success: true, ...}
✅ [ALL-PAGES] Đã thêm 2 trang (20 chương) vào queue thành công
```

#### Test 3: Backend Direct
```bash
# Click button "🔗 Test Backend Direct"
# Test trực tiếp backend endpoints

🧪 [TEST] Bắt đầu test backend endpoints trực tiếp
🧪 [TEST] Testing /translate/range-pages endpoint
📥 [TEST] Range pages endpoint response: {success: true, ...}
🧪 [TEST] Testing /translate/all-pages endpoint  
📥 [TEST] All pages endpoint response: {success: true, ...}
✅ [TEST] Test backend endpoints thành công!
```

## 🔍 KIỂM TRA KẾT QUẢ

### Bước 1: Kiểm tra UI Results
Trong test page, bạn sẽ thấy:

**Range Pages Test Results:**
- ✅ Status: Success
- 📄 Total Pages: 3
- ✅ Successful Pages: 3  
- 📊 Total Jobs: 30
- ⏱️ Timing: {...}

**All Pages Test Results:**
- ✅ Status: Success
- 📚 Total Pages: 2
- ✅ Successful Pages: 2
- 📊 Total Jobs: 20
- 📊 Page Analysis: {...}

### Bước 2: Kiểm tra Console Logs
Mở Developer Tools → Console, tìm các logs:

```
🧪 [TEST] - Test functions
📖 [RANGE-PAGE] - Range page service  
📖 [ALL-PAGES] - All pages service
📤 Request data - Data sent to backend
📥 Response data - Data received from backend
```

### Bước 3: Kiểm tra Network Tab
Developer Tools → Network tab:
- Tìm requests đến `/translate/range-pages`
- Tìm requests đến `/translate/all-pages`
- Kiểm tra request/response data

### Bước 4: Kiểm tra Backend Logs
Trong terminal backend:
```
🚀 [RANGE-PAGES-API] ===== BẮT ĐẦU DỊCH CÁC TRANG =====
📋 [RANGE-PAGES-API] Thông tin request: {pageNumbers: [12, 16, 18], ...}
🔑 [RANGE-PAGES-API] Tìm key khả dụng...
✅ [RANGE-PAGES-API] Đã tìm thấy key: test-api-...
📄 [RANGE-PAGES-API] Xử lý trang 12 (1/3)
📚 [RANGE-PAGES-API] Trang 12 có 10 chương (từ chương 121 đến 130)
✅ [RANGE-PAGES-API] Đã thêm 10 jobs của trang 12 vào queue
```

## 🐛 TROUBLESHOOTING

### Lỗi thường gặp:

#### 1. CORS Error
```
Access to fetch at 'http://localhost:5000/api/translate/range-pages' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Giải pháp:**
```javascript
// Trong back_end/index.js, thêm:
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

#### 2. Auth Error
```
401 Unauthorized
```

**Giải pháp:**
```javascript
// Kiểm tra token trong localStorage
localStorage.getItem("auth-token")

// Hoặc cập nhật TEST_TOKEN trong script
const TEST_TOKEN = 'your-real-token';
```

#### 3. Network Error
```
Network Error
```

**Giải pháp:**
```bash
# Kiểm tra backend đang chạy
curl http://localhost:5000/api/health

# Kiểm tra port không bị conflict
netstat -an | grep 5000
```

#### 4. Validation Error
```
400 Bad Request - Missing pageNumbers
```

**Giải pháp:**
- Kiểm tra request data format
- Đảm bảo tất cả required fields được gửi
- Kiểm tra data types

## 📊 VERIFY KẾT QUẢ

### Bước 1: Kiểm tra Queue
```bash
redis-cli
> KEYS "*translate*"
> LLEN bull:translate-chapter:waiting
> LLEN bull:translate-chapter:active  
> LLEN bull:translate-chapter:completed
> LLEN bull:translate-chapter:failed
```

### Bước 2: Kiểm tra Database
```sql
-- Kiểm tra usage records
SELECT * FROM usage WHERE storyId = 'test-story-123';

-- Kiểm tra user API keys
SELECT * FROM userApiKey WHERE userId = 'test-user-456';
```

### Bước 3: Monitor Real-time
```bash
# Backend logs
tail -f back_end/logs/app.log

# Redis monitor
redis-cli monitor
```

## ✅ CHECKLIST HOÀN THÀNH

- [ ] Backend server chạy OK
- [ ] Frontend server chạy OK
- [ ] Database connection OK
- [ ] Redis connection OK
- [ ] Auth token hợp lệ
- [ ] API keys hợp lệ
- [ ] CORS settings đúng
- [ ] Test script chạy thành công
- [ ] Frontend test page hoạt động
- [ ] Console logs hiển thị đầy đủ
- [ ] Network requests thành công
- [ ] Queue jobs được tạo
- [ ] Response format đúng
- [ ] Error handling hoạt động

## 🎯 KẾT QUẢ MONG ĐỢI

### Backend Test:
- ✅ Validation tests: 4/4 passed
- ✅ Range-pages endpoint: 200 OK
- ✅ All-pages endpoint: 200 OK
- ✅ Jobs được thêm vào queue

### Frontend Test:
- ✅ Range Pages Service: Success
- ✅ All Pages Service: Success  
- ✅ Backend Direct Test: Success
- ✅ UI hiển thị kết quả đúng
- ✅ Console logs đầy đủ

### End-to-End Flow:
```
Frontend Input → Service Function → HTTP Request → 
Backend Endpoint → Queue Jobs → Response → 
Frontend Display → Console Logs
```

---

**Lưu ý**: Nếu có lỗi, hãy kiểm tra từng bước một cách có hệ thống và đảm bảo tất cả dependencies đã được cài đặt đúng!
