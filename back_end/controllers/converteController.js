const path = require("path");
const fs = require("fs");
const { readTxt } = require("../services/txtServices");
const { readEpub } = require("../services/epubService");

const converteText = async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const filePath = path.join(__dirname, "..", "uploads", filename);
    const fileExt = path.extname(filename).toLowerCase();

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    let chapters;

    if (fileExt === ".txt") {
      chapters = await readTxt(filePath);
    } else if (fileExt === ".epub") {
      chapters = await readEpub(filePath);
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!chapters || chapters.length === 0) {
      return res.status(400).json({ error: "No chapters extracted from file" });
    }

    res.json({ chapters }); // ✅ Trả về toàn bộ danh sách chương
  } catch (error) {
    console.error("Error in converteText:", error);
    res.status(500).json({ error: "Server error during file conversion" });
  }
};

module.exports = { converteText };
