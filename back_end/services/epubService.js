const EPub = require("epub");

const chapterRegex =
  /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim;

function splitContentByWords(text, maxWords = 500) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

const readEpub = (filePath) => {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);
    epub.on("error", reject);

    epub.on("end", () => {
      let fullText = "";
      let loaded = 0;

      epub.flow.forEach((chapter) => {
        epub.getChapter(chapter.id, (err, text) => {
          if (err) return reject(err);
          fullText += "\n" + text;
          loaded++;

          if (loaded === epub.flow.length) {
            const cleanedText = fullText
              .split("\n")
              .map((line) => line.trimStart())
              .join("\n");

            // ✨ Cắt thành từng cặp: [title, content, title, content, ...]
            const parts = cleanedText.split(chapterRegex).slice(1);

            const chapters = [];
            for (let i = 0; i < parts.length; i += 2) {
              const title = parts[i]?.trim() || `Chương ${i / 2 + 1}`;
              const content = parts[i + 1]?.trim() || "";
              const segments = splitContentByWords(content);
              chapters.push({ title, segments });
            }

            resolve(chapters);
          }
        });
      });
    });

    epub.parse();
  });
};

module.exports = { readEpub };
