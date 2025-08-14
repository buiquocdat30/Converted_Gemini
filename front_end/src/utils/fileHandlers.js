import ePub from "epubjs";

// Hàm lọc nội dung để loại bỏ phần glossary khi xuất file
export const cleanContentForExport = (content) => {
  if (!content) return "";
  
  let cleanedContent = content;
  
  // Loại bỏ phần "📚 THƯ VIỆN TỪ MỚI:" và tất cả nội dung sau đó
  cleanedContent = cleanedContent.replace(/📚 THƯ VIỆN TỪ MỚI:[\s\S]*$/g, '');
  
  // Loại bỏ phần "THƯ VIỆN TỪ MỚI:" (không có emoji)
  cleanedContent = cleanedContent.replace(/THƯ VIỆN TỪ MỚI:[\s\S]*$/g, '');
  
  // Loại bỏ phần "Không có từ mới" và các biến thể
  cleanedContent = cleanedContent.replace(/Không có từ mới[\s\S]*$/g, '');
  cleanedContent = cleanedContent.replace(/Không có từ mới nào[\s\S]*$/g, '');
  
  // Loại bỏ các dòng trống thừa ở cuối
  return cleanedContent.trim();
};

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

// Hàm chuyển đổi số Hán tự sang số Ả Rập (đồng bộ với backend)
const convertChineseNumber = (chineseNum) => {
  const chineseNumbers = {
    零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 百: 100, 千: 1000,
  };

  // Xử lý trường hợp đặc biệt
  if (chineseNum.length === 1) {
    return chineseNumbers[chineseNum] || 0;
  }

  // Xử lý trường hợp số ghép như "一七四" (174)
  // Kiểm tra xem có phải là dãy số đơn lẻ không
  let isSequence = true;
  for (let i = 0; i < chineseNum.length; i++) {
    const char = chineseNum[i];
    if (!chineseNumbers[char] || chineseNumbers[char] > 9) {
      isSequence = false;
      break;
    }
  }

  // Nếu là dãy số đơn lẻ (như "一七四"), ghép lại thành số
  if (isSequence) {
    let result = "";
    for (let i = 0; i < chineseNum.length; i++) {
      result += chineseNumbers[chineseNum[i]];
    }
    return parseInt(result, 10);
  }

  // Xử lý trường hợp số Hán tự truyền thống (như "十五", "二十" v.v.)
  let result = 0;
  let currentNum = 0;
  
  for (let i = 0; i < chineseNum.length; i++) {
    const char = chineseNum[i];
    const value = chineseNumbers[char];

    if (value >= 1 && value <= 9) {
      currentNum = value;
    } else if (value >= 10) {
      if (currentNum === 0) {
        currentNum = 1;
      }
      result += currentNum * value;
      currentNum = 0;
    }
  }
  result += currentNum;
  
  // Xử lý trường hợp đặc biệt
  if (result === 0 && chineseNum.includes("十") && chineseNum.length === 1) {
    result = 10;
  }
  
  return result;
};


