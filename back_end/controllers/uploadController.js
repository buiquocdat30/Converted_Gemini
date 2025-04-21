const path = require("path");
const fs = require("fs").promises;
const { readEpub } = require("../services/epubService");
const { readTxt } = require("../services/txtServices");
const os = require("os");
const crypto = require("crypto");

const handleUpload = async (req, res) => {
  const { fileName, fileContent } = req.body;

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: "Không có dữ liệu file" });
  }

  const ext = path.extname(fileName).toLowerCase();
  if (ext !== ".epub" && ext !== ".txt") {
    return res.status(400).json({ error: "Chỉ hỗ trợ file EPUB hoặc TXT" });
  }

  try {
    // Tạo file tạm với nội dung
    const tempDir = os.tmpdir(); // thư mục tạm hệ thống
    const tempFileName = crypto.randomUUID() + ext;
    const tempFilePath = path.join(tempDir, tempFileName);

    if (!fileContent) {
      console.log("⚠️ fileContent is empty for", fileName);
    }

    await fs.writeFile(
      tempFilePath,
      fileContent,
      ext === ".epub" ? "base64" : "utf-8"
    );

    let chapters = [];

    if (ext === ".epub") {
      chapters = await readEpub(tempFilePath);
    } else {
      chapters = await readTxt(tempFilePath);
    }

    // Xóa file tạm sau khi xử lý xong
    await fs.unlink(tempFilePath);

    res.json({ chapters });
  } catch (err) {
    console.error("❌ Lỗi xử lý:", err);
    res.status(500).json({ error: "Đã xảy ra lỗi khi xử lý file" });
  }
};

module.exports = { handleUpload };
