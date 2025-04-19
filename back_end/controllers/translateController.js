const {
  translateText: performTranslation,
} = require("../services/translateService");

exports.translateText = async (req, res) => {
  const { chapters, key } = req.body;

  console.log("📌 Yêu cầu dịch nhận được:", { totalChapters: chapters?.length, hasKey: !!key });

  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  try {
    const translatedChapters = [];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];

      const translatedContent = await performTranslation(ch.content || "", key);
      const translatedTitle = ch.title
        ? await performTranslation(ch.title, key)
        : ""; // không có title thì để trống

      translatedChapters.push({
        ...ch,
        translatedTitle,
        translated: translatedContent,
      });

      console.log(`✅ Đã dịch xong chương ${i + 1}/${chapters.length}`);
    }

    console.log("📦 Tất cả chương đã dịch:", translatedChapters.length);
    res.json({ chapters: translatedChapters });
  } catch (err) {
    console.error("❌ Lỗi dịch chương:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Kiểm tra lại API key hoặc nội dung.",
    });
  }
};
