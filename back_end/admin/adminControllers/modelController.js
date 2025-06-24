// controllers/modelController.js
const { prisma, toObjectId } = require('../../config/prismaConfig');

const modelController = {
  // Lấy tất cả models
  async getAllModels(req, res) {
    try {
      const models = await prisma.model.findMany({
        include: {
          provider: true
        },
        orderBy: [
          { provider: { name: 'asc' } },
          { label: 'asc' }
        ]
      });

      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      console.error('Lỗi khi lấy models:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách models'
      });
    }
  },

  // Tạo model mới
  async createModel(req, res) {
    try {
      const { providerId, value, label, description, rpm, tpm, rpd } = req.body;

      if (!providerId || !value || !label) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin providerId, value hoặc label'
        });
      }

      // Kiểm tra provider tồn tại
      const provider = await prisma.provider.findUnique({
        where: { id: toObjectId(providerId) }
      });

      if (!provider) {
        return res.status(400).json({
          success: false,
          message: 'Provider không tồn tại'
        });
      }

      // Kiểm tra model đã tồn tại trong provider
      const existingModel = await prisma.model.findFirst({
        where: {
          providerId: toObjectId(providerId),
          value
        }
      });

      if (existingModel) {
        return res.status(400).json({
          success: false,
          message: 'Model đã tồn tại trong provider này'
        });
      }

      const newModel = await prisma.model.create({
        data: {
          providerId: toObjectId(providerId),
          value,
          label,
          description,
          rpm: rpm ? parseInt(rpm) : null,
          tpm: tpm ? parseInt(tpm) : null,
          rpd: rpd ? parseInt(rpd) : null
        },
        include: {
          provider: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Tạo model thành công',
        data: newModel
      });
    } catch (error) {
      console.error('Lỗi khi tạo model:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo model'
      });
    }
  },

  // Cập nhật model
  async updateModel(req, res) {
    try {
      const { id } = req.params;
      const { value, label, description, rpm, tpm, rpd } = req.body;

      if (!value || !label) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin value hoặc label'
        });
      }

      // Kiểm tra model tồn tại
      const existingModel = await prisma.model.findUnique({
        where: { id: toObjectId(id) }
      });

      if (!existingModel) {
        return res.status(404).json({
          success: false,
          message: 'Model không tồn tại'
        });
      }

      // Kiểm tra value mới có trùng trong cùng provider không
      const duplicateModel = await prisma.model.findFirst({
        where: {
          providerId: existingModel.providerId,
          value,
          id: { not: toObjectId(id) }
        }
      });

      if (duplicateModel) {
        return res.status(400).json({
          success: false,
          message: 'Model value đã tồn tại trong provider này'
        });
      }

      const updatedModel = await prisma.model.update({
        where: { id: toObjectId(id) },
        data: {
          value,
          label,
          description,
          rpm: rpm ? parseInt(rpm) : null,
          tpm: tpm ? parseInt(tpm) : null,
          rpd: rpd ? parseInt(rpd) : null
        },
        include: {
          provider: true
        }
      });

      res.json({
        success: true,
        message: 'Cập nhật model thành công',
        data: updatedModel
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật model:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật model'
      });
    }
  },

  // Xóa model
  async deleteModel(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra model có usage records không
      const modelWithUsage = await prisma.model.findFirst({
        where: { id: toObjectId(id) },
        include: {
          userApiKeys: true,
          defaultKeys: true
        }
      });

      if (!modelWithUsage) {
        return res.status(404).json({
          success: false,
          message: 'Model không tồn tại'
        });
      }

      if (modelWithUsage.userApiKeys.length > 0 || modelWithUsage.defaultKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa model đang được sử dụng. Vui lòng xóa tất cả usage records trước.'
        });
      }

      await prisma.model.delete({
        where: { id: toObjectId(id) }
      });

      res.json({
        success: true,
        message: 'Xóa model thành công'
      });
    } catch (error) {
      console.error('Lỗi khi xóa model:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa model'
      });
    }
  },

  // Lấy models theo provider
  async getModelsByProvider(req, res) {
    try {
      const { providerId } = req.params;

      const models = await prisma.model.findMany({
        where: {
          providerId: toObjectId(providerId)
        },
        include: {
          provider: true
        },
        orderBy: {
          label: 'asc'
        }
      });

      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      console.error('Lỗi khi lấy models theo provider:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy models theo provider'
      });
    }
  }
};

module.exports = modelController;