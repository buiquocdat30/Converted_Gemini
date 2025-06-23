// --- Thao tác với DefaultKey ---
const prisma = require("../../config/prismaConfig");

// Lấy tất cả default keys và usage theo từng model
async function getAllDefaultKeys() {
  try {
    return await prisma.defaultKey.findMany({
      include: {
        usage: {
          include: {
            model: {
              include: { provider: true }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy tất cả default keys:", error);
    throw error;
  }
}

// Lấy default key theo id và usage
async function getDefaultKeyById(id) {
  try {
    return await prisma.defaultKey.findUnique({
      where: { id },
      include: {
        usage: {
          include: {
            model: {
              include: { provider: true }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error(`Lỗi khi lấy default key với ID ${id}:`, error);
    throw error;
  }
}

// Tạo default key mới và usage cho từng model
async function createDefaultKey({ key, modelIds }) {
  try {
    // Kiểm tra xem key đã tồn tại chưa
    const existingKey = await prisma.defaultKey.findUnique({ where: { key } });
    if (existingKey) throw new Error('Key đã tồn tại');
    // Tạo default key
    const newKey = await prisma.defaultKey.create({ data: { key } });
    // Tạo usage cho từng model
    for (const modelId of modelIds) {
      await prisma.defaultKeyUsage.create({
        data: {
          defaultKeyId: newKey.id,
          modelId,
          status: "ACTIVE"
        }
      });
    }
    return await getDefaultKeyById(newKey.id);
  } catch (error) {
    console.error("Lỗi khi tạo default key:", error);
    throw error;
  }
}

// Xóa default key và toàn bộ usage liên quan
async function deleteDefaultKey(id) {
  try {
    await prisma.defaultKeyUsage.deleteMany({ where: { defaultKeyId: id } });
    await prisma.defaultKey.delete({ where: { id } });
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa default key:", error);
    throw error;
  }
}

// Lấy default keys theo model
async function getDefaultKeysByModel(modelId) {
  try {
    const usages = await prisma.defaultKeyUsage.findMany({
      where: { modelId },
      include: {
        defaultKey: true,
        model: { include: { provider: true } }
      }
    });
    return usages.map(u => ({ ...u.defaultKey, model: u.model, usage: u }));
  } catch (error) {
    console.error(`Lỗi khi lấy default keys cho model ${modelId}:`, error);
    throw error;
  }
}

// Lấy default keys theo provider
async function getDefaultKeysByProvider(providerId) {
  try {
    const usages = await prisma.defaultKeyUsage.findMany({
      where: {
        model: { providerId }
      },
      include: {
        defaultKey: true,
        model: { include: { provider: true } }
      }
    });
    return usages.map(u => ({ ...u.defaultKey, model: u.model, usage: u }));
  } catch (error) {
    console.error(`Lỗi khi lấy default keys cho provider ${providerId}:`, error);
    throw error;
  }
}

module.exports = {
  getAllDefaultKeys,
  getDefaultKeyById,
  createDefaultKey,
  deleteDefaultKey,
  getDefaultKeysByModel,
  getDefaultKeysByProvider
};