// Hàm trích số chương từ tiêu đề (đồng bộ với backend)
const extractChapterNumber = (title) => {
  console.log(`🔍 [extractChapterNumber] Đang xử lý tiêu đề: "${title}"`);
  
  // Trường hợp 1: Dạng "第 [Số Ả Rập] 章" (ví dụ: "第16章", "第174章")
  let match = title.match(/第(\d+)章/i);
  if (match && match[1]) {
    const number = parseInt(match[1], 10);
    console.log(`✅ [extractChapterNumber] Tìm thấy số Ả Rập: ${number}`);
    return number;
  }

  // Trường hợp 2: Dạng "第 [Số Hán Tự] 章" (ví dụ: "第十五章", "第一七四章")
  match = title.match(/第([一二三四五六七八九十百千零〇]+)章/i);
  if (match && match[1]) {
    const chineseNum = match[1];
    console.log(`🔤 [extractChapterNumber] Tìm thấy số Hán tự: "${chineseNum}"`);
    
    // Kiểm tra xem có chứa số Ả Rập không
    if (!/\d/.test(chineseNum)) {
      const convertedNumber = convertChineseNumber(chineseNum);
      console.log(`🔄 [extractChapterNumber] Chuyển đổi "${chineseNum}" thành: ${convertedNumber}`);
      return convertedNumber;
    }
  }

  // Trường hợp 3: Dạng "Chương N" hoặc "Chapter N"
  match = title.match(/(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*(\d+)/i);
  if (match && match[1]) {
    const number = parseInt(match[1], 10);
    console.log(`✅ [extractChapterNumber] Tìm thấy tiêu đề tiếng Việt/Anh: ${number}`);
    return number;
  }

  console.log(`❌ [extractChapterNumber] Không thể trích xuất số chương từ: "${title}"`);
  return 0;
};

// Hàm xử lý chung để tách chương từ một đoạn văn bản
const parseTextToChapters = (text) => {
  console.log("🚀 [parseTextToChapters] Bắt đầu xử lý văn bản đầu vào. Kích thước:", text.length);
  const chapterRegex = /^\s*(?:(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+|第[一二三四五六七八九十百千零〇\d]+章)/;
  
  const lines = text.split(/\r?\n/);
  const chapters = [];
  let currentChapter = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (chapterRegex.test(trimmedLine)) {
      if (currentChapter && currentChapter.content.trim()) {
        chapters.push(currentChapter);
      }
      currentChapter = {
        title: trimmedLine,
        content: "",
        chapterNumber: extractChapterNumber(trimmedLine),
      };
    } else if (currentChapter) {
      currentChapter.content += trimmedLine + "\n";
    }
  }

  if (currentChapter && currentChapter.content.trim()) {
    chapters.push(currentChapter);
  }

  chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  console.log(`✅ [parseTextToChapters] Xử lý xong. Tìm thấy ${chapters.length} chương.`);
  if (chapters.length > 0) {
    console.log("    => Chương đầu tiên:", chapters[0].title);
    console.log("    => Chương cuối cùng:", chapters[chapters.length - 1].title);
  }


  return {
    valid: chapters.length > 0 && chapters.every((ch) => ch.content.trim().length > 0),
    chapters,
    total: chapters.length,
  };
};

// Xử lý file epub (được làm lại để đơn giản và nhất quán)
const handleEpubFile = async (
  readerResult,
  setChapters,
  setError,
  setSuccess,
  setChapterCount,
  setTotalWords,
  setAverageWords
) => {
  console.log("🚀 [handleEpubFile] Bắt đầu xử lý file EPUB.");
  try {
    // Đảm bảo nguồn dữ liệu cho epubjs là Blob/File hoặc ArrayBuffer hợp lệ
    let epubSource = readerResult;
    if (readerResult instanceof ArrayBuffer) {
      epubSource = new Blob([readerResult], { type: "application/epub+zip" });
    }
    const book = ePub(epubSource);
    await book.ready;

    let fullText = "";
    const spineItems = book.spine.spineItems;
    
    console.log("📚 [handleEpubFile] Spine items:", spineItems.length);
    console.log("📚 [handleEpubFile] First spine item:", spineItems[0]);
    
    // Sử dụng cách xử lý đơn giản và an toàn với epubjs
    for (const item of spineItems) {
      try {
        // Sử dụng cách xử lý đơn giản nhất
        const section = await book.load(item.url);
        const contents = section.querySelector("body");
        if (contents) {
          fullText += contents.innerText + "\n\n";
        }
        await item.unload();
      } catch (itemError) {
        console.warn(`⚠️ Lỗi khi xử lý item ${item.url}:`, itemError);
        continue;
      }
    }
    console.log("📄 [handleEpubFile] Đã trích xuất văn bản từ EPUB. Kích thước:", fullText.length);

    const result = parseTextToChapters(fullText);

    if (result.valid) {
      if (setChapters) setChapters(result.chapters);

      const { totalChapters, totalWords } = calculateChapterStats(result.chapters);
      const averageWords = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

      if (setChapterCount) setChapterCount(totalChapters);
      if (setTotalWords) setTotalWords(totalWords);
      if (setAverageWords) setAverageWords(averageWords);

      console.log("✅ [handleEpubFile] Xử lý EPUB thành công. Dữ liệu đầu ra:", result.chapters);
      if (setSuccess) setSuccess("✅ File EPUB đã được xử lý thành công.");
      return result.chapters;
    } else {
      throw new Error("Không tìm thấy chương nào hợp lệ trong file EPUB.");
    }
  } catch (err) {
    console.error("❌ [handleEpubFile] Lỗi xử lý EPUB:", err);
    if (setError) setError(`❌ Lỗi khi đọc file EPUB: ${err.message}`);
    if (setSuccess) setSuccess("");
    if (setChapters) setChapters([]);
    throw err;
  }
};

// Xử lý file txt (được làm lại để dùng logic chung)
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
  setAverageWords
) => {
  console.log(`🚀 [handleTxtFile] Bắt đầu xử lý file TXT: ${file.name}`);
  try {
    console.log("📄 [handleTxtFile] Dữ liệu văn bản đầu vào. Kích thước:", readerResult.length);
    const result = parseTextToChapters(readerResult);

    if (result.valid) {
      if (setChapters) setChapters(result.chapters);

      const { totalChapters, totalWords } = calculateChapterStats(result.chapters);
      const averageWords = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

        if (setChapterCount) setChapterCount(totalChapters);
        if (setTotalWords) setTotalWords(totalWords);
        if (setAverageWords) setAverageWords(averageWords);

      console.log(`✅ [handleTxtFile] Xử lý TXT thành công. Dữ liệu đầu ra cho file ${file.name}:`, result.chapters);
      if (setSuccess) setSuccess("✅ File TXT hợp lệ và đã được xử lý.");
      return result.chapters;
    } else {
      const errorMessage = `❌ File ${file.name} không chứa chương nào hợp lệ hoặc không đúng định dạng.`;
      if (setError) setError(errorMessage);
      if (setSelectedFile) setSelectedFile(null);
      if (setChapters) setChapters([]);
      if (setSuccess) setSuccess("");
      if (fileInputRef?.current) fileInputRef.current.value = "";
      throw new Error(errorMessage);
    }
  } catch (err) {
    console.error(`❌ [handleTxtFile] Lỗi xử lý TXT file ${file.name}:`, err);
    if (setError) setError(err.message);
    if (setSuccess) setSuccess("");
    if (setChapters) setChapters([]);
    throw err;
  }
};

const checkFileFormatFromText = (text) => {
  console.log("🚀 [checkFileFormatFromText] Bắt đầu kiểm tra định dạng văn bản.");
  return parseTextToChapters(text);
}


export { handleEpubFile, handleTxtFile, checkFileFormatFromText };
