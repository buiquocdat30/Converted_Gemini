const {prisma} = require("../config/prismaConfig");

const adminMiddleware = async (req, res, next) => {
    try {
        // Kiểm tra xem có token không
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Không tìm thấy token xác thực' });
        }

        // Tìm user từ token
        const user = await prisma.user.findFirst({
            where: {
                token: token
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Token không hợp lệ' });
        }

        // Kiểm tra quyền admin
        if (user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        // Thêm thông tin user vào request
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in admin middleware:', error);
        res.status(500).json({ error: 'Lỗi xác thực quyền admin' });
    }
};

module.exports = adminMiddleware; 