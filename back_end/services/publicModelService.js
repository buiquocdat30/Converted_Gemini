const {prisma} = require("../config/prismaConfig");

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

                return providersCache;
            }

            
            // Lấy tất cả providers
            const providers = await prisma.provider.findMany();
            

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