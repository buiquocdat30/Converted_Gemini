const authService = require('../services/authService');

const authController = {
    // Đăng ký user mới
    signup: async (req, res) => {
        const { username, email, password } = req.body;
        try {
            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Vui lòng điền đầy đủ thông tin'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Email không hợp lệ'
                });
            }

            // Validate password strength
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Mật khẩu phải có ít nhất 6 ký tự'
                });
            }

            const { token } = await authService.registerUser(username, email, password);
            res.status(201).json({
                success: true,
                token,
                message: 'Đăng ký thành công'
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Lỗi khi đăng ký'
            });
        }
    },

    // Đăng nhập
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Vui lòng điền đầy đủ thông tin'
                });
            }

            const { token, username } = await authService.loginUser(email, password);
            res.json({
                success: true,
                token,
                username,
                message: 'Đăng nhập thành công'
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({
                success: false,
                error: error.message || 'Đăng nhập thất bại'
            });
        }
    },

    // Kiểm tra token hợp lệ
    verifyToken: async (req, res) => {
        try {
            // Middleware authMiddleware đã xác thực token và thêm user vào req
            res.json({
                success: true,
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    email: req.user.email
                }
            });
        } catch (error) {
            console.error('Verify token error:', error);
            res.status(401).json({
                success: false,
                error: 'Token không hợp lệ'
            });
        }
    }
};

module.exports = authController; 