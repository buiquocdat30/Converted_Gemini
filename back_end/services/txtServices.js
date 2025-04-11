const fs = require('fs');

// Regex tách chương
const chapterRegex = /(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*\n?|(?:第[\d一二三四五六七八九十百千]+章|第\d+章|[\d一二三四五六七八九十百千]+[\s\（]*[^\n]*[\）]*[^\n]*)\n?/g;


const readTxt = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, content) => {
      if (err) return reject(err);

      // Tách chương từ nội dung file .txt
      const rawChapters = content.split(chapterRegex).filter(ch => ch.trim() !== '');
      const titles = content.match(chapterRegex) || [];

      // Tạo danh sách các chương với tiêu đề và nội dung
      const chapters = rawChapters.map((content, index) => ({
        title: titles[index] || `Chương ${index + 1}`,
        content: content.trim()
      }));

      resolve(chapters);
    });
  });
};

module.exports = { readTxt };
