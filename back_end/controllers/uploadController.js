const path = require('path');
const fs = require('fs');
const { readEpub } = require('../services/epubService');
const {readTxt} =require ('../services/txtServices')

const handleUpload = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Không có file được đưa lên' });

  const ext = path.extname(file.originalname).toLowerCase();


  if (ext !== '.epub' && ext !== '.txt') {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Chỉ hỗ trợ file EPUB hoặc TXT' });
  }
  try {
    let chapters = [];

    if (ext === '.epub') {
      // Xử lý file .epub
      chapters = await readEpub(file.path);
    } else if (ext === '.txt') {
      // Xử lý file .txt
      chapters = await readTxt(file.path);
    }

    // Xóa file sau khi xử lý
    fs.unlinkSync(file.path);

    // Trả về kết quả
    res.json({ chapters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý file' });
  }
};

module.exports = { handleUpload };
