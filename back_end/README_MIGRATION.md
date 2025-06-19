# Hướng dẫn Migration và Sử dụng Tính năng Mới

## 📋 Tổng quan

Dự án đã được cập nhật với các thuộc tính mới để cải thiện việc thống kê và theo dõi:

1. **`totalWord`** trong model `UserLibraryChapter` - Lưu số từ của mỗi chương
2. **`timeTranslation`** trong model `UserTranslatedChapter` - Lưu thời gian dịch của mỗi chương

## 🔧 Cài đặt và Migration

### 1. Cập nhật Database Schema

Schema đã được cập nhật với các thuộc tính mới. Chạy lệnh sau để cập nhật database:

```bash
cd back_end
npx prisma generate
npx prisma db push
```

### 2. Chạy Script Migration

Để cập nhật dữ liệu hiện có với các thuộc tính mới:

```bash
# Chạy tất cả các script migrate
node scripts/migrateTotalWord.js all

# Hoặc chạy từng script riêng lẻ
node scripts/migrateTotalWord.js totalWord
node scripts/migrateTotalWord.js timeTranslation
```

## 📊 Tính năng Mới

### 1. Đếm từ thông minh (`totalWord`)

- **Hỗ trợ đa ngôn ngữ**: Tiếng Việt, tiếng Anh, tiếng Hán
- **Tính toán tự động**: Khi tạo chương mới hoặc cập nhật nội dung
- **Thống kê chi tiết**: Số từ tiêu đề + số từ nội dung

#### Cách sử dụng:

```javascript
const { countWords, calculateChapterWordStats } = require('./utils/wordCounter');

// Đếm từ trong văn bản
const wordCount = countWords("Hello world 你好世界");
console.log(wordCount); // 4 (2 từ tiếng Anh + 2 ký tự Hán)

// Tính toán thống kê cho chương
const stats = calculateChapterWordStats("Chương 1", "Nội dung chương...");
console.log(stats); // { titleWords: 2, contentWords: 3, totalWords: 5 }
```

### 2. Theo dõi thời gian dịch (`timeTranslation`)

- **Đo thời gian thực**: Từ lúc bắt đầu đến khi hoàn thành dịch
- **Lưu trữ chính xác**: Thời gian tính bằng giây
- **Thống kê hiệu suất**: Giúp đánh giá tốc độ dịch

#### Cách sử dụng:

```javascript
// Backend tự động tính và lưu thời gian dịch
const translation = await userLibraryService.updateTranslation(
  storyId,
  chapterNumber,
  userId,
  {
    translatedTitle: "Tiêu đề đã dịch",
    translatedContent: "Nội dung đã dịch",
    timeTranslation: 15.5 // Thời gian dịch tính bằng giây
  }
);
```

## 🔄 Luồng dữ liệu đã cập nhật

### 1. Tạo chương mới

```javascript
// Khi tạo chương mới, totalWord được tính tự động
const newChapter = await userLibraryService.addChapter({
  storyId: "story_id",
  chapterNumber: 1,
  chapterName: "Chương 1: Khởi đầu",
  rawText: "Nội dung chương..."
});
// totalWord sẽ được tính và lưu tự động
```

### 2. Cập nhật nội dung chương

```javascript
// Khi cập nhật rawText, totalWord được tính lại
await userLibraryService.updateChapter(
  storyId,
  chapterNumber,
  userId,
  { rawText: "Nội dung mới..." }
);
// totalWord sẽ được cập nhật tự động
```

### 3. Dịch chương

```javascript
// Thời gian dịch được đo và lưu tự động
const translation = await userLibraryService.updateTranslation(
  storyId,
  chapterNumber,
  userId,
  {
    translatedTitle: "Tiêu đề đã dịch",
    translatedContent: "Nội dung đã dịch",
    timeTranslation: duration // Từ backend response
  }
);
```

## 📈 Thống kê và Báo cáo

### 1. Thống kê truyện

