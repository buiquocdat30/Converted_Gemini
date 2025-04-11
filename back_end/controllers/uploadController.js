const path = require('path');
const fs = require('fs');
const { readEpub } = require('../services/epubService');
const { readTxt } = require('../services/txtServices');
const { prisma } = require('../config/prismaConfig'); // giả sử bạn đang sử dụng Prisma để lưu dữ liệu

const handleUpload = async (req, res) => {
  const { fileName, fileContent } = req.body; // Lấy file content từ frontend gửi lên

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: 'Không có dữ liệu file' });
  }

  // Kiểm tra file type từ tên file
  const ext = path.extname(fileName).toLowerCase();

  if (ext !== '.epub' && ext !== '.txt') {
    return res.status(400).json({ error: 'Chỉ hỗ trợ file EPUB hoặc TXT' });
  }

  try {
    let chapters = [];

    if (ext === '.epub') {
      // Xử lý file .epub
      chapters = await readEpub(fileContent);
    } else if (ext === '.txt') {
      // Xử lý file .txt
      chapters = await readTxt(fileContent);
    }

    // Trả về kết quả
    res.json({ chapters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý file' });
  }
};

module.exports = { handleUpload };
