const { translateText: performTranslation } = require("../services/translateService");

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

    // Tiến hành dịch các chương
    const translatedChapters = await Promise.all(
      chapters.map(async (ch) => {
        console.log("📌 Đang dịch chương:", ch.title || "Không có tiêu đề");

        const translated = await performTranslation(ch.content, key);
        console.log("📌 Dịch xong chương:", ch.title || "Không có tiêu đề");

        return {
          ...ch,
          translated: translated, // Gán kết quả dịch vào chương
        };
      })
    );

    console.log("📌 Dịch hoàn tất:", translatedChapters);

    res.json({ chapters: translatedChapters });
  } catch (err) {
    console.error("Lỗi dịch:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Có thể key không hợp lệ hoặc vượt hạn mức.",
    });
  }
};
