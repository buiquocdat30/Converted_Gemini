# Giải thích Tương tác giữa useTranslationProgress và useTranslationSocket Hooks

## 📋 Tổng quan

Hệ thống có 2 hook chính để quản lý progress translation:

1. **`useTranslationProgress`** - Quản lý progress ước tính dựa trên lịch sử (ƯU TIÊN)
2. **`useTranslationSocket`** - Quản lý real-time events từ backend (HỖ TRỢ)

## 🔧 1. useTranslationProgress Hook

### Mục đích
- Tính toán thời gian dịch ước tính dựa trên lịch sử dịch của truyện
- Cung cấp progress bar ước tính (ƯU TIÊN CAO NHẤT)
- Progress chạy tự nhiên từ 0% → 99% theo thời gian ước tính

### Cách hoạt động

#### A. Tính toán thời gian trung bình (CÁCH MỚI)
```javascript
const calculateStoryTranslationTime = (storyId) => {
  // 1. Tìm truyện trong stories context
  const story = stories.find(s => s.id === storyId);
  
  // 2. Lọc các chương đã dịch có timeTranslation
  const translatedChapters = story.chapters.filter(chapter => 
    chapter.translation && 
    chapter.translation.timeTranslation > 0
  );
  
  // 3. Nếu chưa có chương nào dịch → dùng DEFAULT_STORY_TIME (30s)
  if (translatedChapters.length === 0) {
    return DEFAULT_STORY_TIME;
  }
  
  // 4. Sắp xếp theo chapterNumber (gần nhất trước)
  const sortedChapters = translatedChapters.sort((a, b) => b.chapterNumber - a.chapterNumber);
  
  // 5. Lấy tối đa 10 chương gần nhất
  const recentChapters = sortedChapters.slice(0, Math.min(MAX_HISTORY, 10));
  
  // 6. Tính trung bình timeTranslation
  const totalTime = recentChapters.reduce((sum, chapter) => {
    return sum + chapter.translation.timeTranslation;
  }, 0);
  
  const averageTime = totalTime / recentChapters.length;
  
  return averageTime;
};
```

#### B. Cập nhật estimatedDuration
```javascript
useEffect(() => {
  if (storyId) {
    const averageTime = calculateStoryTranslationTime(storyId);
    setEstimatedDuration(averageTime); // Lưu trực tiếp thời gian ước tính
  }
}, [stories, storyId]);
```

#### C. Progress ước tính (ƯU TIÊN)
```javascript
const startProgress = () => {
  // Sử dụng thời gian ước tính đã tính sẵn
  const expectedDuration = estimatedDuration || defaultTime;
  
  // Cập nhật progress mỗi 100ms
  intervalRef.current = setInterval(() => {
    const elapsedTime = (Date.now() - startTime.current) / 1000;
    const newProgress = Math.min((elapsedTime / expectedDuration) * 100, 99); // Tối đa 99%
    setProgress(newProgress);
  }, 100);
};
```

### Trả về
```javascript
return {
  progress,           // Progress hiện tại (0-99)
  isTranslating,      // Trạng thái đang dịch
  startProgress,      // Hàm bắt đầu progress (KHÔNG cần wordCount)
  stopProgress,       // Hàm dừng progress
  estimatedDuration,  // Thời gian ước tính (giây)
};
```

## 🔌 2. useTranslationSocket Hook

### Mục đích
- Kết nối Socket.io với backend
- Nhận real-time events từ BE: `chapterStarted`, `chapterProgress`, `chapterTranslated`
- Gọi callbacks tương ứng để cập nhật UI (KHÔNG ẢNH HƯỞNG PROGRESS)

### Cách hoạt động

#### A. Khởi tạo Socket
```javascript
useEffect(() => {
  socketRef.current = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000
  });
}, []);
```

#### B. Lắng nghe Events
```javascript
// 1. chapterStarted - Khi BE bắt đầu dịch chương
socketRef.current.on('chapterStarted', (data) => {
  if (startedCallbackRef.current) {
    startedCallbackRef.current(data);
  }
});

// 2. chapterProgress - Progress real-time từ BE (KHÔNG SỬ DỤNG)
socketRef.current.on('chapterProgress', (data) => {
  if (progressCallbackRef.current) {
    progressCallbackRef.current(data); // Chỉ cập nhật status, không cập nhật progress
  }
});

// 3. chapterTranslated - Khi BE hoàn thành dịch
socketRef.current.on('chapterTranslated', (data) => {
  if (callbackRef.current) {
    callbackRef.current(data);
  }
});
```

#### C. Join Room
```javascript
useEffect(() => {
  if (roomId && socketRef.current) {
    socketRef.current.emit('join', roomId);
  }
}, [roomId]);
```

### Trả về
```javascript
return socketRef.current; // Socket instance để component sử dụng
```

## 🔄 3. Tương tác giữa 2 Hooks trong ChapterList

### A. Khởi tạo Hooks
```javascript
// 1. Lấy estimatedDuration từ useTranslationProgress
const { estimatedDuration } = useTranslationProgress(storyId, 30);

// 2. Khởi tạo socket với callbacks
const socketRef = useTranslationSocket(
  roomId, 
  handleSocketChapterTranslated,    // Callback khi hoàn thành
  handleSocketChapterProgress,      // Callback khi có progress (chỉ cập nhật status)
  handleSocketChapterStarted        // Callback khi bắt đầu
);
```

