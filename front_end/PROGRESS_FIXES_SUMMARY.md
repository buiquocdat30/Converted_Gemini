# Progress Bar Fixes Summary

## 🔧 Các vấn đề đã sửa:

### 1. **Thanh tiến độ giật nhảy về trước/sau**

#### Nguyên nhân:
- Progress hook bị tạo lại mỗi lần gọi `getChapterProgressHook`
- Socket callbacks override progress từ progress hook
- Progress không được track đúng cách trong hook

#### Giải pháp:
- **Thêm biến `currentProgress`** trong progress hook để track progress hiện tại
- **Kiểm tra interval đang chạy** trước khi start lại progress hook
- **Chỉ cập nhật progress khi thực sự tăng** (Math.max)
- **Socket callbacks không override progress** nếu không tăng

### 2. **Thời gian ước tính mặc định**

#### Thay đổi:
- **Từ 10s → 30s** cho thời gian tối thiểu
- **Thêm biến `estimatedDuration: 30`** mặc định trong progress hook

## 📋 Chi tiết các sửa đổi:

### Progress Hook (`getChapterProgressHook`):

```javascript
// Thêm các biến track
currentProgress: 0, // Track progress hiện tại
startTime: null,
estimatedDuration: 30, // Mặc định 30s
interval: null,

// Kiểm tra interval đang chạy
if (chapterProgressHooks.current[index].interval) {
  console.log(`⚠️ Progress hook đã đang chạy, không start lại`);
  return;
}

// Thời gian tối thiểu 30s thay vì 10s
const finalEstimatedDuration = Math.max(estimatedDuration, 30);

// Chỉ cập nhật nếu progress thực sự tăng
if (newProgress > currentProgress) {
  chapterProgressHooks.current[index].currentProgress = newProgress;
  setChapterProgresses((prev) => { ... });
}
```

### Socket Progress Callback:

```javascript
// Chỉ cập nhật nếu progress từ socket cao hơn hiện tại
const currentProgress = prev[chapterIndex] || 0;
const newProgress = Math.max(currentProgress, data.progress);

if (newProgress > currentProgress) {
  // Cập nhật progress
} else {
  // Bỏ qua, không cập nhật
}
```

### Socket Started Callback:

```javascript
// Không reset progress về 0 để tránh giật nhảy
// Chỉ cập nhật trạng thái, progress được quản lý bởi hook
```

### Socket Translated Callback:

```javascript
// Chỉ cập nhật progress nếu chưa đạt 100%
const currentProgress = prev[chapterIndex] || 0;
if (currentProgress < 100) {
  // Cập nhật lên 100%
} else {
  // Bỏ qua, không cập nhật
}
```

## 🎯 Kết quả mong đợi:

1. **Thanh tiến độ chỉ tăng**, không bao giờ giảm
2. **Không giật nhảy** khi có socket events
3. **Thời gian ước tính tối thiểu 30s** cho progress mượt mà
4. **Progress hook và socket callbacks** hoạt động độc lập, không conflict

## 🔍 Cách test:

1. Bấm "Dịch ALL chương"
2. Quan sát thanh tiến độ:
   - Chỉ tăng từ 0% → 100%
   - Không giật nhảy về trước
   - Thời gian ước tính tối thiểu 30s
3. Kiểm tra console logs để verify:
   - `[PROGRESS-HOOK] 📈 Progress update chapter X: Y% → Z%`
   - `[ChapterList] 📊 Progress update từ socket: Y% → Z%`
   - `[ChapterList] 📊 Bỏ qua progress từ socket vì không tăng`

