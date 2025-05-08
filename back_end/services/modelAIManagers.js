// Map tên model → thông số
const models = {
  google: {
    "gemini-1.5-pro": {
      value: "gemini-1.5-pro",
      rpm: 2,
      tpm: 32000,
      rpd: 50,
      label: "Gemini 1.5 Pro",
      description: "Giới hạn miễn phí: 2 lần/phút, 50 lần một ngày.",
    },
    "gemini-1.5-flash": {
      value: "gemini-1.5-flash",
      rpm: 15,
      tpm: 1000000,
      rpd: 1500,
      label: "Gemini 1.5 Flash",
      description: "Giới hạn miễn phí: 15 lần/phút, 1.500 lần một ngày.",
    },
    "gemini-1.5-flash-8b": {
      value: "gemini-1.5-flash-8b",
      rpm: 10,
      tpm: 250000,
      rpd: 500,
      label: "Gemini 1.5 Flash-8B",
      description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
    },
    "gemini-2.0-flash-lite": {
      value: "gemini-2.0-flash-lite",
      rpm: 5,
      tpm: 250000,
      rpd: 25,
      label: "Gemini 2.0 Flash-Lite",
      description: "Giới hạn miễn phí: 30 lần/phút, 1500 lần một ngày.",
    },
    "gemini-2.0-flash": {
      value: "gemini-2.0-flash",
      rpm: 5,
      tpm: 250000,
      rpd: 25,
      label: "Gemini 2.0 Flash",
      description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
    },
  },
};

const DEFAULT_MODEL = process.env.DEFAULT_MODEL_AI;
function getModelInfo(modelValue) {
  for (const provider in models) {
    if (models[provider][modelValue]) {
      return models[provider][modelValue];
    }
  }
  return null;
}
module.exports = {
  DEFAULT_MODEL,
  getModelInfo,
};
