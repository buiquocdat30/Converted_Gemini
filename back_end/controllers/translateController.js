const {
  translateText: performTranslation,
} = require("../services/translateService");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.translateText = async (req, res) => {
  const { chapters, key } = req.body;

  // Thiết lập SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("📌 Yêu cầu dịch nhận được:", {
    totalChapters: chapters?.length,
    hasKey: !!key,
  });

  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  try {
    const translatedChapters = [];
    // Tiến hành dịch các chương
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const translated = await performTranslation(ch.content, key);

      translatedChapters.push({
        ...ch,
        translatedTitle,
        translated: translatedContent,
      });
    }

    console.log("📌 Dịch hoàn tất:", translatedChapters);

    res.json({ chapters: translatedChapters });
  } catch (err) {
    console.error("❌ Lỗi dịch chương:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Kiểm tra lại API key hoặc nội dung.",
    });
    res.end();
  }
};
