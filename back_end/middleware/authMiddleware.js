const jwt = require('jsonwebtoken');
const prisma = require("../config/prismaConfig");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log("🔑 Token từ request:", token);

        if (!token) {
            console.log("⚠️ Không tìm thấy token");
            return res.status(401).json({ error: "Không tìm thấy token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("🔓 Token đã giải mã:", decoded);

        if (!decoded.userId) {
            console.log("⚠️ Token không chứa ID user");
            return res.status(401).json({ error: "Token không hợp lệ" });
        }

        // Kiểm tra user có tồn tại không
        const user = await prisma.user.findUnique({
            where: {
                id: decoded.userId
            }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Người dùng không tồn tại',
                code: 'USER_NOT_FOUND'
            });
        }

        // Thêm thông tin user vào request
        req.user = {
            id: user.id,
            email: user.email,
            username: user.username
        };

        console.log("✅ Xác thực thành công, user ID:", decoded.userId);
        next();
    } catch (error) {
        console.error("❌ Lỗi xác thực:", error);
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                error: 'Token đã hết hạn',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                error: 'Token không hợp lệ',
                code: 'INVALID_TOKEN'
            });
        }

        res.status(500).json({
            error: 'Lỗi xác thực',
            code: 'AUTH_ERROR',
            details: error.message
        });
    }
};

module.exports = authMiddleware; 