### B. Luồng hoạt động (MỚI)

#### Bước 1: User bấm "Dịch ALL"
```javascript
// ChapterList gọi translateAll()
// → Gửi request đến BE
// → BE enqueue jobs vào queue
```

#### Bước 2: BE bắt đầu xử lý job
```javascript
// BE emit 'chapterStarted' event
// → useTranslationSocket nhận được
// → Gọi handleSocketChapterStarted callback
// → ChapterList cập nhật status = "PROCESSING"
// → Bắt đầu progress hook với estimatedDuration
// → Progress bar chạy từ 0% → 99% theo thời gian ước tính
```

#### Bước 3: BE xử lý và emit progress
```javascript
// BE emit 'chapterProgress' event
// → useTranslationSocket nhận được
// → Gọi handleSocketChapterProgress callback
// → ChapterList BỎ QUA progress từ BE
// → Progress hook tiếp tục chạy ước tính tự nhiên
// → Chỉ cập nhật status nếu cần
```

#### Bước 4: BE hoàn thành
```javascript
// BE emit 'chapterTranslated' event
// → useTranslationSocket nhận được
// → Gọi handleSocketChapterTranslated callback
// → ChapterList cập nhật results, status = "COMPLETE"
// → Tăng progress lên 100%
// → Dừng progress hook
```

### C. Xử lý Progress (MỚI)

#### Ưu tiên thời gian ước tính
```javascript
// Trong handleSocketChapterProgress
console.log(`[ChapterList] 🚫 Bỏ qua progress từ socket - ưu tiên thời gian ước tính`);

// KHÔNG cập nhật progress từ BE
// Chỉ cập nhật status nếu cần
```

#### Hoàn thành với 100%
```javascript
// Trong handleSocketChapterTranslated
setChapterProgresses((prev) => {
  const newProgresses = { ...prev, [chapterIndex]: 100 };
  console.log(`[ChapterList] ✅ Progress hoàn thành: ${prev[chapterIndex] || 0}% → 100%`);
  return newProgresses;
});
```

## 📊 4. Ưu điểm của Thiết kế MỚI

### A. useTranslationProgress (ƯU TIÊN)
- ✅ **Ước tính chính xác**: Dựa trên timeTranslation thực tế từ database
- ✅ **Fallback tốt**: Có DEFAULT_STORY_TIME (30s) khi chưa có dữ liệu
- ✅ **Tự học**: Cập nhật estimatedDuration sau mỗi lần dịch
- ✅ **Performance**: Không cần tính toán phức tạp theo từ
- ✅ **Smooth UX**: Progress chạy tự nhiên từ 0% → 99%

### B. useTranslationSocket (HỖ TRỢ)
- ✅ **Status updates**: Cập nhật trạng thái chính xác
- ✅ **Completion detection**: Phát hiện khi BE hoàn thành
- ✅ **Reliable**: Có reconnection, error handling
- ✅ **Room-based**: Chỉ nhận events cho user/story cụ thể

### C. Kết hợp
- ✅ **Predictable UX**: Progress luôn chạy theo thời gian ước tính
- ✅ **No jumping**: Không có giật nhảy do conflict
- ✅ **Accurate completion**: 100% khi thực sự hoàn thành
- ✅ **Robust**: Fallback mechanism khi socket fail

## 🚨 5. Lưu ý quan trọng

### A. Thời gian mặc định
- `DEFAULT_STORY_TIME = 30s` trong useTranslationProgress
- `defaultTime = 30` khi gọi useTranslationProgress(storyId, 30)
- **Không đặt mặc định trong ChapterList** - để hook tự quản lý

### B. Progress Management
- **Ưu tiên thời gian ước tính**: Progress hook chạy từ 0% → 99%
- **Bỏ qua socket progress**: Không cập nhật progress từ chapterProgress event
- **Hoàn thành với 100%**: Chỉ tăng lên 100% khi nhận chapterTranslated

### C. Cách tính thời gian mới
- **Trước**: `thời gian/từ × số từ × số chương` (phức tạp, không chính xác)
- **Sau**: `trung bình timeTranslation của 1-10 chương gần nhất` (đơn giản, chính xác)

### D. Memory Management
- useTranslationProgress: Tự động cleanup interval khi unmount
- useTranslationSocket: Tự động disconnect khi unmount
- ChapterList: Quản lý chapterProgressHooks.current để tránh memory leak

## 🔍 6. Debug Tips

### A. Kiểm tra useTranslationProgress
```javascript
console.log('[PROGRESS] estimatedDuration:', estimatedDuration);
console.log('[PROGRESS] Progress running:', progress); // 0-99
console.log('[PROGRESS] TimeTranslation history:', recentChapters);
```

### B. Kiểm tra useTranslationSocket
```javascript
console.log('[SOCKET] Connected:', socketRef.current?.connected);
console.log('[SOCKET] Room ID:', roomId);
console.log('[SOCKET] Progress ignored:', 'Ưu tiên thời gian ước tính');
```

### C. Kiểm tra Completion
```javascript
console.log('[COMPLETION] Progress before:', currentProgress);
console.log('[COMPLETION] Progress after:', 100);
console.log('[COMPLETION] Hook stopped:', true);
```
