// Utility function để đếm số từ trong văn bản
// Hỗ trợ tiếng Việt, tiếng Anh và tiếng Hán

/**
 * Đếm số từ trong văn bản
 * @param {string} text - Văn bản cần đếm từ
 * @returns {number} - Số từ trong văn bản
 */
const countWords = (text) => {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Loại bỏ các ký tự đặc biệt và khoảng trắng thừa
  const cleanText = text.trim();
  if (!cleanText) {
    return 0;
  }

  // Đếm ký tự Hán (Unicode range: 4E00-9FFF)
  const chineseChars = cleanText.match(/[\u4e00-\u9fff]/g) || [];
  
  // Loại bỏ ký tự Hán khỏi văn bản để đếm từ khác
  const nonChineseText = cleanText.replace(/[\u4e00-\u9fff]/g, '');
  
  // Đếm từ không phải Hán (tách theo khoảng trắng, dấu câu)
  const nonChineseWords = nonChineseText
    .split(/[\s\.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>]+/)
    .filter(word => word.length > 0);

  // Tổng số từ = số ký tự Hán + số từ khác
  return chineseChars.length + nonChineseWords.length;
};

/**
 * Tính toán thống kê từ cho một chương
 * @param {string} title - Tiêu đề chương
 * @param {string} content - Nội dung chương
 * @returns {Object} - Thống kê từ
 */
const calculateChapterWordStats = (title, content) => {
  const titleWords = countWords(title || '');
  const contentWords = countWords(content || '');
  const totalWords = titleWords + contentWords;

  return {
    titleWords,
    contentWords,
    totalWords
  };
};

/**
 * Tính toán thống kê từ cho nhiều chương
 * @param {Array} chapters - Mảng các chương
 * @returns {Object} - Thống kê tổng hợp
 */
const calculateTotalWordStats = (chapters) => {
  if (!Array.isArray(chapters)) {
    return {
      totalChapters: 0,
      totalWords: 0,
      averageWordsPerChapter: 0,
      chapterStats: []
    };
  }

  const chapterStats = chapters.map((chapter, index) => {
    const stats = calculateChapterWordStats(
      chapter.title || chapter.chapterName || '',
      chapter.content || chapter.rawText || ''
    );
    
    return {
      chapterNumber: chapter.chapterNumber || index + 1,
      title: chapter.title || chapter.chapterName || `Chương ${index + 1}`,
      ...stats
    };
  });

  const totalWords = chapterStats.reduce((sum, chapter) => sum + chapter.totalWords, 0);
  const totalChapters = chapterStats.length;
  const averageWordsPerChapter = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

  return {
    totalChapters,
    totalWords,
    averageWordsPerChapter,
    chapterStats
  };
};

module.exports = {
  countWords,
  calculateChapterWordStats,
  calculateTotalWordStats
}; 