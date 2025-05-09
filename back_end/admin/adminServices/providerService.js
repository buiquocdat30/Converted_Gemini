
// --- Thao tác với Provider ---
const prisma = require("../../config/prismaConfig");

async function getAllProviders() {
  try {
    return await prisma.provider.findMany({
      include: { models: true }, // Lấy cả danh sách models của mỗi provider
    });
  } catch (error) {
    console.error("Lỗi khi lấy tất cả providers:", error);
    throw error;
  }
}

async function getProviderById(id) {
  try {
    return await prisma.provider.findUnique({
      where: { id },
      include: { models: true },
    });
  } catch (error) {
    console.error(`Lỗi khi lấy provider với ID ${id}:`, error);
    throw error;
  }
}

async function createProvider(name) {
  try {
    return await prisma.provider.create({
      data: { name },
    });
  } catch (error) {
    console.error("Lỗi khi tạo provider:", error);
    throw error;
  }
}

async function updateProvider(id, name) {
  try {
    return await prisma.provider.update({
      where: { id },
      data: { name },
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật provider với ID ${id}:`, error);
    throw error;
  }
}

async function deleteProvider(id) {
  try {
    return await prisma.provider.delete({
      where: { id },
    });
  } catch (error) {
    console.error(`Lỗi khi xóa provider với ID ${id}:`, error);
    throw error;
  }
}

module.exports = {
    getAllProviders,
    getProviderById,
    createProvider,
    updateProvider,
    deleteProvider,
  };
  