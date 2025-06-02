const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userApiKeyController = {
    // Lấy tất cả API keys của user
    getAllKeys: async (req, res) => {
        try {
            const userId = req.user.id;
            const keys = await prisma.userApiKey.findMany({
                where: { userId },
                include: { model: true }
            });
            res.json(keys);
        } catch (error) {
            console.error('Error getting API keys:', error);
            res.status(500).json({ error: 'Lỗi khi lấy danh sách API keys' });
        }
    },

    // Tạo API key mới
    createKey: async (req, res) => {
        try {
            const userId = req.user.id;
            const { key, modelId, label } = req.body;

            // Kiểm tra key đã tồn tại chưa (chỉ kiểm tra userId và key)
            const existingKey = await prisma.userApiKey.findFirst({
                where: {
                    userId,
                    key
                }
            });

            if (existingKey) {
                return res.status(400).json({ error: 'API key đã tồn tại' });
            }

            const newKey = await prisma.userApiKey.create({
                data: {
                    key,
                    modelId,
                    label,
                    user: {
                        connect: {
                            id: userId
                        }
                    }
                },
                include: { 
                    model: true,
                    user: true 
                }
            });

            res.status(201).json(newKey);
        } catch (error) {
            console.error('Error creating API key:', error);
            res.status(500).json({ error: 'Lỗi khi tạo API key' });
        }
    },

    // Cập nhật API key
    updateKey: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { label, status } = req.body;

            const updatedKey = await prisma.userApiKey.updateMany({
                where: {
                    id,
                    userId // Đảm bảo user chỉ có thể cập nhật key của mình
                },
                data: {
                    label,
                    status,
                    updatedAt: new Date()
                }
            });

            if (updatedKey.count === 0) {
                return res.status(404).json({ error: 'Không tìm thấy API key' });
            }

            res.json({ message: 'Cập nhật API key thành công' });
        } catch (error) {
            console.error('Error updating API key:', error);
            res.status(500).json({ error: 'Lỗi khi cập nhật API key' });
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
                    modelId
                },
                include: { model: true }
            });

            res.json(keys);
        } catch (error) {
            console.error('Error getting API keys by model:', error);
            res.status(500).json({ error: 'Lỗi khi lấy API keys theo model' });
        }
    }
};

module.exports = userApiKeyController; 