const prisma = require("../config/prismaConfig");

const DEFAULT_MODEL = process.env.DEFAULT_MODEL_AI || "gemini-1.5-pro";

// Cache để lưu trữ dữ liệu models
let modelsCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

// Hàm lấy tất cả models từ database
async function getAllModels() {
  try {
    // Kiểm tra cache
    if (modelsCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      console.log("📦 Sử dụng dữ liệu models từ cache");
      return modelsCache;
    }

    console.log("🔄 Đang tải dữ liệu models từ database...");

    // Lấy tất cả providers và models
    const providers = await prisma.provider.findMany({
      include: {
        models: true
      }
    });

    console.log("📊 Số lượng providers tìm thấy:", providers.length);
    providers.forEach(provider => {
      console.log(`Provider ${provider.name} có ${provider.models.length} models`);
    });

    // Chuyển đổi dữ liệu thành định dạng mong muốn
    const formattedModels = {};
    providers.forEach(provider => {
      formattedModels[provider.name] = {};
      provider.models.forEach(model => {
        formattedModels[provider.name][model.value] = {
          value: model.value,
          rpm: model.rpm,
          tpm: model.tpm,
          rpd: model.rpd,
          label: model.label,
          description: model.description
        };
      });
    });

    // Cập nhật cache
    modelsCache = formattedModels;
    lastFetchTime = Date.now();

    console.log("✅ Đã tải dữ liệu models thành công");
    return formattedModels;
  } catch (error) {
    console.error("❌ Lỗi khi tải dữ liệu models:", error);
    return null;
  }
}

// Hàm lấy thông tin model từ database
async function getModelInfo(modelValue) {
  try {
    console.log("🔍 Đang tìm kiếm thông tin model:", modelValue);

    // Đầu tiên tìm provider Google
    const googleProvider = await prisma.provider.findFirst({
      where: { name: "google" }
    });

    console.log('📌 Thông tin provider Google:', googleProvider);

    if (!googleProvider) {
      console.log("⚠️ Không tìm thấy provider Google trong database");
      return null;
    }

    // Kiểm tra tất cả models của provider
    const allProviderModels = await prisma.model.findMany({
      where: { providerId: googleProvider.id }
    });
    console.log('📚 Danh sách models của Google:', allProviderModels.map(m => m.value));

    // Sau đó tìm model cụ thể
    const modelInfo = await prisma.model.findFirst({
      where: {
        providerId: googleProvider.id,
        value: modelValue
      }
    });

    console.log('🔎 Kết quả tìm kiếm model:', modelInfo);

    if (!modelInfo) {
      console.log("⚠️ Không tìm thấy model trong database");
      return null;
    }

    // Thêm thông tin provider vào kết quả
    const result = {
      ...modelInfo,
      provider: { name: "google" }
    };

    console.log("✅ Đã tìm thấy thông tin model:", result);
    return result;
  } catch (error) {
    console.error(
      `❌ Lỗi khi lấy thông tin model với value ${modelValue}:`,
      error
    );
    return null;
  }
}

// Hàm lấy danh sách tất cả models
async function getModelsList() {
  const models = await getAllModels();
  if (!models) return [];

  const modelsList = [];
  Object.entries(models).forEach(([provider, providerModels]) => {
    Object.values(providerModels).forEach(model => {
      modelsList.push({
        ...model,
        provider
      });
    });
  });

  return modelsList;
}

module.exports = {
  DEFAULT_MODEL,
  getModelInfo,
  getAllModels,
  getModelsList
};