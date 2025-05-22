import ePub from "epubjs";

//đếm số lượng từ
const calculateChapterStats = (chapters) => {
  const totalChapters = chapters.length;

  const totalWords = chapters.reduce((sum, ch) => {
    const titleWords = countWords(ch.title);
    const contentWords = countWords(ch.content);
    return sum + titleWords + contentWords;
  }, 0);

  return { totalChapters, totalWords };
};

// Đếm từ: nếu là tiếng Hán thì đếm từng ký tự Hán, nếu là tiếng Việt/Anh thì tách theo khoảng trắng
const countWords = (text) => {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const nonChineseWords = text
    .replace(/[\u4e00-\u9fff]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return chineseChars.length + nonChineseWords.length;
};

// xử lý file epub
const handleEpubFile = async (
  readerResult,
  setChapters,
  setError,
  setSuccess,
  setChapterCount,
  setTotalWords,
  setAverageWords,
  setBooks,
  setAuthor
) => {
  try {
    const book = ePub(readerResult);
    await book.ready;
    console.log("book", book);
    const spineItems = book.spine.spineItems;
    const allTexts = [];

    // Regex để nhận diện các tiêu đề chương
    const chapterRegex =
      /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d零〇一二三四五六七八九十百千]+章[^\n]*|\d+\s+.*（第\d+页）)/im;

    for (let i = 0; i < spineItems.length; i++) {
      const item = spineItems[i];
      const section = await item.load(book.load.bind(book));
      const html = await item.render();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const paragraphs = Array.from(doc.querySelectorAll("p"));
      for (const p of paragraphs) {
        const text = p.textContent?.trim();
        if (text) allTexts.push(text);
      }

      await item.unload();
    }

    // Tạo danh sách các chương
    const chapters = [];
    let currentChapter = null;
    const seenTitles = new Set(); // Để lưu các tiêu đề đã gặp

    for (const line of allTexts) {
      const match = line.match(chapterRegex); // Kiểm tra xem có phải tiêu đề không
      if (match) {
        // Kiểm tra xem tiêu đề đã gặp chưa
        if (seenTitles.has(match[1] || match[0])) {
          continue; // Nếu đã gặp, bỏ qua
        }

        // Lưu tiêu đề đã gặp
        seenTitles.add(match[1] || match[0]);

        // Nếu đã có chương trước đó, thêm vào danh sách
        if (currentChapter) {
          chapters.push(currentChapter);
        }

        // Tạo chương mới
        currentChapter = {
          title: match[1] || match[0],
          content: "",
        };
      } else if (currentChapter) {
        // Nếu đang thu thập nội dung cho chương hiện tại
        currentChapter.content += line + "\n\n";
      }
    }

    // Thêm chương cuối cùng vào danh sách
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    // Gọi callback với chapters
    setChapters(chapters);

    // Tính toán và gọi các callback khác nếu cần
    if (setChapterCount || setTotalWords || setAverageWords) {
      const { totalChapters, totalWords } = calculateChapterStats(chapters);
      const averageWords = Math.round(totalWords / totalChapters);

      if (setChapterCount) setChapterCount(totalChapters);
      if (setTotalWords) setTotalWords(totalWords);
      if (setAverageWords) setAverageWords(averageWords);
    }

    // Gọi callback thành công nếu có
    if (setSuccess) {
      setSuccess("✅ File EPUB đã được xử lý.");
    }

    return chapters;
  } catch (err) {
    console.error("❌ EPUB xử lý lỗi:", err);
    if (setError) setError("❌ Lỗi khi đọc file EPUB.");
    if (setSuccess) setSuccess("");
    if (setChapters) setChapters([]);
    throw err;
  }
};

// xử lý file txt

const handleTxtFile = (
  readerResult,
  setChapters,
  setError,
  setSuccess,
  fileInputRef,
  setSelectedFile,
  file,
  setChapterCount,
  setTotalWords,
  setAverageWords,
  setBooks,
  setAuthor
) => {
  try {
    const result = checkFileFormatFromText(readerResult);

    if (result.valid) {
      // Gọi callback với chapters
      if (setChapters) setChapters(result.chapters);

      // Tính toán và gọi các callback khác nếu cần
      if (setChapterCount || setTotalWords || setAverageWords) {
        const { totalChapters, totalWords } = calculateChapterStats(
          result.chapters
        );
        const averageWords = Math.round(totalWords / totalChapters);

        if (setChapterCount) setChapterCount(totalChapters);
        if (setTotalWords) setTotalWords(totalWords);
        if (setAverageWords) setAverageWords(averageWords);
      }

      // Gọi callback thành công nếu có
      if (setSuccess) {
        setSuccess("✅ File có thể sử dụng.");
      }
      console.log("✅ kết quả trả về của file handleTxtFile.", result.chapters);
      return result.chapters;
    } else {
      // Xử lý lỗi
      if (setError)
        setError(`❌ File ${file.name} không đúng định dạng chương.`);
      if (setSelectedFile) setSelectedFile(null);
      if (setChapters) setChapters([]);
      if (setSuccess) setSuccess("");
      if (fileInputRef?.current) fileInputRef.current.value = "";

      throw new Error(`File ${file.name} không đúng định dạng chương.`);
    }
  } catch (err) {
    console.error("❌ TXT xử lý lỗi:", err);
    if (setError) setError(err.message);
    if (setSuccess) setSuccess("");
    if (setChapters) setChapters([]);
    throw err;
  }
};

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

// kiểm tra định dạng file txt
const checkFileFormatFromText = (text) => {
  const chapterRegex =
    /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[零〇一二三四五六七八九十百千万亿]+章[^\n]*)/i;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const chapters = [];
  let currentChapter = null;

  for (const line of lines) {
    if (chapterRegex.test(line)) {
      if (currentChapter) {
        chapters.push(currentChapter);
      }

      currentChapter = {
        title: line,
        content: "",
        chapterNumber: extractChapterNumber(line),
      };
    } else if (currentChapter) {
      currentChapter.content += line + "\n\n";
    }
  }

  if (currentChapter) {
    chapters.push(currentChapter);
  }

  // Gán lại chapterNumber theo thứ tự dòng xuất hiện
  chapters.forEach((ch, index) => {
    ch.chapterNumber = index + 1;
  });

  return {
    valid:
      chapters.length > 0 &&
      chapters.every((ch) => ch.content.trim().length > 0),
    chapters,
    total: chapters.length,
  };
};

export { handleEpubFile, handleTxtFile, checkFileFormatFromText };
