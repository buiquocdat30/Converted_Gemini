# Test Logic Progress Translation Mới

## 🎯 Mục tiêu
Kiểm tra xem khi dịch 1 chương có áp dụng cách tính thời gian mới hay không.

## 📋 Các trường hợp cần test

### 1. Dịch 1 chương lần đầu (chưa có lịch sử)
**Kỳ vọng:**
- `estimatedDuration = 30s` (DEFAULT_STORY_TIME)
- Progress bar chạy từ 0% → 99% trong 30s
- Khi hoàn thành → 100%

**Log cần kiểm tra:**
```
[CHAPTER 0] ===== BẮT ĐẦU DỊCH 1 CHƯƠNG =====
[CHAPTER 0] 📊 estimatedDuration từ hook: 30
[CHAPTER 0] 📊 storyId: [storyId]
[PROGRESS] Chương 0: Ước tính 30.0s từ lịch sử dịch
[PROGRESS-FINAL] estimatedDuration: 30.0s
```

### 2. Dịch 1 chương sau khi đã có lịch sử
**Kỳ vọng:**
- `estimatedDuration = trung bình timeTranslation của 1-10 chương gần nhất`
- Progress bar chạy theo thời gian ước tính thực tế

**Log cần kiểm tra:**
```
[STORY-HISTORY] Truyện [storyId]: 3 chương đã dịch
[STORY-HISTORY] Truyện [storyId]: {
  totalChapters: 10,
  translatedChapters: 3,
  recentChapters: 3,
  averageTime: 25.3s,
  chapters: [
    { chapterNumber: 3, timeTranslation: 28.5s },
    { chapterNumber: 2, timeTranslation: 22.1s },
    { chapterNumber: 1, timeTranslation: 25.3s }
  ]
}
[CHAPTER 4] 📊 estimatedDuration từ hook: 25.3
```

### 3. Dịch 1 chương với lịch sử > 10 chương
**Kỳ vọng:**
- Chỉ lấy 10 chương gần nhất để tính trung bình
- Progress bar chạy theo thời gian ước tính

## 🔍 Cách kiểm tra

### Bước 1: Mở Developer Tools
- F12 → Console tab
- Clear console

### Bước 2: Dịch 1 chương
- Bấm nút "Dịch" trên chương đầu tiên
- Quan sát logs trong console

### Bước 3: Kiểm tra logs
Tìm các log sau:
1. `[CHAPTER X] ===== BẮT ĐẦU DỊCH 1 CHƯƠNG =====`
2. `[CHAPTER X] 📊 estimatedDuration từ hook: [số]`
3. `[PROGRESS] Chương X: Ước tính [số]s từ lịch sử dịch`
4. `[PROGRESS-ESTIMATE] Chương X: [thời gian]s/[ước tính]s = [%]%`

### Bước 4: Kiểm tra progress bar
- Progress bar phải chạy mượt mà từ 0% → 99%
- Không được giật nhảy
- Khi hoàn thành → 100%

## ✅ Kết quả mong đợi

### Nếu logic mới hoạt động đúng:
- ✅ `estimatedDuration` được log ra đúng giá trị
- ✅ Progress bar chạy theo thời gian ước tính
- ✅ Không có log về `averageTimePerWord` (cách cũ)
- ✅ Progress chạy mượt mà, không giật nhảy

### Nếu logic cũ vẫn còn:
- ❌ Có log về `averageTimePerWord`
- ❌ Progress bar giật nhảy
- ❌ Thời gian ước tính không chính xác

## 🚨 Vấn đề có thể gặp

### 1. estimatedDuration = undefined
**Nguyên nhân:** Hook chưa được khởi tạo đúng
**Giải pháp:** Kiểm tra `useTranslationProgress(storyId, 30)`

### 2. Progress bar không chạy
**Nguyên nhân:** `chapterHook.startProgress()` không được gọi
**Giải pháp:** Kiểm tra log `[PROGRESS-HOOK] 🚀 Bắt đầu progress`

### 3. Progress bar giật nhảy
**Nguyên nhân:** Có nhiều nguồn cập nhật progress
**Giải pháp:** Đảm bảo chỉ có hook cập nhật progress

## 📝 Ghi chú
- Logic mới: Sử dụng `estimatedDuration` từ lịch sử dịch
- Logic cũ: Sử dụng `averageTimePerWord × số từ`
- Progress bar chỉ chạy từ 0% → 99% theo ước tính
- Chỉ tăng lên 100% khi hoàn thành thực tế
