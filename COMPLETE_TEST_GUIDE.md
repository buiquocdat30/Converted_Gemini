# 🧪 HƯỚNG DẪN TEST HOÀN CHỈNH - FRONTEND & BACKEND

## 📁 FILES ĐÃ TẠO

### Test Files
- `front_end/src/pages/TranslationTestPage.jsx` - React component test UI
- `back_end/scripts/testTranslationEndpoints.js` - Backend test script
- `back_end/scripts/checkEnvironment.js` - Environment check script
- `back_end/scripts/runAllTests.js` - Auto run all tests script

### Documentation
- `STEP_BY_STEP_TEST_GUIDE.md` - Hướng dẫn từng bước
- `TRANSLATION_TEST_GUIDE.md` - Hướng dẫn chi tiết

## 🚀 CÁCH TEST NHANH NHẤT

### Option 1: Auto Test (Khuyến nghị)
```bash
# 1. Khởi động servers
cd back_end && npm start &
cd front_end && npm start &

# 2. Chạy auto test
cd back_end
node scripts/runAllTests.js
```

### Option 2: Manual Test
```bash
# 1. Kiểm tra môi trường
cd back_end
node scripts/checkEnvironment.js

# 2. Test backend
node scripts/testTranslationEndpoints.js

# 3. Test frontend
# Mở browser: http://localhost:3000/test-translation
```

## 📋 CHUẨN BỊ CHI TIẾT

### Bước 1: Cài đặt Dependencies
```bash
# Frontend
cd front_end
npm install

# Backend
cd back_end  
npm install
```

### Bước 2: Cấu hình Environment
```bash
# Kiểm tra Redis
redis-cli ping  # Nên trả về PONG

# Kiểm tra Database
# Đảm bảo database đang chạy và có thể kết nối
```

### Bước 3: Cấu hình Test Scripts
```bash
# Mở file back_end/scripts/testTranslationEndpoints.js
# Cập nhật:
const API_URL = 'http://localhost:5000/api';  # URL backend
const TEST_TOKEN = 'your-actual-token';       # Token thực tế

# Mở file back_end/scripts/runAllTests.js  
# Cập nhật:
const TEST_TOKEN = 'your-actual-token';       # Token thực tế
```

## 🔍 TEST BACKEND

### Bước 1: Khởi động Backend
```bash
cd back_end
npm start

# Kiểm tra server
curl http://localhost:5000/api/health
```

### Bước 2: Chạy Backend Tests
```bash
cd back_end
node scripts/testTranslationEndpoints.js
```

**Kết quả mong đợi:**
```
🚀 [BACKEND-TEST] ===== STARTING BACKEND TESTS =====
📋 [BACKEND-TEST] Running validation tests...
✅ [BACKEND-TEST] Validation test "Missing pageNumbers" correctly returned 400 error
📄 [BACKEND-TEST] Running range-pages endpoint test...
✅ [BACKEND-TEST] Range-pages endpoint test completed successfully
📚 [BACKEND-TEST] Running all-pages endpoint test...
✅ [BACKEND-TEST] All-pages endpoint test completed successfully
🎉 [BACKEND-TEST] ===== ALL TESTS COMPLETED SUCCESSFULLY =====
```

### Bước 3: Kiểm tra Queue
```bash
redis-cli
> KEYS "*translate*"
> LLEN bull:translate-chapter:waiting
> LLEN bull:translate-chapter:active
```

## 🎨 TEST FRONTEND

### Bước 1: Thêm Route
```bash
# Mở file front_end/src/App.jsx hoặc AppRoutes.jsx
# Thêm:
import TranslationTestPage from './pages/TranslationTestPage';

# Trong routes:
<Route path="/test-translation" element={<TranslationTestPage />} />
```

### Bước 2: Khởi động Frontend
```bash
cd front_end
npm start

# Frontend chạy tại http://localhost:3000
```

### Bước 3: Truy cập Test Page
```bash
# Mở browser
http://localhost:3000/test-translation
```

### Bước 4: Chạy Tests trong UI

#### Test 1: Range Pages Service
1. **Configure**: Page Input = `12,16,18`
2. **Click**: "🧪 Test Range Pages"
3. **Check**: Console logs và UI results

#### Test 2: All Pages Service  
1. **Configure**: Force Translate = false, Max Pages = 5
2. **Click**: "🧪 Test All Pages"
3. **Check**: Console logs và UI results

#### Test 3: Backend Direct
1. **Click**: "🔗 Test Backend Direct"
2. **Check**: Console logs và UI results

## 🔍 KIỂM TRA KẾT QUẢ

### Console Logs (F12 → Console)
```
🧪 [TEST] Bắt đầu test translateRangePages
📖 [RANGE-PAGE] ===== BẮT ĐẦU DỊCH CÁC TRANG =====
📤 [RANGE-PAGE] Gửi model object lên backend
🌐 [RANGE-PAGE] Gửi request đến backend...
📥 [RANGE-PAGE] Response từ Range Pages API
✅ [RANGE-PAGE] Đã thêm 3 trang (30 chương) vào queue thành công
```