```javascript
// Lấy thống kê tổng hợp
const storyStats = await prisma.userLibraryStory.findFirst({
  where: { id: storyId },
  include: {
    chapters: {
      select: {
        totalWord: true,
        translation: {
          select: {
            timeTranslation: true
          }
        }
      }
    }
  }
});

// Tính tổng số từ
const totalWords = storyStats.chapters.reduce((sum, ch) => sum + ch.totalWord, 0);

// Tính thời gian dịch trung bình
const translatedChapters = storyStats.chapters.filter(ch => ch.translation);
const avgTranslationTime = translatedChapters.length > 0 
  ? translatedChapters.reduce((sum, ch) => sum + ch.translation.timeTranslation, 0) / translatedChapters.length
  : 0;
```

### 2. Thống kê hiệu suất

```javascript
// Thống kê thời gian dịch theo từng chương
const translationStats = await prisma.userTranslatedChapter.findMany({
  where: { chapterId: { in: chapterIds } },
  select: {
    timeTranslation: true,
    chapter: {
      select: {
        totalWord: true,
        chapterName: true
      }
    }
  }
});

// Tính tốc độ dịch (từ/phút)
const translationSpeed = translationStats.map(stat => ({
  chapterName: stat.chapter.chapterName,
  wordsPerMinute: (stat.chapter.totalWord / stat.timeTranslation) * 60
}));
```

## 🚀 API Endpoints đã cập nhật

### 1. Tạo chương mới
```http
POST /user/library/:storyId/chapters
Content-Type: application/json

{
  "chapterNumber": 1,
  "chapterName": "Chương 1",
  "rawText": "Nội dung chương..."
}
```
**Response**: Chương được tạo với `totalWord` đã tính toán

### 2. Cập nhật bản dịch
```http
PUT /user/library/:storyId/chapters/:chapterNumber/translation
Content-Type: application/json

{
  "translatedTitle": "Tiêu đề đã dịch",
  "translatedContent": "Nội dung đã dịch",
  "timeTranslation": 15.5
}
```
**Response**: Bản dịch được cập nhật với `timeTranslation`

## 🔍 Kiểm tra và Debug

### 1. Kiểm tra dữ liệu

```javascript
// Kiểm tra chương có totalWord
const chapter = await prisma.userLibraryChapter.findFirst({
  where: { id: chapterId },
  select: {
    chapterName: true,
    totalWord: true,
    translation: {
      select: {
        timeTranslation: true
      }
    }
  }
});

console.log(`Chương: ${chapter.chapterName}`);
console.log(`Số từ: ${chapter.totalWord}`);
console.log(`Thời gian dịch: ${chapter.translation?.timeTranslation || 0}s`);
```

### 2. Debug migration

```bash
# Chạy migration với log chi tiết
DEBUG=prisma:* node scripts/migrateTotalWord.js all
```

## 📝 Lưu ý quan trọng

1. **Backward compatibility**: Các thuộc tính mới có giá trị mặc định, không ảnh hưởng đến dữ liệu cũ
2. **Performance**: Việc tính toán `totalWord` được thực hiện khi cần thiết, không ảnh hưởng đến hiệu suất
3. **Accuracy**: Thời gian dịch được đo chính xác từ backend, không phụ thuộc vào frontend
4. **Migration**: Script migration an toàn, có thể chạy nhiều lần mà không ảnh hưởng dữ liệu

## 🆘 Troubleshooting

### Lỗi thường gặp:

1. **Schema không cập nhật**: Chạy lại `npx prisma generate` và `npx prisma db push`
2. **Migration thất bại**: Kiểm tra kết nối database và quyền truy cập
3. **Tính toán sai**: Kiểm tra hàm `countWords` trong `utils/wordCounter.js`

### Hỗ trợ:

- Kiểm tra logs trong console
- Xem file `scripts/migrateTotalWord.js` để hiểu chi tiết
- Liên hệ team phát triển nếu cần hỗ trợ thêm 