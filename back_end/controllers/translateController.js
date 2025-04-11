const { translateText } = require('../services/translateService');

exports.translateText = async (req, res) => {
  const { chapters, key } = req.body;

  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  try {
    const translatedChapters = await Promise.all(
      chapters.map(async (ch) => ({
        ...ch,
        translated: await translateText(ch.content, key),
      }))
    );

    res.json({ chapters: translatedChapters });
  } catch (err) {
    console.error("Lỗi dịch:", err.message);
    res.status(500).json({ error: "Dịch thất bại. Có thể key không hợp lệ hoặc vượt hạn mức." });
  }
};
