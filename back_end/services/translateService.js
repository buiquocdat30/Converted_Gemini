const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiKeyManagers = require("./apiKeyManagers.js"); // 👈 Import ApiKeyManager

const DEFAULT_KEYS = process.env.DEFAULT_GEMINI_API_KEYS
  ? process.env.DEFAULT_GEMINI_API_KEYS.split(",")
  : [];

const apiKeyManager = new ApiKeyManagers(DEFAULT_KEYS);
// console.log('Đây là apiKeyManager: ',apiKeyManager)
const DEFAULT_MODEL = process.env.DEFAULT_MODEL_AI;
const CUSTOM_KEYS_FILE = path.join(__dirname, "../data/custom_keys.txt");

// Hàm lưu key khách
const saveCustomKey = async (key) => {
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
      console.log("⚡ Key đã tồn tại trong kho, bỏ qua:", key.slice(0, 8) + "...");
      return;
    }

    await fs.appendFile(filePath, key.trim() + "\n");
    console.log("📥 Đã lưu key khách mới vào kho:", key.slice(0, 8) + "...");
  } catch (err) {
    console.error("❌ Lỗi lưu key khách:", err.message);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hàm dịch text với retry thông minh
const translateText = async (text, customKey, modelAI) => {
  console.log("✍️ Text đầu vào:", text?.slice(0, 50), "...");

  const currentModelAI = modelAI || DEFAULT_MODEL;
  if (!text) throw new Error("Thiếu nội dung cần dịch.");

  let keyToUse = customKey || null;
  let isCustomKey = !!customKey;

  if (!keyToUse) {
    if (!apiKeyManager.hasUsableKey()) throw new Error("Không còn API Key mặc định khả dụng.");
    keyToUse = apiKeyManager.getActiveKey();
  }

  let retryAttempts = 0;
  const maxRetryAttempts = 5;

  while (retryAttempts < maxRetryAttempts) {
    try {
      console.log("🔑 Đang dùng API Key:", keyToUse.slice(0, 8) + "...");
      const genAI = new GoogleGenerativeAI(keyToUse);
      const model = genAI.getGenerativeModel({ model: currentModelAI });

      const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;
      const startTime = Date.now();
      const result = await model.generateContent(prompt);
      const response = await result.response;

      console.log('KQ Res usageMetadata.cachedContentTokenCount', response.usageMetadata.cachedContentTokenCount);
      console.log('KQ Res usageMetadata.candidatesTokenCount', response.usageMetadata.candidatesTokenCount);

      const translated = await response.text();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(
        `✅ Dịch thành công sau ${duration}s với key: ${keyToUse.slice(0, 8)}...`
      );

      // Cập nhật usage nếu dùng key mặc định
      if (!isCustomKey) {
        apiKeyManager.updateUsage(keyToUse, 
          (response.usageMetadata.cachedContentTokenCount || 0) +
          (response.usageMetadata.candidatesTokenCount || 0)
        );
      }

      return translated;
    } catch (error) {
      const errorMessage = error.message || error.toString();
      console.error("⚠️ Lỗi dịch:", errorMessage);

      if (
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("quotaMetric")
      ) {
        const retryDelayMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
        let retryDelay = 21000;
        if (retryDelayMatch && retryDelayMatch[1]) {
          retryDelay = parseInt(retryDelayMatch[1]) * 1000;
        }

        console.log(
          `⏳ Key ${keyToUse.slice(0, 8)}... bị giới hạn tốc độ. Chờ ${retryDelay / 1000}s rồi thử lại...`
        );
        await delay(retryDelay);
        retryAttempts++;
        console.log(`🔄 Thử lại lần ${retryAttempts}/${maxRetryAttempts}`);
        continue;
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("quota")
      ) {
        if (isCustomKey) {
          throw new Error(`❌ Key khách ${keyToUse.slice(0, 8)}... đã hết quota hoặc lỗi permission. Dừng dịch.`);
        } else {
          console.log(`❌ Xóa key lỗi: ${keyToUse.slice(0, 8)}...`);
          apiKeyManager.exhaustKey(keyToUse);
          if (!apiKeyManager.hasUsableKey()) {
            throw new Error("Hết API Key khả dụng. Dịch thất bại.");
          }
          keyToUse = apiKeyManager.getActiveKey();
          retryAttempts = 0;
          continue;
        }
      }

      // Các lỗi khác
      throw new Error(`Lỗi dịch: ${errorMessage}`);
    }
  }

  throw new Error("Dịch thất bại sau nhiều lần thử. Vui lòng thử lại sau.");
};

module.exports = { translateText };



