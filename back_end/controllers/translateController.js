const {
  translateText: performTranslation,
} = require("../services/translateService");

//dịch nhiều nhất 3 đoạn cùng lúc
const pLimit = require("p-limit");

exports.translateText = async (req, res) => {
  const { chapters, key } = req.body;

  // Thiết lập SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Log giá trị truyền vào để kiểm tra
  console.log("📌 Yêu cầu dịch nhận được từ client:", req.body);

  if (!chapters || !Array.isArray(chapters)) {
    console.log("❌ Thiếu danh sách chương hoặc không phải mảng!");
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  try {
    // Đảm bảo key được truyền vào
    console.log("📌 API Key:", key);

    const translatedChapters = [];

    // Tiến hành dịch các chương
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const limit = pLimit(3); // Dịch tối đa 3 đoạn cùng lúc

      const translatedSegments = [];

      await Promise.all(
        ch.segments.map((segment, segmentIndex) =>
          limit(async () => {
            try {
              const translated = await performTranslation(segment, key);

              // Gửi về frontend từng đoạn ngay khi xong
              res.write(
                `data: ${JSON.stringify({
                  chapterIndex: i,
                  segmentIndex,
                  translated,
                  title: ch.title,
                })}\n\n`
              );

              translatedSegments[segmentIndex] = translated;
            } catch (err) {
              res.write(
                `event: error\ndata: ${JSON.stringify({
                  chapterIndex: i,
                  segmentIndex,
                  error: err.message,
                })}\n\n`
              );
            }
          })
        )
      );

      translatedChapters.push({
        ...ch,
        translated,
      });

      // Gửi sự kiện khi xong cả chương
      res.write(
        `event: chapterDone\ndata: ${JSON.stringify({
          chapterIndex: i,
          title: ch.title,
          translated: translatedSegments,
        })}\n\n`
      );
    }

    console.log("📌 Dịch hoàn tất:", translatedChapters);

    // Gửi sự kiện hoàn tất toàn bộ
    res.write(
      `event: done\ndata: ${JSON.stringify({
        message: "Dịch xong tất cả chương!",
      })}\n\n`
    );
    res.end();
  } catch (err) {
    console.error("Lỗi dịch:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Có thể key không hợp lệ hoặc vượt hạn mức.",
    });
    res.end();
  }
};
