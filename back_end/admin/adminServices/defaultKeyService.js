// --- Thao tác với DefaultKey ---
const prisma = require("../../config/prismaConfig");

async function getAllDefaultKeys() {
  try {
    return await prisma.defaultKey.findMany({
      include: {
        models: {
          include: {
            model: {
              include: {
                provider: true
              }
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

async function getDefaultKeyById(id) {
  try {
    return await prisma.defaultKey.findUnique({
      where: { id },
      include: {
        models: {
          include: {
            model: {
              include: {
                provider: true
              }
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

async function createDefaultKey(data) {
  try {
    const { key, modelIds, status = "ACTIVE" } = data;

    // Kiểm tra xem key đã tồn tại chưa
    const existingKey = await prisma.defaultKey.findUnique({
      where: { key }
    });

    if (existingKey) {
      throw new Error('Key đã tồn tại');
    }

    // Tạo default key mới và kết nối với các model
    return await prisma.defaultKey.create({
      data: {
        key,
        status,
        models: {
          create: modelIds.map(modelId => ({
            model: {
              connect: { id: modelId }
            }
          }))
        }
      },
      include: {
        models: {
          include: {
            model: {
              include: {
                provider: true
              }
            }
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
    // Tìm provider
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        models: {
          where: {
            value: { in: modelValues }
          }
        }
      }
    });

    if (!provider) {
      throw new Error('Không tìm thấy provider');
    }

    if (provider.models.length === 0) {
      throw new Error('Không tìm thấy models nào phù hợp');
    }

    // Kiểm tra xem key đã tồn tại chưa
    let defaultKey = await prisma.defaultKey.findUnique({
      where: { key },
      include: {
        models: {
          include: {
            model: true
          }
        }
      }
    });

    if (!defaultKey) {
      // Tạo key mới nếu chưa tồn tại
      defaultKey = await prisma.defaultKey.create({
        data: {
          key,
          status: "ACTIVE",
          models: {
            create: provider.models.map(model => ({
              model: {
                connect: { id: model.id }
              }
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
    } else {
      // Thêm kết nối với các model mới
      const existingModelIds = defaultKey.models.map(m => m.model.id);
      const newModelIds = provider.models
        .filter(model => !existingModelIds.includes(model.id))
        .map(model => model.id);

      if (newModelIds.length > 0) {
        await prisma.defaultKeyToModel.createMany({
          data: newModelIds.map(modelId => ({
            defaultKeyId: defaultKey.id,
            modelId
          }))
        });
      }
    }

    return defaultKey;
  } catch (error) {
    console.error("Lỗi khi thêm key cho provider models:", error);
    throw error;
  }
}

async function updateDefaultKey(id, data) {
  try {
    const { key, modelIds, status } = data;

    // Nếu có thay đổi modelIds
    if (modelIds) {
      // Xóa tất cả kết nối cũ
      await prisma.defaultKeyToModel.deleteMany({
        where: { defaultKeyId: id }
      });

      // Tạo kết nối mới
      await prisma.defaultKeyToModel.createMany({
        data: modelIds.map(modelId => ({
          defaultKeyId: id,
          modelId
        }))
      });
    }

    // Cập nhật thông tin key
    return await prisma.defaultKey.update({
      where: { id },
      data: {
        key,
        status
      },
      include: {
        models: {
          include: {
            model: {
              include: {
                provider: true
              }
            }
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
    // Xóa tất cả kết nối với models trước
    await prisma.defaultKeyToModel.deleteMany({
      where: { defaultKeyId: id }
    });

    // Sau đó xóa key
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
    const defaultKeys = await prisma.defaultKeyToModel.findMany({
      where: { modelId },
      include: {
        defaultKey: true,
        model: {
          include: {
            provider: true
          }
        }
      }
    });

    return defaultKeys.map(dk => ({
      ...dk.defaultKey,
      model: dk.model
    }));
  } catch (error) {
    console.error(`Lỗi khi lấy default keys cho model ${modelId}:`, error);
    throw error;
  }
}

async function getDefaultKeysByProvider(providerId) {
  try {
    const defaultKeys = await prisma.defaultKeyToModel.findMany({
      where: {
        model: {
          providerId
        }
      },
      include: {
        defaultKey: true,
        model: {
          include: {
            provider: true
          }
        }
      },
      distinct: ['defaultKeyId']
    });

    return defaultKeys.map(dk => ({
      ...dk.defaultKey,
      model: dk.model
    }));
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