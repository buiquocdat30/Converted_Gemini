import ePub from "epubjs";

const handleEpubFile = async (
  readerResult,
  setChapters,
  setError,
  setSuccess
) => {
  try {
    const book = ePub(readerResult);
    await book.ready;

    const spineItems = book.spine.spineItems;
    const allTexts = [];

    // Regex để nhận diện các tiêu đề chương
    const chapterRegex =
      /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d零〇一二三四五六七八九十百千]+章[^\n]*|\d+\s+.*（第\d+页）)/im;

    for (let i = 0; i < spineItems.length; i++) {
      const item = spineItems[i];
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

        console.log("seenTitles", seenTitles);
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
        currentChapter.content += (currentChapter.content ? "\n\n" : "") + line;
      }
    }
    console.log("currentChapter: ", currentChapter);
    // Thêm chương cuối cùng vào danh sách
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    setChapters(chapters);
    setSuccess("✅ File EPUB đã được xử lý.");
    console.log("✅ EPUB đã chia chương:", chapters);
  } catch (err) {
    console.error("❌ EPUB xử lý lỗi:", err);
    setError("❌ Lỗi khi đọc file EPUB.");
    setSuccess("");
    setChapters([]);
  }
};

const handleTxtFile = (
  readerResult,
  setChapters,
  setError,
  setSucess,
  fileInputRef,
  setSelectedFile,
  file
) => {
  const result = checkFileFormatFromText(readerResult);

  if (result.valid) {
    // Set chapters và xử lý thành công
    setChapters(result.chapters);
    setSucess("✅ File có thể sử dụng.");
    console.log("✅ TXT đã xử lý:", result.chapters);
  } else {
    // Xử lý lỗi nếu file không đúng định dạng
    setError(`❌ File ${file.name} không đúng định dạng chương.`);
    setSelectedFile(null);
    setChapters([]); // Reset chapters nếu có lỗi
    setSucess(""); // Reset success message
    fileInputRef.current.value = ""; // Reset file input
  }
};

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
        const content = contentLines.join("\n\n").trim();

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
      currentChapter.content += (currentChapter.content ? "\n\n" : "") + line;
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
