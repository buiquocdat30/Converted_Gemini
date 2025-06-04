// --- Thao tác với DefaultKey ---
const prisma = require("../../config/prismaConfig");
const fs = require('fs').promises;
const path = require('path');

async function getAllDefaultKeys() {
  try {
    return await prisma.defaultKey.findMany({
      include: {
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy tất cả default keys:", error);
    throw error;
  }
}

async function getDefaultKeyById(id) {
  try {
    return await prisma.defaultKey.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  } catch (error) {
    console.error(`Lỗi khi lấy default key với ID ${id}:`, error);
    throw error;
  }
}

async function createDefaultKey(data) {
  try {
    // Kiểm tra xem key đã tồn tại cho model này chưa
    const existingKey = await prisma.defaultKey.findFirst({
      where: {
        key: data.key,
        modelId: data.modelId
      }
    });

    if (existingKey) {
      throw new Error('Key đã tồn tại cho model này');
    }

    return await prisma.defaultKey.create({
      data,
      include: {
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  } catch (error) {
    console.error("Lỗi khi tạo default key:", error);
    throw error;
  }
}

async function addKeyToProviderModels(key, providerId, modelValues) {
  try {
    // Lấy provider và các models của provider
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        models: {
          where: {
            value: {
              in: modelValues
            }
          }
        }
      }
    });

    if (!provider) {
      throw new Error('Không tìm thấy provider');
    }

    if (provider.models.length === 0) {
      throw new Error('Không tìm thấy models nào cho provider này');
    }

    // Thêm key cho từng model
    const results = [];
    for (const model of provider.models) {
      try {
        const defaultKey = await prisma.defaultKey.create({
          data: {
            key: key,
            modelId: model.id,
            value: model.value
          },
          include: {
            model: {
              include: {
                provider: true
              }
            }
          }
        });
        results.push(defaultKey);
      } catch (error) {
        if (error.code === 'P2002') { // Unique constraint violation
          console.log(`Key đã tồn tại cho model ${model.value}`);
          continue;
        }
        throw error;
      }
    }

    return results;
  } catch (error) {
    console.error("Lỗi khi thêm key cho provider models:", error);
    throw error;
  }
}

async function updateDefaultKey(id, data) {
  try {
    return await prisma.defaultKey.update({
      where: { id },
      data,
      include: {
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật default key với ID ${id}:`, error);
    throw error;
  }
}

async function deleteDefaultKey(id) {
  try {
    return await prisma.defaultKey.delete({
      where: { id }
    });
  } catch (error) {
    console.error(`Lỗi khi xóa default key với ID ${id}:`, error);
    throw error;
  }
}

async function getDefaultKeysByModel(modelId) {
  try {
    return await prisma.defaultKey.findMany({
      where: { modelId },
      include: {
        model: {
          include: {
            provider: true
          }
        }
      }
    });
  } catch (error) {
    console.error(`Lỗi khi lấy default keys cho model ${modelId}:`, error);
    throw error;
  }
}

async function getDefaultKeysByProvider(providerId) {
  try {
    return await prisma.defaultKey.findMany({
      where: {
        model: {
          providerId: providerId
        }
      },
      include: {
        model: {
          include: {
            provider: true
          }
        }
      },
      distinct: ['key']
    });
  } catch (error) {
    console.error(`Lỗi khi lấy default keys cho provider ${providerId}:`, error);
    throw error;
  }
}

module.exports = {
  getAllDefaultKeys,
  getDefaultKeyById,
  createDefaultKey,
  addKeyToProviderModels,
  updateDefaultKey,
  deleteDefaultKey,
  getDefaultKeysByModel,
  getDefaultKeysByProvider
};