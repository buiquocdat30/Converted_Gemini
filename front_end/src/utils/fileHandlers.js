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
        const { totalChapters, totalWords } = calculateChapterStats(result.chapters);
        const averageWords = Math.round(totalWords / totalChapters);
        
        if (setChapterCount) setChapterCount(totalChapters);
        if (setTotalWords) setTotalWords(totalWords);
        if (setAverageWords) setAverageWords(averageWords);
      }

      // Gọi callback thành công nếu có
      if (setSuccess) {
        setSuccess("✅ File có thể sử dụng.");
      }

      return result.chapters;
    } else {
      // Xử lý lỗi
      if (setError) setError(`❌ File ${file.name} không đúng định dạng chương.`);
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

// kiểm tra định dạng file txt  
const checkFileFormatFromText = (text) => {
  const chapterRegex =
    /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d零〇一二三四五六七八九十百千]+章[^\n]*)/im;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const titles = [];
  const titleIndexes = [];

  // Bước 1: Xác định tiêu đề chương
  lines.forEach((line, idx) => {
    if (chapterRegex.test(line)) {
      titles.push(line);
      titleIndexes.push(idx);
    }
  });

  // Kiểm tra xem tiêu đề có lặp lại không → nếu có thì file dạng "title1 title2 title1 content1 ..."
  const titleSet = new Set(titles);
  const hasDuplicateTitles = titleSet.size !== titles.length;

  // Kiểm tra xem khoảng cách giữa tiêu đề có đều và cách nhau 2 dòng → nghi ngờ kiểu "title1 title2 content1 content2"
  let evenlySpaced = true;
  const gaps = [];

  for (let i = 1; i < titleIndexes.length; i++) {
    gaps.push(titleIndexes[i] - titleIndexes[i - 1]);
  }

  if (gaps.length >= 2) {
    const firstGap = gaps[0];
    evenlySpaced = gaps.every((g) => g === firstGap);
  }

  // Nếu có duplicate hoặc khoảng cách giữa tiêu đề bất thường → dùng tuyến tính
  const useLinear = hasDuplicateTitles || !evenlySpaced;

  if (!useLinear) {
    // Dùng chia đôi nếu cấu trúc phù hợp
    const half = titles.length / 2;

    if (Number.isInteger(half)) {
      const chapterTitles = titles.slice(0, half);
      const contentStartIndexes = titleIndexes.slice(half);

      const chapters = [];

      for (let i = 0; i < half; i++) {
        const start = contentStartIndexes[i] + 1;
        const end = contentStartIndexes[i + 1] || lines.length;
        const contentLines = lines.slice(start, end);
        const content = contentLines
          .map((line) => line + "\n\n")
          .join("")
          .trim();

        chapters.push({
          title: chapterTitles[i],
          content,
        });
      }

      const valid =
        chapters.length > 0 &&
        chapters.every((ch) => ch.content && ch.content.length > 0);

      return {
        valid,
        chapters,
        total: chapters.length,
      };
    }
  }

  // Mặc định fallback sang tuyến tính
  const chapters = [];
  let currentChapter = null;

  for (const line of lines) {
    if (chapterRegex.test(line)) {
      if (currentChapter) chapters.push(currentChapter);
      currentChapter = {
        title: line,
        content: "",
      };
    } else if (currentChapter) {
      currentChapter.content += line + "\n\n";
    }
  }

  if (currentChapter) chapters.push(currentChapter);

  const valid =
    chapters.length > 0 && chapters.every((ch) => ch.content.trim().length > 0);

  return {
    valid,
    chapters,
    total: chapters.length,
  };
};

export { handleEpubFile, handleTxtFile, checkFileFormatFromText };
