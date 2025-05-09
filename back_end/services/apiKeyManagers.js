const fs = require("fs").promises;
const path = require("path");
const { getModelInfo } = require("./modelAIManagers");

const CUSTOM_KEYS_FILE = path.join(__dirname, "../data/custom_keys.txt");

const DEFAULT_KEYS = process.env.DEFAULT_GEMINI_API_KEYS
  ? process.env.DEFAULT_GEMINI_API_KEYS.split(",")
  : [];

const keyIndexes = new Map();

class ApiKeyManager {
  constructor(modelValue) {
    this.modelInfo = getModelInfo(modelValue);
    this.apiKeys = DEFAULT_KEYS.map((key) => ({
      key,
      status: "active",
      tokenUsed: 0,
      dailyUsed: 0,
      cooldownStart: null,
      lastUsed: 0,
    }));
    this.cooldownDuration = 60000; // 1 phút
  }

  // Cập nhật trạng thái key: active / cooldown / exhausted
  syncKeysByModel() {
    const now = Date.now();

    for (let keyObj of this.apiKeys) {
      // Nếu đang cooldown, kiểm tra xem đã hết thời gian chưa
      if (keyObj.status === "cooldown") {
        const elapsed = now - (keyObj.cooldownStart || 0);
        if (elapsed >= this.cooldownDuration && keyObj.dailyUsed < this.modelInfo.rpd) {
          keyObj.status = "active";
          keyObj.cooldownStart = null;
        }
      }

      // Nếu đã đạt giới hạn ngày → exhausted
      if (keyObj.dailyUsed >= this.modelInfo.rpd) {
        keyObj.status = "exhausted";
      }

      // Nếu đang exhausted mà reset (giả sử sang ngày mới), có thể xử lý ở nơi khác
    }
  }

  // Trả key vòng tròn từ danh sách active
  getAroundKeyFrom(id = "default") {
    this.syncKeysByModel();

    const activeKeys = this.apiKeys.filter((k) => k.status === "active");
    if (activeKeys.length === 0) return null;

    const currentIndex = keyIndexes.get(id) || 0;
    const key = activeKeys[currentIndex % activeKeys.length].key;
    keyIndexes.set(id, (currentIndex + 1) % activeKeys.length);

    return key;
  }

  // Sau khi gọi xong → update số token dùng
  updateUsage(apiKey, tokensUsed = 0) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj) {
      keyObj.tokenUsed += tokensUsed;
      keyObj.dailyUsed += 1;
      keyObj.lastUsed = Date.now();
    }
  }

  // Khi gặp lỗi 429 → đẩy key vào cooldown
  handle429Error(apiKey) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj && keyObj.status !== "exhausted") {
      keyObj.status = "cooldown";
      keyObj.cooldownStart = Date.now();
      console.log(`🔁 Key ${apiKey.slice(0, 8)}... đã vào cooldown do lỗi 429`);
    }
  }

  hasUsableKey() {
    this.syncKeysByModel();
    return this.apiKeys.some((k) => k.status === "active");
  }

  async saveCustomKey(key) {
    try {
      const filePath = CUSTOM_KEYS_FILE;
      let existingKeys = [];

      try {
        const data = await fs.readFile(filePath, "utf8");
        existingKeys = data
          .split("\n")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("❌ Lỗi đọc custom keys:", err.message);
        }
      }

      if (existingKeys.includes(key.trim())) {
        console.log("⚡ Key đã tồn tại, bỏ qua:", key.slice(0, 8) + "...");
        return;
      }

      await fs.appendFile(filePath, key.trim() + "\n");
      console.log("📥 Đã lưu key khách mới:", key.slice(0, 8) + "...");
    } catch (err) {
      console.error("❌ Lỗi lưu key khách:", err.message);
    }
  }
}

module.exports = ApiKeyManager;
