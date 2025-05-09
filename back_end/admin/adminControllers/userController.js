// controllers/userController.js
const userService = require('../adminServices/userService'); // Đảm bảo đường dẫn này chính xác

async function getAllUsers(req, res) {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;
  try {
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại.' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createUser(req, res) {
  // Dữ liệu user mong đợi từ req.body: { email, username, password, avatar, birthdate }
  const { email, username, password, avatar, birthdate } = req.body;
  try {
    const newUser = await userService.createUser({ email, username, password, avatar, birthdate });
    res.status(201).json(newUser);
  } catch (error) {
    // Bạn có thể muốn xử lý các lỗi cụ thể hơn ở đây, ví dụ: email đã tồn tại
    res.status(500).json({ error: error.message });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { email, username, password, avatar, birthdate } = req.body;
  try {
    const updatedUser = await userService.updateUser(id, { email, username, password, avatar, birthdate });
    if (!updatedUser) {
        return res.status(404).json({ message: 'User không tồn tại để cập nhật.' });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    const deletedUser = await userService.deleteUser(id);
    if (!deletedUser) {
        return res.status(404).json({ message: 'User không tồn tại để xóa.' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};