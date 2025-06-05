const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userApiKeyController = {
    // Lấy tất cả API keys của user
    getAllKeys: async (req, res) => {
        try {
            const userId = req.user.id;
            const keys = await prisma.userApiKey.findMany({
                where: { userId },
                include: { 
                    models: {
                        include: {
                            model: true
                        }
                    }
                }
            });

            // Chuyển đổi dữ liệu để hiển thị trạng thái theo từng model
            const formattedKeys = keys.map(key => ({
                ...key,
                models: key.models.map(modelStatus => ({
                    ...modelStatus.model,
                    status: modelStatus.status,
                    usageCount: modelStatus.usageCount,
                    lastUsedAt: modelStatus.lastUsedAt
                }))
            }));

            res.json(formattedKeys);
        } catch (error) {
            console.error('Error getting API keys:', error);
            res.status(500).json({ error: 'Lỗi khi lấy danh sách API keys' });
        }
    },

    // Tạo API key mới
    createKey: async (req, res) => {
        try {
            const userId = req.user.id;
            const { key, modelIds, label } = req.body;

            // Kiểm tra key đã tồn tại chưa
            const existingKey = await prisma.userApiKey.findFirst({
                where: {
                    userId,
                    key
                }
            });

            if (existingKey) {
                return res.status(400).json({ error: 'API key đã tồn tại' });
            }

            // Tạo key mới với các model được chọn
            const newKey = await prisma.userApiKey.create({
                data: {
                    key,
                    label,
                    user: {
                        connect: {
                            id: userId
                        }
                    },
                    models: {
                        create: modelIds.map(modelId => ({
                            model: {
                                connect: {
                                    id: modelId
                                }
                            },
                            status: "ACTIVE",
                            usageCount: 0
                        }))
                    }
                },
                include: { 
                    models: {
                        include: {
                            model: true
                        }
                    }
                }
            });

            res.status(201).json(newKey);
        } catch (error) {
            console.error('Error creating API key:', error);
            res.status(500).json({ error: 'Lỗi khi tạo API key' });
        }
    },

    // Cập nhật trạng thái API key cho một model cụ thể
    updateKeyStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { modelId, status } = req.body;
            const userId = req.user.id;

            const updatedKey = await prisma.userApiKeyToModel.updateMany({
                where: {
                    userApiKeyId: id,
                    modelId,
                    userApiKey: {
                        userId // Đảm bảo user chỉ có thể cập nhật key của mình
                    }
                },
                data: {
                    status,
                    updatedAt: new Date()
                }
            });

            if (updatedKey.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy API key hoặc model' });
            }

            res.json({ message: 'Cập nhật trạng thái API key thành công' });
        } catch (error) {
            console.error('Error updating API key status:', error);
            res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái API key' });
        }
    },

    // Xóa API key
    deleteKey: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const deletedKey = await prisma.userApiKey.deleteMany({
                where: {
                    id,
                    userId // Đảm bảo user chỉ có thể xóa key của mình
                }
            });

            if (deletedKey.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy API key' });
            }

            res.json({ message: 'Xóa API key thành công' });
        } catch (error) {
            console.error('Error deleting API key:', error);
            res.status(500).json({ error: 'Lỗi khi xóa API key' });
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
                    models: {
                        some: {
                            modelId
                        }
                    }
                },
                include: {
                    models: {
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
                modelStatus: key.models[0] // Lấy trạng thái cho model cụ thể
            }));

            res.json(formattedKeys);
        } catch (error) {
            console.error('Error getting API keys by model:', error);
            res.status(500).json({ error: 'Lỗi khi lấy API keys theo model' });
        }
    }
};

module.exports = userApiKeyController; 