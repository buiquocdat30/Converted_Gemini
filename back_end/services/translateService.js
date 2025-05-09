// require("dotenv").config();
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const {
//   aliveKeys,
//   getAroundKeyFrom,
//   saveCustomKey,
// } = require("./apiKeyManagers");
// const { DEFAULT_MODEL } = require("./modelAIManagers");

// // ⏳ Delay helper
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // 🎯 Hàm chính
// const translateText = async (text, customKey, modelAI) => {
//   console.log("✍️ Text đầu vào:", text?.slice(0, 50), "...");

//   const currentModelAI = modelAI || DEFAULT_MODEL;
//   if (!text) throw new Error("Thiếu nội dung cần dịch.");

//   // --- Chọn key ---
//   let keyToUse;
//   if (typeof customKey === "string" && customKey.trim()) {
//     keyToUse = customKey.trim();
//     if (!aliveKeys.includes(keyToUse)) {
//       await saveCustomKey(keyToUse); // Lưu nếu chưa có trong default
//     }
//   } else if (Array.isArray(customKey) && customKey.length > 0) {
//     // Duyệt qua từng key trong mảng customKey
//     for (const key of customKey) {
//       const trimmedKey = key.trim();
//       if (trimmedKey && !aliveKeys.includes(trimmedKey)) {
//         await saveCustomKey(trimmedKey); // Lưu key nếu chưa có
//       }
//     }
//     keyToUse = getAroundKeyFrom(customKey, "custom");
//   } else {
//     keyToUse = getAroundKeyFrom(aliveKeys, "alive");
//   }

//   if (!keyToUse) throw new Error("Không còn API Key nào khả dụng.");

//   let retryAttempts = 0;
//   const maxRetryAttempts = 5;

//   while (retryAttempts < maxRetryAttempts) {
//     try {
//       console.log("🔑 Dùng key:", keyToUse.slice(0, 8) + "...");
//       const genAI = new GoogleGenerativeAI(keyToUse);
//       const model = genAI.getGenerativeModel({ model: currentModelAI });

//       const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;
//       const startTime = Date.now();
//       const result = await model.generateContent(prompt);
//       const response = await result.response;
//       const translated = await response.text();
//       const duration = ((Date.now() - startTime) / 1000).toFixed(2);

//       console.log(
//         `✅ Dịch thành công sau ${duration}s với key ${keyToUse.slice(0, 8)}...`
//       );
//       return translated;
//     } catch (error) {
//       const errorMessage = error.message || error.toString();
//       console.error("⚠️ Lỗi dịch:", errorMessage);

//       if (
//         errorMessage.includes("Too Many Requests") ||
//         errorMessage.includes("quotaMetric")
//       ) {
//         const retryDelayMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
//         let retryDelay = retryDelayMatch
//           ? parseInt(retryDelayMatch[1]) * 1000
//           : 21000;

//         console.log(`⏳ Chờ ${retryDelay / 1000}s vì giới hạn quota...`);
//         await delay(retryDelay);
//         retryAttempts++;
//         continue;
//       }

//       if (
//         errorMessage.includes("API key") ||
//         errorMessage.includes("permission") ||
//         errorMessage.includes("quota")
//       ) {
//         console.log(`❌ Loại key lỗi: ${keyToUse.slice(0, 8)}...`);
//         const index = aliveKeys.indexOf(keyToUse);
//         if (index !== -1) aliveKeys.splice(index, 1);

//         keyToUse = getAroundKeyFrom(aliveKeys, "alive");
//         if (!keyToUse) throw new Error("Hết API Key khả dụng.");
//         retryAttempts = 0;
//         continue;
//       }

//       throw new Error(`Lỗi dịch: ${errorMessage}`);
//     }
//   }

//   throw new Error("Dịch thất bại sau nhiều lần thử.");
// };

// module.exports = {
//   translateText,
// };

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const  ApiKeyManager = require("./apiKeyManagers");
const { DEFAULT_MODEL } = require("./modelAIManagers");

// ⏳ Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translateText = async (text, customKey, modelAI) => {
  console.log("✍️ Text đầu vào:", text?.slice(0, 50), "...");
  // Kiểm tra nếu không có modelAI thì báo lỗi
  if (!modelAI) {
    throw new Error("Thiếu thông tin modelAI.");
  }

  const currentModelAI = modelAI || DEFAULT_MODEL;

  // Khởi tạo ApiKeyManager khi đã có modelAI
  const apiKeyManager = new ApiKeyManager(currentModelAI);

  if (!text) throw new Error("Thiếu nội dung cần dịch.");

  // --- Chọn key ---
  let keyToUse;

  // Xử lý key tùy chỉnh (customKey) nếu có
  if (typeof customKey === "string" && customKey.trim()) {
    keyToUse = customKey.trim();
    if (!apiKeyManager.aliveKeys.includes(keyToUse)) {
      await apiKeyManager.saveCustomKey(keyToUse); // Lưu nếu chưa có trong default
    }
  } else if (Array.isArray(customKey) && customKey.length > 0) {
    // Duyệt qua từng key trong mảng customKey
    for (const key of customKey) {
      const trimmedKey = key.trim();
      if (trimmedKey && !apiKeyManager.aliveKeys.includes(trimmedKey)) {
        await apiKeyManager.saveCustomKey(trimmedKey); // Lưu key nếu chưa có
      }
    }
    keyToUse = apiKeyManager.getAroundKeyFrom(customKey, "custom");
  } else {
    keyToUse = apiKeyManager.getAroundKeyFrom(apiKeyManager.aliveKeys, "alive");
  }

  if (!keyToUse) throw new Error("Không còn API Key nào khả dụng.");

  let retryAttempts = 0;
  const maxRetryAttempts = 5;

  while (retryAttempts < maxRetryAttempts) {
    try {
      console.log("🔑 Dùng key:", keyToUse.slice(0, 8) + "...");
      const genAI = new GoogleGenerativeAI(keyToUse);
      const model = genAI.getGenerativeModel({ model: currentModelAI });

      const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;
      const startTime = Date.now();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translated = await response.text();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(
        `✅ Dịch thành công sau ${duration}s với key ${keyToUse.slice(0, 8)}...`
      );
      return translated;
    } catch (error) {
      const errorMessage = error.message || error.toString();
      console.error("⚠️ Lỗi dịch:", errorMessage);

      if (
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("quotaMetric")
      ) {
        const retryDelayMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
        let retryDelay = retryDelayMatch
          ? parseInt(retryDelayMatch[1]) * 1000
          : 21000;

        console.log(`⏳ Chờ ${retryDelay / 1000}s vì giới hạn quota...`);
        apiKeyManager.handle429Error(keyToUse);
        await delay(retryDelay);
        retryAttempts++;
        continue;
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("quota")
      ) {
        console.log(`❌ Loại key lỗi: ${keyToUse.slice(0, 8)}...`);
        apiKeyManager.exhaustKey(keyToUse); // Đánh dấu key hết quota

        keyToUse = apiKeyManager.getAroundKeyFrom(
          apiKeyManager.aliveKeys,
          "alive"
        );
        if (!keyToUse) throw new Error("Hết API Key khả dụng.");
        retryAttempts = 0;
        continue;
      }

      throw new Error(`Lỗi dịch: ${errorMessage}`);
    }
  }

  throw new Error("Dịch thất bại sau nhiều lần thử.");
};

module.exports = {
  translateText,
};
