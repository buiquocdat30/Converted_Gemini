const fs = require("fs");

// Giới hạn kích thước file (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Regex đa ngôn ngữ tìm tiêu đề chương
const chapterRegex =
  /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*(\d+)[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim;

// Hàm chuyển đổi số Hán tự sang số Ả Rập
const convertChineseNumber = (chineseNum) => {
  const chineseNumbers = {
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
    零: 0,
    〇: 0,
  };

  let result = 0;
  let temp = 0;
  let unit = 1;

  for (let i = chineseNum.length - 1; i >= 0; i--) {
    const char = chineseNum[i];
    if (chineseNumbers[char] >= 10) {
      if (temp === 0) temp = 1;
      result += temp * chineseNumbers[char];
      temp = 0;
      unit = 1;
    } else {
      temp += chineseNumbers[char] * unit;
      unit *= 10;
    }
  }
  result += temp;
  return result;
};

// Hàm trích số chương từ tiêu đề
const extractChapterNumber = (title) => {
  // Thử tìm số Ả Rập trước
  const arabicMatch = title.match(/\d+/);
  if (arabicMatch) {
    return parseInt(arabicMatch[0]);
  }

  // Thử tìm số Hán tự
  const chineseMatch = title.match(/[一二三四五六七八九十百千零〇]+/);
  if (chineseMatch) {
    return convertChineseNumber(chineseMatch[0]);
  }

  // Nếu không tìm thấy số nào, trả về 0
  return 0;
};

const readTxt = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) return reject(err);

      // Kiểm tra kích thước file
      if (content.length > MAX_FILE_SIZE) {
        return reject("File quá lớn (giới hạn 10MB)");
      }

      const lines = content.split("\n").map((line) => line.trimStart());
      const chapters = [];
      let currentChapter = null;
      let chapterCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(chapterRegex);

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
          chapterCount++;

          currentChapter = {
            title,
            content: "",
            chapterNumber: chapterNumber || chapterCount,
          };
        } else if (currentChapter && line.trim()) {
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

      // Kiểm tra tính liên tục của số chương
      for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].chapterNumber !== i + 1) {
          console.warn(
            `Cảnh báo: Chương "${chapters[i].title}" có số chương không liên tục`
          );
        }
      }

      resolve(chapters);
    });
  });
};

module.exports = { readTxt };
