# Debug Logs Summary - ChapterList.jsx

## 1. Socket Callback Debug Logs

### Socket Hook Initialization
- `[ChapterList] 🔌 ===== KHỞI TẠO SOCKET HOOK =====`
- `[ChapterList] 📊 Thông tin socket:` - Log userId, storyId, roomId
- `[ChapterList] 🔍 Callbacks được truyền vào socket hook:` - Log callback functions
- `[ChapterList] 🔌 Socket hook đã được khởi tạo:` - Log socket connection status

### Socket Callback Functions
- `🎯 [ChapterList] ===== CALLBACK ĐƯỢC GỌI =====` - Khi nhận chapterTranslated
- `📊 [ChapterList] ===== PROGRESS CALLBACK ĐƯỢC GỌI =====` - Khi nhận chapterProgress  
- `🚀 [ChapterList] ===== STARTED CALLBACK ĐƯỢC GỌI =====` - Khi nhận chapterStarted

### Callback Data Processing
- `[ChapterList] 📥 Data nhận được trong callback:` - Log data từ socket
- `[ChapterList] 🔍 Kiểm tra callback có tồn tại:` - Verify callback function
- `[ChapterList] 🔍 Callback function type:` - Log function type
- `[ChapterList] 🔍 Callback function name:` - Log function name

## 2. Progress Hook Debug Logs

### Progress Hook Management
- `[PROGRESS-HOOK] 🔍 Lấy progress hook cho chapter index: ${index}`
- `[PROGRESS-HOOK] 📊 Progress hooks hiện tại:` - Log existing hooks
- `[PROGRESS-HOOK] 🆕 Tạo mới progress hook cho chapter index: ${index}`

### Progress Hook Operations
- `[PROGRESS-HOOK] 🚀 Bắt đầu progress cho chapter ${index}:` - Log start parameters
- `[PROGRESS-HOOK] 📊 Cập nhật translating states:` - Log state updates
- `[PROGRESS-HOOK] 📊 Cập nhật progresses:` - Log progress updates
- `[PROGRESS-HOOK] 📈 Progress update chapter ${index}:` - Log progress changes
- `[PROGRESS-HOOK] ✅ Đã bắt đầu progress hook cho chapter ${index}`

### Progress Hook Stop
- `[PROGRESS-HOOK] 🛑 Dừng progress cho chapter ${index}`
- `[PROGRESS-HOOK] 📊 Cập nhật translating states khi dừng:`
- `[PROGRESS-HOOK] 📊 Cập nhật progresses khi dừng:`
- `[PROGRESS-HOOK] 🧹 Đã clear interval cho chapter ${index}`
- `[PROGRESS-HOOK] ✅ Đã dừng progress hook cho chapter ${index}`

## 3. State Updates Debug Logs

### Chapter Progress Handlers
- `[ChapterList] 🚀 handleChapterStartProgress được gọi cho chapter index: ${index}`
- `[ChapterList] 📊 Trạng thái chapter ${index} trước khi start:`
- `[ChapterList] 🔍 Chapter hook nhận được:`
- `[ChapterList] ✅ Đã gọi startProgress cho chapter ${index}`

- `[ChapterList] 🛑 handleChapterStopProgress được gọi cho chapter index: ${index}`
- `[ChapterList] 📊 Trạng thái chapter ${index} trước khi stop:`
- `[ChapterList] ✅ Đã gọi stopProgress cho chapter ${index}`

### State Update Tracking
- `[ChapterList] 📊 Results mới:` - Log results state changes
- `[ChapterList] 📊 Chapter status mới:` - Log status state changes
- `[ChapterList] 📊 Chapter translating states mới:` - Log translating states
- `[ChapterList] 📊 Chapter progresses mới:` - Log progress state changes
- `[ChapterList] 📈 Tăng translated count:` - Log translated count changes

## 4. Component Render Debug Logs

### Main Render
- `[RENDER] 🎨 Render chapter ${calculatedChapterNumber} (index: ${idx}):` - Log render data

### Progress Bar Component
- `[PROGRESS-BAR] 🎨 Render progress bar với progress: ${progress}%`

### Chapter Item Component
- `[ChapterItem] 🎨 Render ChapterItem ${calculatedChapterNumber}:` - Log item render data

## 5. How to Use These Logs

### To Debug Socket Issues:
1. Look for `[ChapterList] 🔌 ===== KHỞI TẠO SOCKET HOOK =====`
2. Check if callbacks are properly passed: `[ChapterList] 🔍 Callbacks được truyền vào socket hook:`
3. Monitor socket events: `🎯 [ChapterList] ===== CALLBACK ĐƯỢC GỌI =====`

### To Debug Progress Hook Issues:
1. Look for `[PROGRESS-HOOK] 🔍 Lấy progress hook cho chapter index:`
2. Check if hook is created: `[PROGRESS-HOOK] 🆕 Tạo mới progress hook`
3. Monitor progress updates: `[PROGRESS-HOOK] 📈 Progress update chapter`

### To Debug State Update Issues:
1. Look for `[ChapterList] 🚀 handleChapterStartProgress được gọi`
2. Check state before/after: `[ChapterList] 📊 Trạng thái chapter ${index} trước khi start:`
3. Monitor state changes: `[ChapterList] 📊 Chapter status mới:`

### To Debug Render Issues:
1. Look for `[RENDER] 🎨 Render chapter`
2. Check component props: `[ChapterItem] 🎨 Render ChapterItem`
3. Monitor progress bar renders: `[PROGRESS-BAR] 🎨 Render progress bar`

## 6. Expected Flow

### Normal Translation Flow:
1. `[ChapterList] 🔌 ===== KHỞI TẠO SOCKET HOOK =====`
2. `[ChapterList] 🚀 handleChapterStartProgress được gọi`
3. `[PROGRESS-HOOK] 🚀 Bắt đầu progress cho chapter`
4. `[PROGRESS-BAR] 🎨 Render progress bar với progress: 0%`
5. `🚀 [ChapterList] ===== STARTED CALLBACK ĐƯỢC GỌI =====` (from socket)
6. `[PROGRESS-HOOK] 📈 Progress update chapter X: 0% → Y%`
7. `[PROGRESS-BAR] 🎨 Render progress bar với progress: Y%`
8. `🎯 [ChapterList] ===== CALLBACK ĐƯỢC GỌI =====` (from socket)
9. `[PROGRESS-HOOK] 🛑 Dừng progress cho chapter`
10. `[PROGRESS-BAR] 🎨 Render progress bar với progress: 100%`

### If Issues Occur:
- **Socket not connecting**: Check `[FE-SOCKET] ❌ Đã ngắt kết nối`
- **Callbacks not called**: Check `[FE-SOCKET] ⚠️ Không có callback để xử lý`
- **Progress not updating**: Check `[PROGRESS-HOOK] 📈 Progress update chapter`
- **State not changing**: Check `[ChapterList] 📊 Chapter status mới:`
- **Component not re-rendering**: Check `[RENDER] 🎨 Render chapter`
