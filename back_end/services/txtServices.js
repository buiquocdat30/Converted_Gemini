const fs = require("fs");

// Giới hạn kích thước file (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Regex đa ngôn ngữ tìm tiêu đề chương
// Đã điều chỉnh để bắt số chương chính xác hơn
// Lưu ý: Biểu thức này ưu tiên bắt số ngay sau từ khóa hoặc trong cấu trúc "第X章"
const chapterRegex =
  /^\s*(?:(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*(\d+)[^\n]*|第([一二三四五六七八九十百千零〇\d]+)章[^\n]*)/gim;

// Hàm chuyển đổi số Hán tự sang số Ả Rập
const convertChineseNumber = (chineseNum) => {
  const chineseNumbers = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    百: 100,
    千: 1000,
  };

  let result = 0;
  let currentNum = 0; // Để lưu giá trị số hiện tại trước khi nhân với đơn vị
  let lastUnit = 1; // Để theo dõi đơn vị (10, 100, 1000)

  // Xử lý trường hợp số chỉ có một chữ số Hán tự
  if (chineseNum.length === 1 && chineseNumbers[chineseNum]) {
    return chineseNumbers[chineseNum];
  }

  for (let i = 0; i < chineseNum.length; i++) {
    const char = chineseNum[i];
    const value = chineseNumbers[char];

    if (value >= 1 && value <= 9) {
      // Là chữ số (1-9)
      currentNum = value;
    } else if (value >= 10) {
      // Là đơn vị (thập, bách, thiên)
      if (currentNum === 0) {
        // Trường hợp như '十章' (thập chương)
        currentNum = 1;
      }
      result += currentNum * value;
      currentNum = 0; // Reset số hiện tại
      lastUnit = value; // Cập nhật đơn vị cuối cùng
    } else if (char === "零" || char === "〇") {
      // Xử lý số 0
      // Nếu số 0 đứng giữa các chữ số, không cần làm gì nhiều, nó chỉ là ký tự filler
      // Nếu số 0 đứng cuối thì cũng không ảnh hưởng đến giá trị
    } else if (!isNaN(parseInt(char))) {
      // Xử lý nếu có số Ả Rập xen lẫn (ví dụ: '第10章')
      currentNum = parseInt(char);
      // Đây là trường hợp đơn giản, chỉ là số Ả Rập
      result = result * 10 + currentNum;
      currentNum = 0;
    }
  }

  // Cộng giá trị cuối cùng nếu có
  result += currentNum;

  // Xử lý các trường hợp đặc biệt như '十' (thập)
  if (result === 0 && chineseNum.includes("十")) {
    result = 10;
  }

  return result;
};

// Hàm trích số chương từ tiêu đề
const extractChapterNumber = (title) => {
  // Ưu tiên xử lý định dạng Hán tự: 第X章
  const chineseChapterMatch = title.match(
    /第([一二三四五六七八九十百千零〇\d]+)章/i
  );
  if (chineseChapterMatch && chineseChapterMatch[1]) {
    const chineseNumStr = chineseChapterMatch[1];
    // Kiểm tra xem có phải là số Ả Rập thuần túy trong Hán tự không
    if (!isNaN(parseInt(chineseNumStr))) {
      return parseInt(chineseNumStr);
    }
    return convertChineseNumber(chineseNumStr);
  }

  // Tiếp theo xử lý định dạng tiếng Việt/Anh: Chương N, Chapter N
  const arabicChapterMatch = title.match(
    /(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*(\d+)/i
  );
  if (arabicChapterMatch && arabicChapterMatch[1]) {
    return parseInt(arabicChapterMatch[1]);
  }

  // Nếu không tìm thấy số nào theo định dạng chương, trả về 0 hoặc một giá trị đặc biệt
  return 0; // Hoặc bạn có thể trả về null/undefined để báo hiệu không tìm thấy
};

const readTxt = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) return reject(err);

      // Kiểm tra kích thước file
      if (content.length > MAX_FILE_SIZE) {
        return reject("File quá lớn (giới hạn 10MB)");
      }

      // Đã loại bỏ .trimStart() ở đây vì chapterRegex đã xử lý khoảng trắng đầu dòng
      const lines = content.split("\n");
      const chapters = [];
      let currentChapter = null;
      let chapterCount = 0; // Biến này có thể không cần thiết nữa nếu mỗi chương đều có số

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Sử dụng regex với exec để lấy các nhóm bắt được
        const match = chapterRegex.exec(line);

        // Reset lastIndex của regex sau mỗi lần lặp để tránh lỗi
        // khi dùng global flag (g) với exec trong vòng lặp
        chapterRegex.lastIndex = 0;

        if (match) {
          if (currentChapter) {
            // Kiểm tra nội dung trống
            if (!currentChapter.content.trim()) {
              return reject(
                `Chương "${currentChapter.title}" không có nội dung`
              );
            }
            chapters.push(currentChapter);
          }

          const title = match[0].trim();
          const chapterNumber = extractChapterNumber(title);

          // Nếu extractChapterNumber trả về 0 (không tìm thấy số chương hợp lệ),
          // bạn có thể quyết định cách xử lý:
          // 1. Gán một số tăng dần: chapterCount++; currentChapter.chapterNumber = chapterCount;
          // 2. Coi đó là lỗi định dạng và reject.
          // Tạm thời, tôi sẽ gán chapterCount++ để đảm bảo chương vẫn có số thứ tự.
          // Nhưng lý tưởng là chapterNumber phải luôn được trích xuất chính xác.
          if (chapterNumber === 0) {
            // Nếu không thể trích xuất số chương từ tiêu đề
            chapterCount++;
          } else {
            chapterCount = chapterNumber; // Đảm bảo chapterCount theo đúng số chương đã trích xuất
          }

          currentChapter = {
            title,
            content: "",
            chapterNumber: chapterNumber || chapterCount, // Sử dụng chapterNumber nếu có, nếu không thì dùng chapterCount
          };
        } else if (currentChapter && line.trim()) {
          // Chỉ thêm nội dung nếu dòng không rỗng
          currentChapter.content += line + "\n";
        }
      }

      if (currentChapter) {
        if (!currentChapter.content.trim()) {
          return reject(`Chương "${currentChapter.title}" không có nội dung`);
        }
        chapters.push(currentChapter);
      }

      if (!chapters.length) {
        return reject("Không tìm thấy chương nào trong file");
      }

      // Sắp xếp chương theo số chương
      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      // Kiểm tra tính liên tục của số chương (sau khi sắp xếp)
      for (let i = 0; i < chapters.length; i++) {
        // Có thể cần điều chỉnh logic này nếu bạn có các chương "phi tuyến tính"
        // Ví dụ: chương 0, hoặc chương có số thứ tự nhảy cóc là bình thường trong truyện
        if (chapters[i].chapterNumber !== i + 1) {
          console.warn(
            `Cảnh báo: Chương "${
              chapters[i].title
            }" có số chương không liên tục (${
              chapters[i].chapterNumber
            } thay vì ${i + 1})`
          );
        }
      }
      //console.log("Đây là két quả dưới backend:", chapters);
      resolve(chapters);
    });
  });
};

module.exports = { readTxt };
