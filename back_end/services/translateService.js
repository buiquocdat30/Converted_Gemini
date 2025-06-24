require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiKeyManager = require("./apiKeyManagers");
const publicModelService = require("./publicModelService");

// Mặc định sử dụng Gemini Pro
const DEFAULT_MODEL = "gemini-2.0-flash";

// ⏳ Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translateText = async (text, keyInfo, modelAI) => {
  console.log("✍️ Text đầu vào:", text?.slice(0, 50), "...");

  const { key, usageId, isUserKey } = keyInfo;
  
  // Kiểm tra nếu không có modelAI thì báo lỗi
  if (!modelAI) {
    throw new Error("Thiếu thông tin modelAI.");
  }

  const currentModelAI = modelAI || DEFAULT_MODEL;

  if (!text) throw new Error("Thiếu nội dung cần dịch.");

  // Kiểm tra key
  if (!key) {
    throw new Error("Không tìm thấy key khả dụng.");
  }

  try {
    console.log("🔑 Dùng key:", key.substring(0, 8) + "...");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: currentModelAI });

    const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, Không dùng đại từ nhân xưng, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translated = response.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Cập nhật thống kê sử dụng key nếu có usageId
    if (response.usageMetadata && usageId) {
      const apiKeyManager = new ApiKeyManager();
      await apiKeyManager.updateUsageStats(usageId, response.usageMetadata, isUserKey);
    }

    console.log(
      `✅ Dịch thành công sau ${duration}s với key ${key.substring(
        0,
        8
      )}...`
    );
    return {
      translated,
      usage: response.usageMetadata,
    };
  } catch (error) {
    const errorMessage = error.message || error.toString();
    console.error("⚠️ Lỗi dịch:", errorMessage);
    throw new Error(`Lỗi dịch: ${errorMessage}`);
  }
};

module.exports = {
  translateText,
};
