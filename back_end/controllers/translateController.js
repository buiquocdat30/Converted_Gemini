const { myQueue } = require('../utils/queue');
const ApiKeyManager = require("../services/apiKeyManagers");

exports.translateText = async (req, res) => {
  const { chapters, userKey, userKeys, model, storyId } = req.body;
  const userId = req.user?.id || "anonymous";
  console.log("[API] Nhận yêu cầu dịch:", { storyId, userId, model, chapters: chapters?.length });

  // Validate input
  if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
    return res.status(400).json({ error: "Thiếu danh sách chương cần dịch." });
  }
  if (!model) {
    return res.status(400).json({ error: "Thiếu thông tin model." });
  }

  // Lấy key khả dụng
    const keyManager = new ApiKeyManager();
    let keysToUse = [];
    if (userKeys && Array.isArray(userKeys) && userKeys.length > 0) {
      keysToUse = userKeys;
    } else if (userKey) {
      keysToUse = [userKey];
    }
    const keyToUse = await keyManager.getKeyToUse(userId, keysToUse, model);
    if (!keyToUse) {
    return res.status(400).json({ error: "Không có key khả dụng." });
  }

  // Đưa từng chương vào queue
  let count = 0;
  for (const ch of chapters) {
    await myQueue.add('translate-chapter', {
      chapter: ch,
      model,
      apiKey: keyToUse,
      storyId,
      userId,
    });
    count++;
    console.log(`[QUEUE] Đã thêm chương ${ch.chapterNumber || count} vào queue`);
  }

  // Trả về response ngay, không trả kết quả dịch chương
  res.json({ success: true, message: `Đã đưa ${count} chương vào hàng đợi` });
};

// Thêm job vào hàng đợi BullMQ (ví dụ demo)
exports.addJobToQueue = async (req, res) => {
  try {
    const { storyId, chapterNumber, content } = req.body;
    await myQueue.add('translate-chapter', { storyId, chapterNumber, content });
    res.json({ success: true, message: 'Đã thêm job dịch chương vào hàng đợi!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi thêm job vào queue', error: err.message });
  }
};
