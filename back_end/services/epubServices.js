const EPub = require('epub');

// Regex tách chương
const chapterRegex = /(?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*\n?|(?:第[\d一二三四五六七八九十百千]+章|第\d+章|[\d一二三四五六七八九十百千]+[\s\（]*[^\n]*[\）]*[^\n]*)\n?/g;


const readEpub = (filePath) => {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);
    epub.on('error', reject);

    epub.on('end', () => {
      let fullText = '';
      let loaded = 0;

      epub.flow.forEach((chapter) => {
        epub.getChapter(chapter.id, (err, text) => {
          if (err) return reject(err);
          fullText += '\n' + text;
          loaded++;
          if (loaded === epub.flow.length) {
            // Sau khi gộp xong toàn bộ text
            const rawChapters = fullText.split(chapterRegex).filter(ch => ch.trim() !== '');
            const titles = fullText.match(chapterRegex) || [];

            const chapters = rawChapters.map((content, index) => ({
              title: titles[index] || `Chương ${index + 1}`,
              content: content.trim()
            }));

            resolve(chapters);
          }
        });
      });
    });

    epub.parse();
  });
};

module.exports = { readEpub };
