// controllers/providerController.js
const { prisma, toObjectId } = require('../../config/prismaConfig');

const providerController = {
  // Lấy tất cả providers
  async getAllProviders(req, res) {
    try {
      const providers = await prisma.provider.findMany({
        include: {
          models: {
            orderBy: {
              label: 'asc'
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      console.error('Lỗi khi lấy providers:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách providers'
      });
    }
  },

  // Tạo provider mới
  async createProvider(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tên provider'
        });
      }

      // Kiểm tra provider đã tồn tại
      const existingProvider = await prisma.provider.findFirst({
        where: { name }
      });

      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'Provider đã tồn tại'
        });
      }

      const newProvider = await prisma.provider.create({
        data: {
          name
        }
      });

      res.status(201).json({
        success: true,
        message: 'Tạo provider thành công',
        data: newProvider
      });
    } catch (error) {
      console.error('Lỗi khi tạo provider:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo provider'
      });
    }
  },

  // Cập nhật provider
  async updateProvider(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tên provider'
        });
      }

      // Kiểm tra tên mới có trùng không
      const existingProvider = await prisma.provider.findFirst({
        where: {
          name,
          id: { not: toObjectId(id) }
        }
      });

      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'Tên provider đã tồn tại'
        });
      }

      const updatedProvider = await prisma.provider.update({
        where: { id: toObjectId(id) },
        data: { name }
      });

      res.json({
        success: true,
        message: 'Cập nhật provider thành công',
        data: updatedProvider
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật provider:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật provider'
      });
    }
  },

  // Xóa provider
  async deleteProvider(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra provider có models không
      const providerWithModels = await prisma.provider.findFirst({
        where: { id: toObjectId(id) },
        include: {
          models: true
        }
      });

      if (providerWithModels.models.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa provider đang có models. Vui lòng xóa tất cả models trước.'
        });
      }

      await prisma.provider.delete({
        where: { id: toObjectId(id) }
      });

      res.json({
        success: true,
        message: 'Xóa provider thành công'
      });
    } catch (error) {
      console.error('Lỗi khi xóa provider:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa provider'
      });
    }
  }
};

module.exports = providerController;