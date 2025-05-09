// --- Thao tác với Model ---
const prisma = require("../../config/prismaConfig");

async function getAllModels(providerId = null) {
  try {
    const where = providerId ? { providerId } : {};
    return await prisma.model.findMany({
      where,
      include: { provider: true }, // Lấy thông tin provider của mỗi model
    });
  } catch (error) {
    console.error("Lỗi khi lấy tất cả models:", error);
    throw error;
  }
}

async function getModelById(id) {
  try {
    return await prisma.model.findUnique({
      where: { id },
      include: { provider: true },
    });
  } catch (error) {
    console.error(`Lỗi khi lấy model với ID ${id}:`, error);
    throw error;
  }
}

async function createModel(data) {
  try {
    return await prisma.model.create({
      data,
    });
  } catch (error) {
    console.error("Lỗi khi tạo model:", error);
    throw error;
  }
}

async function updateModel(id, data) {
  try {
    return await prisma.model.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật model với ID ${id}:`, error);
    throw error;
  }
}

async function deleteModel(id) {
  try {
    return await prisma.model.delete({
      where: { id },
    });
  } catch (error) {
    console.error(`Lỗi khi xóa model với ID ${id}:`, error);
    throw error;
  }
}

module.exports = {
    getAllModels,
    getModelById,
    createModel,
    updateModel,
    deleteModel,
  };