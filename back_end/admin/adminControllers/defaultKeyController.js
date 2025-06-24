// controllers/defaultKeyController.js
const { prisma, toObjectId } = require('../../config/prismaConfig');
const ApiKeyManager = require('../../services/apiKeyManagers');

const defaultKeyController = {
  // Lấy tất cả default keys
  async getAllDefaultKeys(req, res) {
    try {
      const defaultKeys = await prisma.defaultKey.findMany({
        include: {
          usage: {
            include: {
              model: {
                include: {
                  provider: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: defaultKeys
      });
    } catch (error) {
      console.error('Lỗi khi lấy default keys:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách default keys'
      });
    }
  },

  // Tạo default key mới
  async createDefaultKey(req, res) {
    try {
      const { key, modelValues, label } = req.body;

      if (!key || !modelValues || !Array.isArray(modelValues) || modelValues.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin key hoặc danh sách models'
        });
      }

      const apiKeyManager = new ApiKeyManager();
      const result = await apiKeyManager.createDefaultKey(key, modelValues, label);

      res.status(201).json({
        success: true,
        message: 'Tạo default key thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi khi tạo default key:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi server khi tạo default key'
      });
    }
  },

  // Cập nhật default key
  async updateDefaultKey(req, res) {
    try {
      const { id } = req.params;
      const { label } = req.body;

      const updatedKey = await prisma.defaultKey.update({
        where: { id: toObjectId(id) },
        data: {
          label,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Cập nhật default key thành công',
        data: updatedKey
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật default key:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật default key'
      });
    }
  },

  // Xóa default key
  async deleteDefaultKey(req, res) {
    try {
      const { id } = req.params;

      const apiKeyManager = new ApiKeyManager();
      await apiKeyManager.deleteDefaultKey(toObjectId(id));

      res.json({
        success: true,
        message: 'Xóa default key thành công'
      });
    } catch (error) {
      console.error('Lỗi khi xóa default key:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi server khi xóa default key'
      });
    }
  },

  // Lấy usage của default key
  async getDefaultKeyUsage(req, res) {
    try {
      const { id } = req.params;

      const usage = await prisma.defaultKeyUsage.findMany({
        where: {
          defaultKeyId: toObjectId(id)
        },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Lỗi khi lấy usage của default key:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin usage'
      });
    }
  }
};

module.exports = defaultKeyController;