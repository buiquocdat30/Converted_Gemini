// translateService.js
require("dotenv").config(); // nên đặt trên cùng

const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_KEY = process.env.DEFAULT_GEMINI_API_KEY;

const translateText = async (text, key) => {
  const apiKey = key || DEFAULT_KEY;
  console.log("📌 API KEY:", apiKey ? "OK" : "MISSING");

  if (!text || !apiKey) {
    throw new Error("Thiếu nội dung hoặc API key không hợp lệ.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  //coi listmodel
  async function listModels() {
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${DEFAULT_KEY}`
      );

      response.data.models.forEach((model) => {
        console.log(`✅ Model ID: ${model.name}`);
      });
    } catch (error) {
      console.error(
        "❌ Failed to fetch models:",
        error.response?.data || error.message
      );
    }
  }

  listModels();

  // const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // 🔄 Đổi sang flash

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
  }); // 🔄 Đổi sang flash

  const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;

  const result = await model.generateContent(prompt);
  console.log("📌 KQ dịch:", result || "MISSING");

  const response = await result.response;
  console.log("📌 KQ res:", response || "MISSING");

  const translated = await response.text();
  console.log("📌 KQ translate:", translated || "MISSING");

  return translated;
};

module.exports = { translateText };
