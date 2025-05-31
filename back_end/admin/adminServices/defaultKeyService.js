// --- Thao tác với DefaultKey ---
const prisma = require("../../config/prismaConfig");
const fs = require('fs').promises;
const path = require('path');

async function getAllDefaultKeys() {
  try {
    return await prisma.defaultKey.findMany({
      include: {
        model: true
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
        model: true
      }
    });
  } catch (error) {
    console.error(`Lỗi khi lấy default key với ID ${id}:`, error);
    throw error;
  }
}

async function createDefaultKey(data) {
  try {
    return await prisma.defaultKey.create({
      data,
      include: {
        model: true
      }
    });
  } catch (error) {
    console.error("Lỗi khi tạo default key:", error);
    throw error;
  }
}

async function updateDefaultKey(id, data) {
  try {
    return await prisma.defaultKey.update({
      where: { id },
      data,
      include: {
        model: true
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
        model: true
      }
    });
  } catch (error) {
    console.error(`Lỗi khi lấy default keys cho model ${modelId}:`, error);
    throw error;
  }
}

module.exports = {
  getAllDefaultKeys,
  getDefaultKeyById,
  createDefaultKey,
  updateDefaultKey,
  deleteDefaultKey,
  getDefaultKeysByModel
};