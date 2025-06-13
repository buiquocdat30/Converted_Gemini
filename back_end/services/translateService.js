require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiKeyManager = require("./apiKeyManagers");
const publicModelService = require("./publicModelService");
const { translationQueue } = require('./queueManager');

// Mặc định sử dụng Gemini Pro
const DEFAULT_MODEL = "gemini-2.0-flash";

// ⏳ Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translateText = async (text, keyToUse, modelAI) => {
  console.log("✍️ Text đầu vào:", text?.slice(0, 50), "...");
  
  // Kiểm tra nếu không có modelAI thì báo lỗi
  if (!modelAI) {
    throw new Error("Thiếu thông tin modelAI.");
  }

  const currentModelAI = modelAI || "gemini-pro";

  if (!text) throw new Error("Thiếu nội dung cần dịch.");

  // Kiểm tra key
  if (!keyToUse) {
    throw new Error("Không tìm thấy key khả dụng.");
  }

  try {
    console.log("🔑 Dùng key:", keyToUse.substring(0, 8) + "...");
    const genAI = new GoogleGenerativeAI(keyToUse);
    const model = genAI.getGenerativeModel({ model: currentModelAI });

    const prompt = `Dịch nội dung sau sang tiếng Việt một cách tự nhiên, các đại từ nhân xưng phù hợp ngữ cảnh, giữ nguyên ý nghĩa, không thêm gì cả:\n\n"${text}"`;
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translated = await response.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Dịch thành công sau ${duration}s với key ${keyToUse.substring(0, 8)}...`
    );
    return translated;

  } catch (error) {
    const errorMessage = error.message || error.toString();
    console.error("⚠️ Lỗi dịch:", errorMessage);
    throw new Error(`Lỗi dịch: ${errorMessage}`);
  }
};

// Hàm thêm job vào queue
const addTranslationJob = async (chapter, apiKey, model) => {
  try {
    const job = await translationQueue.add({
      chapter,
      apiKey,
      model
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: false
    });

    return job;
  } catch (error) {
    console.error("❌ Lỗi khi thêm job vào queue:", error);
    throw error;
  }
};

// Hàm lấy trạng thái job
const getJobStatus = async (jobId) => {
  try {
    const job = await translationQueue.getJob(jobId);
    if (!job) {
      throw new Error("Không tìm thấy job");
    }

    const state = await job.getState();
    const progress = job._progress;
    const result = job.returnvalue;
    const error = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result,
      error
    };
  } catch (error) {
    console.error("❌ Lỗi khi lấy trạng thái job:", error);
    throw error;
  }
};

module.exports = {
  translateText,
  addTranslationJob,
  getJobStatus
};
