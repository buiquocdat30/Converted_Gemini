const { prisma, toObjectId } = require("../../config/prismaConfig");

const apiKeyController = {
    // Lấy tất cả API keys
    getAllKeys: async (req, res) => {
        try {
            const keys = await prisma.userApiKey.findMany({
                include: {
                    user: true,
                    model: true
                }
            });
            res.json(keys);
        } catch (error) {
            console.error('Error getting API keys:', error);
            res.status(500).json({ error: 'Lỗi khi lấy danh sách API keys' });
        }
    },

    // Lấy API key theo ID
    getKeyById: async (req, res) => {
        try {
            const { id } = req.params;
            const key = await prisma.userApiKey.findUnique({
                where: { id },
                include: {
                    user: true,
                    model: true
                }
            });
            if (!key) {
                return res.status(404).json({ error: 'Không tìm thấy API key' });
            }
            res.json(key);
        } catch (error) {
            console.error('Error getting API key:', error);
            res.status(500).json({ error: 'Lỗi khi lấy thông tin API key' });
        }
    },

    // Cập nhật trạng thái API key
    updateKeyStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const updatedKey = await prisma.userApiKey.update({
                where: { id },
                data: { status }
            });
            res.json(updatedKey);
        } catch (error) {
            console.error('Error updating API key:', error);
            res.status(500).json({ error: 'Lỗi khi cập nhật API key' });
        }
    },

    // Xóa API key
    deleteKey: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.userApiKey.delete({
                where: { id }
            });
            res.json({ message: 'Xóa API key thành công' });
        } catch (error) {
            console.error('Error deleting API key:', error);
            res.status(500).json({ error: 'Lỗi khi xóa API key' });
        }
    },

    // Lấy thống kê sử dụng API key
    getKeyStats: async (req, res) => {
        try {
            const stats = await prisma.userApiKey.groupBy({
                by: ['status'],
                _count: true
            });
            res.json(stats);
        } catch (error) {
            console.error('Error getting API key stats:', error);
            res.status(500).json({ error: 'Lỗi khi lấy thống kê API key' });
        }
    }
};

module.exports = apiKeyController; 