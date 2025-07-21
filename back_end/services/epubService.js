const EPub = require("epub");

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
  let currentNum = 0;

  // Xử lý trường hợp số chỉ có một chữ số Hán tự
  if (chineseNum.length === 1 && chineseNumbers[chineseNum] !== undefined) {
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
    } else if (char === "零" || char === "〇") {
      // Xử lý số 0
      // Không làm gì nếu số 0 đứng giữa hoặc cuối
    } else if (!isNaN(parseInt(char))) {
      // Xử lý nếu có số Ả Rập xen lẫn (ví dụ: '第10章')
      currentNum = parseInt(char);
      result = result * 10 + currentNum; // Cộng dồn số Ả Rập
      currentNum = 0; // Reset
    }
  }

  // Cộng giá trị cuối cùng nếu có
  result += currentNum;

  // Xử lý các trường hợp đặc biệt như '十' (thập) nếu nó chưa được tính
  if (result === 0 && chineseNum.includes("十") && chineseNum.length === 1) {
    // Chỉ '十'
    result = 10;
  }

  return result;
};

// Regex đa ngôn ngữ tìm tiêu đề chương
// Đã điều chỉnh để bắt số chương chính xác hơn
const chapterRegex =
  /^\s*(?:(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*(\d+)[^\n]*|第([一二三四五六七八九十百千零〇\d]+)章[^\n]*)/gim;

// Hàm trích xuất số chương từ tiêu đề (cải thiện)
const extractChapterNumber = (title) => {
  // Ưu tiên xử lý định dạng Hán tự: 第X章
  const chineseChapterMatch = title.match(
    /第([一二三四五六七八九十百千零〇\d]+)章/i
  );
  if (chineseChapterMatch && chineseChapterMatch[1]) {
    const chineseNumStr = chineseChapterMatch[1];
    // Kiểm tra xem có phải là số Ả Rập thuần túy trong phần Hán tự không
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

  // Nếu không tìm thấy số nào theo định dạng chương, trả về 0
  return 0;
};

const readEpub = (filePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const epub = new EPub(filePath);

      await new Promise((epubResolve, epubReject) => {
        epub.on("error", epubReject);
        epub.on("end", epubResolve);
        epub.parse();
      });

      const chapterTexts = await Promise.all(
        epub.flow.map(
          (chapter) =>
            new Promise((res, rej) => {
              epub.getChapter(chapter.id, (err, text) => {
                if (err) return rej(err);
                // Loại bỏ các thẻ HTML và khoảng trắng thừa từ nội dung chương
                const cleanText = text.replace(/<[^>]*>?/gm, "").trim();
                res(cleanText);
              });
            })
        )
      );

      const fullText = chapterTexts.join("\n");
      const lines = fullText.split("\n");

      const chapters = [];
      let currentChapter = null;
      let chapterCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Sử dụng regex với exec để lấy các nhóm bắt được
        const match = chapterRegex.exec(line);
        chapterRegex.lastIndex = 0;
        if (match) {
          if (currentChapter) {
            if (!currentChapter.content.trim()) {
              console.warn(`Chương "${currentChapter.title}" không có nội dung, sẽ bỏ qua.`);
            } else {
              chapters.push(currentChapter);
            }
          }
          const title = match[0].trim();
          const chapterNumber = extractChapterNumber(title);
          if (chapterNumber === 0) {
            chapterCount++;
          } else {
            chapterCount = chapterNumber;
          }
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
          console.warn(`Chương "${currentChapter.title}" không có nội dung, sẽ bỏ qua.`);
        } else {
          chapters.push(currentChapter);
        }
      }

      if (!chapters.length) {
        return reject("❌ Không tìm thấy chương nào trong file.");
      }

      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].chapterNumber !== i + 1) {
          console.warn(
            `Cảnh báo: Chương "${chapters[i].title}" có số chương không liên tục (${chapters[i].chapterNumber} thay vì ${i + 1})`
          );
        }
      }

      resolve(chapters);
    } catch (error) {
      console.error("Lỗi khi đọc file EPUB:", error);
      reject(error);
    }
  });
};

module.exports = { readEpub };
