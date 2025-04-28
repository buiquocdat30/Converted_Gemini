const {
  translateText: performTranslation,
} = require("../services/translateService");

exports.translateText = async (req, res) => {
  const { chapters, key, model } = req.body;

  console.log("📌 Yêu cầu dịch nhận được:", {
    totalChapters: chapters?.length,
    hasKey: !!key,
    modelAI: model,
  });

  if (!chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }

  // try {
  //   const translatedChapters = [];

  //   for (let i = 0; i < chapters.length; i++) {
  //     const ch = chapters[i];

  //     const translatedContent = await performTranslation(ch.content || "", key, model);
  //     const translatedTitle = ch.title
  //       ? await performTranslation(ch.title, key, model)
  //       : ""; // không có title thì để trống

  //     translatedChapters.push({
  //       ...ch,
  //       translatedTitle,
  //       translated: translatedContent,
  //     });

  //     console.log(`✅ Đã dịch xong chương ${i + 1}/${chapters.length}`);
  //   }

  //   console.log("📦 Tất cả chương đã dịch:", translatedChapters.length);
  //   res.json({ chapters: translatedChapters });
  // } catch (err) {
  try {
    const translationPromises = chapters.map(async (ch, index) => {
      const startTime = Date.now(); // ⏳ Bắt đầu tính giờ
      try {
        // ⚡️ Lấy key riêng cho mỗi chương
        const customKey = key || null; // hoặc null => translateText tự chọn random key

        const translatedContent = await performTranslation(
          ch.content || "",
          customKey,
          model
        );
        const translatedTitle = ch.title
          ? await performTranslation(ch.title, customKey, model)
          : "";

        const endTime = Date.now(); // ⏳ Kết thúc dịch chương

        console.log(
          `✅ Dịch xong chương ${index + 1}/${chapters.length} | Thời gian: ${
            (endTime - startTime) / 1000
          }s`
        );

        return {
          ...ch,
          translatedTitle,
          translated: translatedContent,
        };
      } catch (err) {
        console.error(`❌ Lỗi dịch chương ${index + 1}:`, err.message);
        return null; // nếu fail chương nào thì trả null
      }
    });

    const translatedChapters = await Promise.all(translationPromises);

    const successfulChapters = translatedChapters.filter((ch) => ch !== null);

    console.log("📦 Tổng chương dịch thành công:", successfulChapters.length);

    res.json({ chapters: successfulChapters });
  } catch (err) {
    console.error("❌ Lỗi dịch chương:", err.message);
    res.status(500).json({
      error: "Dịch thất bại. Kiểm tra lại API key hoặc nội dung.",
    });
  }
};
