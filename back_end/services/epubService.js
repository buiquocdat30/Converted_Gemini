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
      // Không cần .trimStart() ở đây nữa vì chapterRegex đã xử lý khoảng trắng đầu dòng
      // và nội dung từ epub thường không có khoảng trắng đầu dòng không mong muốn
      const lines = fullText.split("\n");

      // Tìm chỉ mục của chương đầu tiên để bắt đầu phân tích
      // Dùng for...of để có thể dùng chapterRegex.exec() liên tục
      let firstChapterIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        chapterRegex.lastIndex = 0; // Reset regex cho mỗi dòng
        if (chapterRegex.test(lines[i])) {
          firstChapterIndex = i;
          break;
        }
      }

      if (firstChapterIndex === -1) {
        return reject("❌ Không tìm thấy chương nào trong file.");
      }

      const contentFromFirstChapter = lines.slice(firstChapterIndex).join("\n");

      // Sử dụng split với regex bắt các nhóm, cần đảm bảo regex bắt được cả tiêu đề và phần nội dung
      // Dùng một regex chỉ để split, không dùng global flag ở đây
      const splittingRegex = new RegExp(
        /^\s*(?:(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*(\d+)[^\n]*|第([一二三四五六七八九十百千零〇\d]+)章[^\n]*)/,
        "im"
      );

      const parts = contentFromFirstChapter.split(splittingRegex);

      // Parts sẽ có dạng: ["", "Tiêu đề Chương 1", "Nội dung Chương 1", "Tiêu đề Chương 2", "Nội dung Chương 2", ...]
      // Hoặc nếu không có nhóm bắt được, sẽ là ["", "Tiêu đề Chương 1", "Nội dung Chương 1", "Tiêu đề Chương 2", "Nội dung Chương 2", ...]
      // Cần điều chỉnh logic để xử lý parts sau khi split.

      const chapters = [];
      let currentChapterTitle = "";
      let currentChapterContent = "";
      let chapterCounter = 0; // Để đếm và gán số thứ tự nếu extractChapterNumber không hoạt động

      // Logic để ghép lại tiêu đề và nội dung từ `parts`
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === undefined || part.trim() === "") {
          continue; // Bỏ qua các phần rỗng hoặc undefined
        }

        // Kiểm tra xem phần hiện tại có phải là tiêu đề chương không
        const isChapterTitle = chapterRegex.test(part);
        chapterRegex.lastIndex = 0; // Reset lastIndex sau test

        if (isChapterTitle) {
          // Nếu đã có chương đang xây dựng, đẩy nó vào mảng
          if (currentChapterTitle !== "") {
            if (!currentChapterContent.trim()) {
              return reject(
                `Chương "${currentChapterTitle}" không có nội dung.`
              );
            }
            const chapterNumber = extractChapterNumber(currentChapterTitle);
            chapters.push({
              title: currentChapterTitle,
              content: currentChapterContent.trim(),
              chapterNumber: chapterNumber || ++chapterCounter, // Đảm bảo có số thứ tự
            });
          }
          // Bắt đầu chương mới
          currentChapterTitle = part.trim();
          currentChapterContent = ""; // Reset nội dung
        } else {
          // Nếu không phải tiêu đề, thêm vào nội dung chương hiện tại
          currentChapterContent += part + "\n";
        }
      }

      // Đẩy chương cuối cùng sau khi vòng lặp kết thúc
      if (currentChapterTitle !== "") {
        if (!currentChapterContent.trim()) {
          return reject(`Chương "${currentChapterTitle}" không có nội dung.`);
        }
        const chapterNumber = extractChapterNumber(currentChapterTitle);
        chapters.push({
          title: currentChapterTitle,
          content: currentChapterContent.trim(),
          chapterNumber: chapterNumber || ++chapterCounter,
        });
      }

      // Sắp xếp chapters theo chapterNumber
      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      // Kiểm tra tính liên tục của số chương
      for (let i = 0; i < chapters.length; i++) {
        // Có thể cần điều chỉnh logic này tùy thuộc vào cách đánh số chương của truyện
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

      resolve(chapters);
    } catch (error) {
      console.error("Lỗi khi đọc file EPUB:", error);
      reject(error);
    }
  });
};

module.exports = { readEpub };
