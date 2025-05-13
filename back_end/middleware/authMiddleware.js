const jwt = require('jsonwebtoken');
const prisma = require("../config/prismaConfig");

const authMiddleware = async (req, res, next) => {
    try {
        // Lấy token từ header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Không tìm thấy token xác thực',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];


        // Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);


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
            id: user.id, // Đảm bảo id là ObjectId từ MongoDB
            email: user.email,
            username: user.username
        };


        next();
    } catch (error) {

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