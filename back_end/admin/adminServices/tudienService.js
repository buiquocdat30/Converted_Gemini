// services/TuDienService.js
const prisma = require("../../config/prismaConfig");

const fs = require('fs').promises;
const path = require('path');

async function getAllTuDien() {
  return prisma.TuDien.findMany();
}

async function getTuDienById(id) {
  return prisma.TuDien.findUnique({ where: { id } });
}

async function createTuDien(data) {
  return prisma.TuDien.create({ data });
}

async function updateTuDien(id, data) {
  return prisma.TuDien.update({ where: { id }, data });
}

async function deleteTuDien(id) {
  return prisma.TuDien.delete({ where: { id } });
}

async function importTuDienFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const TuDienData = lines.map(line => {
      const [hanTu, pinyin, nghiaViet] = line.split('\t'); // Giả sử file tab-separated
      return { hanTu, pinyin: pinyin || null, nghiaViet };
    });

    await prisma.TuDien.createMany({
      data: TuDienData,
      skipDuplicates: true, // Tùy chọn: bỏ qua các từ Hán trùng lặp
    });

    return { success: true, message: `Đã nhập ${TuDienData.length} từ Hán Việt.` };
  } catch (error) {
    console.error("Lỗi khi nhập dữ liệu Hán Việt từ file:", error);
    return { success: false, message: "Lỗi khi nhập dữ liệu Hán Việt." };
  }
}

module.exports = {
  getAllTuDien,
  getTuDienById,
  createTuDien,
  updateTuDien,
  deleteTuDien,
  importTuDienFromFile,
};