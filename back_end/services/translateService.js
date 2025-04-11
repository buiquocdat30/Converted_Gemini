// translateService.js
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_KEY = process.env.DEFAULT_GEMINI_API_KEY;

const translateText = async (text, key) => {
  const apiKey = key || DEFAULT_KEY;

  if (!text || !apiKey) {
    throw new Error("Thiếu nội dung hoặc API key không hợp lệ.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const translated = response.text();

  return translated;
};

module.exports = { translateText };
