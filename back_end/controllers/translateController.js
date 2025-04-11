const { translateText } = require('../services/translateService');

exports.translateText = async (req, res) => {
  const { content, key } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Thiếu nội dung cần dịch." });
  }

  try {
    const translated = await translateText(content, key);
    res.json({ translated });
  } catch (err) {
    console.error("Lỗi dịch:", err.message);
    res.status(500).json({ error: "Dịch thất bại. Có thể key không hợp lệ hoặc vượt hạn mức." });
  }
};
