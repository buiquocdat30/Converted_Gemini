// const EPub = require("epub");

// const chapterRegex =
//   /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim;

// const readEpub = (filePath) => {
//   return new Promise((resolve, reject) => {
//     const epub = new EPub(filePath);
//     epub.on("error", reject);

//     epub.on("end", () => {
//       let fullText = "";
//       let loaded = 0;

//       epub.flow.forEach((chapter) => {
//         epub.getChapter(chapter.id, (err, text) => {
//           if (err) return reject(err);
//           fullText += "\n" + text;
//           loaded++;

//           if (loaded === epub.flow.length) {
//             const cleanedText = fullText
//               .split("\n")
//               .map((line) => line.trimStart())
//               .join("\n");

//             // ✨ Cắt thành từng cặp: [title, content, title, content, ...]
//             const parts = cleanedText.split(chapterRegex).slice(1);

//             const chapters = [];
//             for (let i = 0; i < parts.length; i += 2) {
//               const title = parts[i]?.trim() || `Chương ${i / 2 + 1}`;
//               const content = parts[i + 1]?.trim() || "";
//               chapters.push({ title, content });
//             }

//             resolve(chapters);
//           }
//         });
//       });
//     });

//     epub.parse();
//   });
// };

// module.exports = { readEpub };

const EPub = require("epub");

const chapterRegex =
  /^\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[^\n]*|第[\d一二三四五六七八九十百千]+章[^\n]*)$/gim;

const readEpub = (filePath) => {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on("error", reject);

    epub.on("end", async () => {
      try {
        // ⏳ Đợi tất cả chương load xong bằng Promise.all
        const chapterTexts = await Promise.all(
          epub.flow.map(
            (chapter) =>
              new Promise((res, rej) => {
                epub.getChapter(chapter.id, (err, text) => {
                  if (err) return rej(err);
                  res(text);
                });
              })
          )
        );

        const fullText = chapterTexts.join("\n");
        const lines = fullText.split("\n").map((line) => line.trimStart());

        const startIndex = lines.findIndex((line) => {
          const match = chapterRegex.test(line);
          chapterRegex.lastIndex = 0;
          return match;
        });

        if (startIndex === -1) {
          return reject("❌ Không tìm thấy chương đầu tiên.");
        }

        const realContent = lines.slice(startIndex).join("\n");
        const parts = realContent.split(chapterRegex).slice(1);

        const chapters = [];
        for (let i = 0; i < parts.length; i += 2) {
          const title = parts[i]?.trim() || `Chương ${i / 2 + 1}`;
          const content = parts[i + 1]?.trim() || "";
          chapters.push({ title, content });
        }

        resolve(chapters);
      } catch (error) {
        reject(error);
      }
    });

    epub.parse();
  });
};

module.exports = { readEpub };
