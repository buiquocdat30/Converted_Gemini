// const fs = require("fs").promises;
// const path = require("path");

// const DEFAULT_KEYS = process.env.DEFAULT_GEMINI_API_KEYS
//   ? process.env.DEFAULT_GEMINI_API_KEYS.split(",")
//   : [];

// let aliveKeys = [...DEFAULT_KEYS];
// const CUSTOM_KEYS_FILE = path.join(__dirname, "../data/custom_keys.txt");

// const keyIndexes = new Map();

// //duyệt và trả key tuần tự
// const getAroundKeyFrom = (keyArray, id = "default") => {
//   if (!Array.isArray(keyArray) || keyArray.length === 0) return null;

//   const currentIndex = keyIndexes.get(id) || 0;
//   const key = keyArray[currentIndex];
//   const nextIndex = (currentIndex + 1) % keyArray.length;
//   keyIndexes.set(id, nextIndex);

//   return key;
// };

// //lưu key của khách
// const saveCustomKey = async (key) => {
//   try {
//     const filePath = CUSTOM_KEYS_FILE;
//     let existingKeys = [];

//     try {
//       const data = await fs.readFile(filePath, "utf8");
//       existingKeys = data
//         .split("\n")
//         .map((k) => k.trim())
//         .filter((k) => k.length > 0);
//     } catch (err) {
//       if (err.code !== "ENOENT") {
//         console.error("❌ Lỗi đọc custom keys:", err.message);
//       }
//     }

//     if (existingKeys.includes(key.trim())) {
//       console.log("⚡ Key đã tồn tại, bỏ qua:", key.slice(0, 8) + "...");
//       return;
//     }

//     await fs.appendFile(filePath, key.trim() + "\n");
//     console.log("📥 Đã lưu key khách mới:", key.slice(0, 8) + "...");
//   } catch (err) {
//     console.error("❌ Lỗi lưu key khách:", err.message);
//   }
// };

// module.exports = {
//   aliveKeys,
//   getAroundKeyFrom,
//   saveCustomKey,
// };

// apiKeyManager.js
const fs = require("fs").promises;
const path = require("path");
const { getModelInfo } = require("./modelAIManagers");

const CUSTOM_KEYS_FILE = path.join(__dirname, "../data/custom_keys.txt");

const DEFAULT_KEYS = process.env.DEFAULT_GEMINI_API_KEYS
  ? process.env.DEFAULT_GEMINI_API_KEYS.split(",")
  : [];

let aliveKeys = [...DEFAULT_KEYS];
const keyIndexes = new Map();

class ApiKeyManager {
  constructor(modelValue) {
    this.modelInfo = getModelInfo(modelValue);
    this.apiKeys = aliveKeys.map((key) => ({
      key,
      status: "active",
      tokenUsed: 0,
      dailyUsed: 0,
      cooldownCount: 0,
      lastUsed: 0,
    }));
    this.cooldownTime = 60000; // 1 phút
  }

  getActiveKey() {
    const available = this.apiKeys.find((k) => k.status === "active");
    if (!available) {
      throw new Error("No active API keys available.");
    }
    return available.key;
  }

  updateUsage(apiKey, tokensUsed) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj) {
      keyObj.tokenUsed += tokensUsed;
      keyObj.lastUsed = Date.now();
    }
  }

  setCooldown(apiKey) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj && keyObj.status !== "exhausted") {
      keyObj.status = "cooldown";
      keyObj.cooldownCount = (keyObj.cooldownCount || 0) + 1;
      keyObj.dailyUsed = (keyObj.dailyUsed || 0) + 1;

      setTimeout(() => {
        if (
          keyObj.status === "cooldown" &&
          keyObj.dailyUsed < this.modelInfo.rpd
        ) {
          keyObj.status = "active";
        }
      }, this.cooldownTime);
    }
  }

  exhaustKey(apiKey) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj) {
      keyObj.status = "exhausted";
    }
  }

  hasUsableKey() {
    return this.apiKeys.some((k) => k.status === "active");
  }

  getAroundKeyFrom(id = "default") {
    const keyArray = this.apiKeys
      .filter((k) => k.status === "active")
      .map((k) => k.key);
    if (!Array.isArray(keyArray) || keyArray.length === 0) return null;

    const currentIndex = keyIndexes.get(id) || 0;
    const key = keyArray[currentIndex];
    const nextIndex = (currentIndex + 1) % keyArray.length;
    keyIndexes.set(id, nextIndex);

    return key;
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
