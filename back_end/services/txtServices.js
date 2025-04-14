const fs = require("fs");

// Regex hỗ trợ đa ngôn ngữ + khoảng trắng đầu dòng
const chapterRegex =
  /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim;

const readTxt = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) return reject(err);

      // ✨ Làm sạch đầu dòng
      const cleanedContent = content
        .split("\n")
        .map((line) => line.trimStart())
        .join("\n");

      // ✨ Cắt nội dung thành [title, content, title, content, ...]
      const parts = cleanedContent.split(chapterRegex).slice(1);

      const chapters = [];
      for (let i = 0; i < parts.length; i += 2) {
        const title = parts[i]?.trim() || `Chương ${i / 2 + 1}`;
        const content = parts[i + 1]?.trim() || "";
        chapters.push({ title, content });
      }

      resolve(chapters);
    });
  });
};

module.exports = { readTxt };
