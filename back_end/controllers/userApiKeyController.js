const { prisma, toObjectId } = require("../config/prismaConfig");
const ApiKeyManager = require('../services/apiKeyManagers');

const userApiKeyController = {
    // Lấy tất cả API keys của user
    getAllKeys: async (req, res) => {
        try {
            const userId = req.user.id;
            const keyManager = new ApiKeyManager();
            const keys = await keyManager.getUserKeys(userId);
            res.json(keys);
        } catch (error) {
            console.error('Error getting API keys:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Tạo API key mới
    createKey: async (req, res) => {
        try {
            const userId = req.user.id;
            const { key, label } = req.body;
            
            if (!key) {
                return res.status(400).json({ error: 'Thiếu API key' });
            }
            
            const keyManager = new ApiKeyManager();
            const newKey = await keyManager.createUserKey(userId, key, label);
            res.status(201).json(newKey);
        } catch (error) {
            console.error('Error creating API key:', error);
            res.status(400).json({ error: error.message });
        }
    },

    // Xóa API key
    deleteKey: async (req, res) => {
        try {
            const userId = req.user.id;
            const keyId = req.params.id;
            
            if (!keyId) {
                return res.status(400).json({ error: 'Thiếu ID của key cần xóa' });
            }

            console.log(`\n🗑️ Đang xóa key ${keyId} của user ${userId}...`);
            
            const keyManager = new ApiKeyManager();
            await keyManager.deleteUserKey(userId, keyId);
            res.json({ message: 'Key đã được xóa thành công' });
        } catch (error) {
            console.error('Error deleting API key:', error);
            res.status(400).json({ error: error.message });
        }
    },

    // Cập nhật trạng thái key
    updateKeyStatus: async (req, res) => {
        try {
            const userId = req.user.id;
            const { keyId } = req.params;
            const { status } = req.body;
            
            const keyManager = new ApiKeyManager();
            const updatedKey = await keyManager.updateKeyStatus(userId, keyId, status);
            res.json(updatedKey);
        } catch (error) {
            console.error('Error updating key status:', error);
            res.status(400).json({ error: error.message });
        }
    },

    // Lấy API keys theo model
    getKeysByModel: async (req, res) => {
        try {
            const { modelId } = req.params;
            const userId = req.user.id;

            const keys = await prisma.userApiKey.findMany({
                where: {
                    userId,
                    usage: {
                        some: {
                            modelId
                        }
                    }
                },
                include: {
                    usage: {
                        where: {
                            modelId
                        },
                        include: {
                            model: true
                        }
                    }
                }
            });

            // Chuyển đổi dữ liệu để hiển thị trạng thái theo model
            const formattedKeys = keys.map(key => ({
                ...key,
                modelStatus: key.usage[0] // Lấy trạng thái cho model cụ thể
            }));

            res.json(formattedKeys);
        } catch (error) {
            console.error('Error getting API keys by model:', error);
            res.status(500).json({ error: 'Lỗi khi lấy API keys theo model' });
        }
    },

    // Lấy usage thống kê trong ngày cho user (group theo key và model)
    getTodayUsageStats: async (req, res) => {
        try {
            const userId = req.user.id;
            // Lấy mốc thời gian đầu và cuối ngày hôm nay
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            // Lấy tất cả key của user
            const keys = await prisma.userApiKey.findMany({
                where: { userId },
                select: {
                    id: true,
                    key: true,
                    label: true,
                    createdAt: true,
                    updatedAt: true,
                    usage: {
                        where: {
                            lastUsedAt: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        },
                        select: {
                            id: true,
                            modelId: true,
                            status: true,
                            usageCount: true,
                            promptTokens: true,
                            completionTokens: true,
                            totalTokens: true,
                            lastUsedAt: true,
                            model: {
                                select: {
                                    id: true,
                                    value: true,
                                    label: true
                                }
                            }
                        }
                    }
                }
            });

            // Format lại cho FE: mỗi key có mảng usage theo model trong ngày
            const result = keys.map(key => ({
                id: key.id,
                key: key.key,
                label: key.label,
                createdAt: key.createdAt,
                updatedAt: key.updatedAt,
                usage: key.usage.map(u => ({
                    id: u.id,
                    modelId: u.modelId,
                    model: u.model,
                    status: u.status,
                    usageCount: u.usageCount,
                    promptTokens: u.promptTokens,
                    completionTokens: u.completionTokens,
                    totalTokens: u.totalTokens,
                    lastUsedAt: u.lastUsedAt
                }))
            }));

            res.json(result);
        } catch (error) {
            console.error('Error getting today usage stats:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = userApiKeyController; 