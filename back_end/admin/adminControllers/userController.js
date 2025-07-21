const userService = require('../adminServices/userServices');

// Lấy tất cả users đã đăng ký, sắp xếp theo ngày tạo mới nhất
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
      res.json({
        success: true,
      data: users
      });
    } catch (error) {
      console.error('Lỗi khi lấy users:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách users'
      });
    }
};

  // Lấy user theo ID
const getUserById = async (req, res) => {
    try {
      const { id } = req.params;
    const user = await userService.getUserById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User không tồn tại'
        });
      }
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Lỗi khi lấy user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin user'
      });
    }
};

// Tạo user mới
const createUser = async (req, res) => {
  try {
    const { email, username, password, avatar, birthdate } = req.body;
    const user = await userService.createUser({
      email,
      username,
      password,
      avatar,
      birthdate: birthdate ? new Date(birthdate) : null
    });
    res.status(201).json({
      success: true,
      message: 'Tạo user thành công',
      data: user
    });
  } catch (error) {
    console.error('Lỗi khi tạo user:', error);
    res.status(500).json({
            success: false,
      message: 'Lỗi server khi tạo user'
    });
  }
};

// Cập nhật user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, password, avatar, birthdate } = req.body;
    const user = await userService.updateUser(id, {
            email,
      username,
      password,
          avatar,
      birthdate: birthdate ? new Date(birthdate) : null
      });
      res.json({
        success: true,
        message: 'Cập nhật user thành công',
      data: user
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật user'
      });
    }
};

  // Xóa user
const deleteUser = async (req, res) => {
    try {
      const { id } = req.params;
    await userService.deleteUser(id);
      res.json({
        success: true,
        message: 'Xóa user thành công'
      });
    } catch (error) {
      console.error('Lỗi khi xóa user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa user'
      });
    }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
