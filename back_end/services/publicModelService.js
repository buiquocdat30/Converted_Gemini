const prisma = require("../config/prismaConfig");

// Cache để lưu trữ dữ liệu models
let modelsCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

const publicModelService = {
    // Lấy tất cả providers
    getActiveProviders: async () => {
        try {
            console.log("🔄 Đang lấy danh sách providers...");
            
            const providers = await prisma.provider.findMany({
                include: {
                    models: {
                        select: {
                            id: true,
                            value: true,
                            label: true,
                            description: true,
                            rpm: true,
                            tpm: true,
                            rpd: true
                        }
                    }
                }
            });

            console.log(`✅ Đã lấy được ${providers.length} providers`);
            console.log("📊 Thông tin chi tiết:", JSON.stringify(providers, null, 2));
            return providers;
        } catch (error) {
            console.error("❌ Lỗi khi lấy danh sách providers:", error);
            if (error.code === 'P1001') {
                throw new Error("Không thể kết nối đến database");
            } else if (error.code === 'P2025') {
                throw new Error("Không tìm thấy providers");
            } else {
                throw new Error(`Lỗi database: ${error.message}`);
            }
        }
    },

    // Lấy tất cả models từ tất cả providers
    getAllModels: async () => {
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

            return formattedModels;
        } catch (error) {
            console.error("❌ Lỗi khi tải dữ liệu models:", error);
            throw error;
        }
    },

    // Lấy models theo provider
    getModelsByProvider: async (providerId) => {
        try {
            return await prisma.model.findMany({
                where: {
                    providerId: providerId
                },
                select: {
                    id: true,
                    value: true,
                    label: true,
                    description: true,
                    rpm: true,
                    tpm: true,
                    rpd: true
                }
            });
        } catch (error) {
            console.error("Error getting models by provider:", error);
            throw error;
        }
    },

    // Lấy thông tin chi tiết của một model
    getModelInfo: async (modelValue) => {
        try {
            const modelInfo = await prisma.model.findFirst({
                where: {
                    value: modelValue
                },
                include: {
                    provider: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!modelInfo) {
                return null;
            }

            return {
                ...modelInfo,
                provider: modelInfo.provider.name
            };
        } catch (error) {
            console.error("Error getting model info:", error);
            throw error;
        }
    },

    // Lấy danh sách tất cả models dạng phẳng
    getModelsList: async () => {
        try {
            const models = await prisma.model.findMany({
                include: {
                    provider: {
                        select: {
                            name: true
                        }
                    }
                }
            });

            return models.map(model => ({
                id: model.id,
                value: model.value,
                label: model.label,
                description: model.description,
                rpm: model.rpm,
                tpm: model.tpm,
                rpd: model.rpd,
                provider: model.provider.name
            }));
        } catch (error) {
            console.error("Error getting models list:", error);
            throw error;
        }
    }
};

module.exports = publicModelService; 