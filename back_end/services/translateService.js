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

    // Cải thiện prompt để dịch hiệu quả hơn
    const prompt = `Hãy dịch đoạn văn bản sau từ tiếng Trung sang tiếng Việt một cách tự nhiên và chính xác. Giữ nguyên cấu trúc đoạn văn và ý nghĩa của nội dung:

${text}

Chỉ trả về bản dịch tiếng Việt, không thêm bất kỳ giải thích hay chú thích nào.`;

    console.log("📝 Prompt gửi đi:", prompt.substring(0, 100) + "...");
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translated = response.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("📤 Response từ API:", translated.substring(0, 100) + "...");
    console.log("📏 Độ dài text gốc:", text.length);
    console.log("📏 Độ dài text dịch:", translated.length);
    
    const isUnchanged = translated.trim() === text.trim();

    if (isUnchanged) {
      console.warn(
        `⚠️ Bản dịch không thay đổi cho key ${key.substring(0, 8)}...`
      );
      console.warn("🔍 Text gốc:", text.substring(0, 100));
      console.warn("🔍 Text dịch:", translated.substring(0, 100));
    }

    // Cập nhật thống kê sử dụng key nếu có usageId
    if (response.usageMetadata && usageId) {
      const apiKeyManager = new ApiKeyManager();
      await apiKeyManager.updateUsageStats(
        usageId,
        response.usageMetadata,
        isUserKey
      );
    }

    console.log(
      `✅ Dịch thành công sau ${duration}s với key ${key.substring(0, 8)}...`
    );
    
    // Đảm bảo luôn trả về đúng format
    const resultObj = {
      translated: translated || text, // Fallback về text gốc nếu translated rỗng
      usage: response.usageMetadata || null,
      isUnchanged: isUnchanged,
    };
    
    console.log("📋 Kết quả trả về:", {
      hasTranslated: !!resultObj.translated,
      translatedLength: resultObj.translated?.length || 0,
      isUnchanged: resultObj.isUnchanged,
      translatedPreview: resultObj.translated?.substring(0, 50) + "..."
    });
    
    return resultObj;
  } catch (error) {
    const errorMessage = error.message || error.toString();
    console.error("⚠️ Lỗi dịch:", errorMessage);
    
    // Trả về text gốc nếu có lỗi nhưng không throw error
    console.log("🔄 Trả về text gốc do lỗi dịch");
    return {
      translated: text, // Trả về text gốc
      usage: null,
      isUnchanged: true,
      error: errorMessage, // Thêm thông tin lỗi
    };
  }
};

module.exports = {
  translateText,
};
