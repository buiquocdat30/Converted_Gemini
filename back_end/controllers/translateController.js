const {
  translateText: performTranslation,
} = require("../services/translateService");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.translateText = async (req, res) => {
  const { chapters, key } = req.body;

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
      const translated = await performTranslation(ch.content, key);

      translatedChapters.push({
        ...ch,
        translated,
      });
    }

    console.log("📌 Dịch hoàn tất:", translatedChapters);

    res.json({ chapters: translatedChapters });
  } catch (err) {
    console.error("Lỗi dịch:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Có thể key không hợp lệ hoặc vượt hạn mức.",
    });
  }
};