### Network Tab (F12 → Network)
- Tìm requests đến `/translate/range-pages`
- Tìm requests đến `/translate/all-pages`
- Kiểm tra request/response data

### Backend Logs (Terminal)
```
🚀 [RANGE-PAGES-API] ===== BẮT ĐẦU DỊCH CÁC TRANG =====
📋 [RANGE-PAGES-API] Thông tin request: {pageNumbers: [12, 16, 18], ...}
🔑 [RANGE-PAGES-API] Tìm key khả dụng...
✅ [RANGE-PAGES-API] Đã tìm thấy key: test-api-...
📄 [RANGE-PAGES-API] Xử lý trang 12 (1/3)
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
// Trong back_end/index.js
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

#### 2. Auth Error (401)
```
401 Unauthorized
```
**Giải pháp:**
```bash
# Kiểm tra token
localStorage.getItem("auth-token")

# Hoặc cập nhật TEST_TOKEN trong scripts
```

#### 3. Network Error
```
Network Error
```
**Giải pháp:**
```bash
# Kiểm tra backend
curl http://localhost:5000/api/health

# Kiểm tra port
netstat -an | grep 5000
```

#### 4. Redis Connection Error
```
Redis connection failed
```
**Giải pháp:**
```bash
# Khởi động Redis
redis-server

# Kiểm tra connection
redis-cli ping
```

## 📊 EXPECTED RESULTS

### Successful Response Format
```json
{
  "success": true,
  "message": "Đã thêm 3 trang (30 chương) vào hàng đợi dịch thành công",
  "totalPages": 3,
  "successfulPages": 3,
  "totalJobs": 30,
  "pageResults": {
    "12": {
      "success": true,
      "jobCount": 10,
      "chaptersCount": 10,
      "startIndex": 110,
      "endIndex": 120
    },
    "16": {
      "success": true,
      "jobCount": 10,
      "chaptersCount": 10,
      "startIndex": 150,
      "endIndex": 160
    },
    "18": {
      "success": true,
      "jobCount": 10,
      "chaptersCount": 10,
      "startIndex": 170,
      "endIndex": 180
    }
  },
  "timing": {
    "totalJobs": 30,
    "strategy": "Range Pages Translation",
    "concurrency": 3,
    "estimatedTotalTime": 300,
    "efficiency": "Tối ưu cho dịch nhiều trang"
  },
  "errors": []
}
```

## ✅ CHECKLIST HOÀN THÀNH

### Environment
- [ ] Node.js >= 14.0.0
- [ ] npm installed
- [ ] Redis running
- [ ] Database connected
- [ ] Backend server running (port 5000)
- [ ] Frontend server running (port 3000)

### Dependencies
- [ ] Frontend dependencies installed
- [ ] Backend dependencies installed
- [ ] Test files exist
- [ ] Routes configured

### Authentication
- [ ] Auth token valid
- [ ] API keys configured
- [ ] User permissions OK

### Tests
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Integration tests pass
- [ ] Performance tests pass
- [ ] Console logs complete
- [ ] Network requests successful
- [ ] Queue jobs created
- [ ] Response format correct

## 🎯 QUICK COMMANDS

### Start Everything
```bash
# Terminal 1: Backend
cd back_end && npm start

# Terminal 2: Frontend  
cd front_end && npm start

# Terminal 3: Tests
cd back_end && node scripts/runAllTests.js
```

### Check Status
```bash
# Check servers
curl http://localhost:5000/api/health
curl http://localhost:3000

# Check Redis
redis-cli ping

# Check queue
redis-cli
> LLEN bull:translate-chapter:waiting
```

### Debug
```bash
# Backend logs
tail -f back_end/logs/app.log

# Redis monitor
redis-cli monitor

# Network check
netstat -an | grep -E "(3000|5000|6379)"
```

## 🆘 EMERGENCY FIXES

### Reset Everything
```bash
# Stop all processes
pkill -f "node.*start"
pkill -f "npm.*start"

# Clear Redis
redis-cli FLUSHALL

# Restart
cd back_end && npm start &
cd front_end && npm start &
```

### Quick Test
```bash
# Minimal test
cd back_end
node -e "
const axios = require('axios');
axios.post('http://localhost:5000/api/translate/range-pages', {
  pageNumbers: [1],
  chapters: [{title: 'Test', content: 'Test', chapterNumber: 1}],
  userKeys: ['test'],
  model: {value: 'gpt-3.5-turbo'},
  storyId: 'test',
  userId: 'test'
}).then(r => console.log('✅ OK:', r.data.success)).catch(e => console.log('❌ Error:', e.message));
"
```

---

**Lưu ý**: Đây là hệ thống test để development. Không sử dụng trong production!
