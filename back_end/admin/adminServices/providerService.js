// --- Thao tác với Provider ---
const prisma = require("../../config/prismaConfig");
const fs = require('fs').promises;
const path = require('path');

async function getAllProviders() {
  try {
    return await prisma.provider.findMany({
      include: {
        models: true
      }
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
      include: {
        models: true
      }
    });
  } catch (error) {
    console.error(`Lỗi khi lấy provider với ID ${id}:`, error);
    throw error;
  }
}

async function createProvider(data) {
  try {
    return await prisma.provider.create({
      data,
      include: {
        models: true
      }
    });
  } catch (error) {
    console.error("Lỗi khi tạo provider:", error);
    throw error;
  }
}

async function updateProvider(id, data) {
  try {
    return await prisma.provider.update({
      where: { id },
      data,
      include: {
        models: true
      }
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật provider với ID ${id}:`, error);
    throw error;
  }
}

async function deleteProvider(id) {
  try {
    return await prisma.provider.delete({
      where: { id }
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
  deleteProvider
};
  