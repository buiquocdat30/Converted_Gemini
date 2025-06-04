const prisma = require("../config/prismaConfig");

// Cache để lưu trữ dữ liệu providers và models
let providersCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

const publicModelService = {
    // Lấy tất cả providers và models của họ
    getAllProviderModels: async () => {
        try {
            // Kiểm tra cache
            if (providersCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
                console.log("📦 Sử dụng dữ liệu providers từ cache");
                return providersCache;
            }

            console.log("🔄 Đang lấy danh sách providers...");
            
            // Lấy tất cả providers
            const providers = await prisma.provider.findMany();
            console.log("📦 Danh sách providers:", providers);

            if (providers.length === 0) {
                console.log("⚠️ Không tìm thấy providers nào");
                return [];
            }

            // Lấy models cho từng provider
            const providersWithModels = await Promise.all(
                providers.map(async (provider) => {
                    // Lấy models của provider
                    const models = await prisma.model.findMany({
                        where: { providerId: provider.id },
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

                    console.log(`📚 Models của ${provider.name}:`, models);

                    // Tạo provider object với models
                    return {
                        ...provider,
                        models: models
                    };
                })
            );

            // Cập nhật cache
            providersCache = providersWithModels;
            lastFetchTime = Date.now();

            console.log("🔍 Danh sách providers với models:", providersWithModels);
            
            // Log chi tiết từng provider và models
            providersWithModels.forEach(provider => {
                console.log(`\n📌 Provider: ${provider.name}`);
                console.log(`- ID: ${provider.id}`);
                console.log(`- Số lượng models: ${provider.models.length}`);
                
                provider.models.forEach(model => {
                    console.log(`\n  Model: ${model.label} (${model.value})`);
                    console.log(`  - ID: ${model.id}`);
                    console.log(`  - ProviderId: ${model.providerId}`);
                    console.log(`  - Description: ${model.description || 'Không có'}`);
                    console.log(`  - RPM: ${model.rpm || 'Không giới hạn'}`);
                    console.log(`  - TPM: ${model.tpm || 'Không giới hạn'}`);
                    console.log(`  - RPD: ${model.rpd || 'Không giới hạn'}`);
                });
            });

            return providersWithModels;
        } catch (error) {
            console.error("❌ Lỗi khi lấy danh sách providers:", error);
            console.error("Chi tiết lỗi:", error);
            if (error.code === 'P1001') {
                throw new Error("Không thể kết nối đến database");
            } else if (error.code === 'P2025') {
                throw new Error("Không tìm thấy providers");
            } else {
                throw new Error(`Lỗi database: ${error.message}`);
            }
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

            // Chuyển đổi thành mảng phẳng các models
            const modelsList = providers.flatMap(provider => 
                provider.models.map(model => ({
                    ...model,
                    provider: provider.name
                }))
            );

            return modelsList;
        } catch (error) {
            console.error("Error getting models list:", error);
            throw error;
        }
    }
};

module.exports = publicModelService; 