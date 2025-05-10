const path = require("path");
const fs = require("fs").promises;
const os = require("os");
const crypto = require("crypto");
const { readEpub } = require("./epubService");
const { readTxt } = require("./txtServices");
const prisma = require("../config/prismaConfig");

const uploadService = {
    // Upload và xử lý file truyện
    handleStoryUpload: async (fileName, fileContent) => {
        console.log("📚 Bắt đầu xử lý upload truyện:", fileName);

        const ext = path.extname(fileName).toLowerCase();
        if (ext !== ".epub" && ext !== ".txt") {
            throw new Error("Chỉ hỗ trợ file EPUB hoặc TXT");
        }

        // Tạo file tạm với nội dung
        const tempDir = os.tmpdir();
        const tempFileName = crypto.randomUUID() + ext;
        const tempFilePath = path.join(tempDir, tempFileName);

        console.log("📝 Đang tạo file tạm tại:", tempFilePath);

        if (!fileContent) {
            console.log("⚠️ fileContent trống cho file:", fileName);
            throw new Error("Nội dung file trống");
        }

        await fs.writeFile(
            tempFilePath,
            fileContent,
            ext === ".epub" ? "base64" : "utf-8"
        );

        console.log("✅ Đã lưu file tạm thành công");

        let chapters = [];
        try {
            if (ext === ".epub") {
                console.log("📖 Đang đọc file EPUB...");
                chapters = await readEpub(tempFilePath);
            } else {
                console.log("📄 Đang đọc file TXT...");
                chapters = await readTxt(tempFilePath);
            }
            console.log(`✅ Đã đọc thành công ${chapters.length} chương`);
        } finally {
            // Xóa file tạm sau khi xử lý xong
            await fs.unlink(tempFilePath);
            console.log("🧹 Đã xóa file tạm");
        }

        return chapters;
    },

    // Upload và xử lý ảnh
    handleImageUpload: async (userId, imageFile, type) => {
        console.log(`🖼️ Bắt đầu xử lý upload ảnh ${type} cho user:`, userId);

        if (!imageFile || !imageFile.buffer) {
            throw new Error("Không có dữ liệu ảnh");
        }

        // Kiểm tra loại ảnh
        if (!['avatar', 'background'].includes(type)) {
            throw new Error("Loại ảnh không hợp lệ");
        }

        // Kiểm tra định dạng ảnh
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(imageFile.mimetype)) {
            throw new Error("Định dạng ảnh không được hỗ trợ");
        }

        // Tạo tên file duy nhất
        const ext = path.extname(imageFile.originalname);
        const fileName = `${type}_${userId}_${Date.now()}${ext}`;
        
        // Lưu ảnh vào thư mục uploads
        const uploadDir = path.join(__dirname, '../uploads');
        const filePath = path.join(uploadDir, fileName);

        // Tạo thư mục nếu chưa tồn tại
        await fs.mkdir(uploadDir, { recursive: true });

        // Lưu file
        await fs.writeFile(filePath, imageFile.buffer);
        console.log(`✅ Đã lưu ảnh ${type} thành công tại:`, filePath);

        // Cập nhật thông tin user trong database
        const updateData = type === 'avatar' 
            ? { avatar: fileName }
            : { backgroundImage: fileName };

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        console.log(`✅ Đã cập nhật thông tin ${type} trong database`);

        return {
            fileName,
            filePath,
            type
        };
    }
};

module.exports = uploadService; 