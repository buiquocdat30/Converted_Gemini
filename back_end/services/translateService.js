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
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 🔄 Đổi sang flash

  const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;

  const result = await model.generateContent(prompt);
  console.log("📌 KQ dich:", result ? ("OK",result) : "MISSING");
  const response = await result.response;
  console.log("📌 KQ res:", response ?  ("OK",response): "MISSING");
  const translated = response.text();
  console.log("📌 KQ translate:", translated ?  ("OK",translated): "MISSING");
  return translated;
};

module.exports = { translateText };
