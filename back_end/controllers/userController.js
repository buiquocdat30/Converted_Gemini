const userService = require("../services/userService");

class UserController {
  // Get current user profile
  async getCurrentUserProfile(req, res) {
    try {
      const userId = req.user.id; // Lấy từ authMiddleware
      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update current user profile
  async updateCurrentUserProfile(req, res) {
    try {
      const userId = req.user.id; // Lấy từ authMiddleware
      const userData = req.body;

      // Nếu có newPassword thì đổi mật khẩu
      if (userData.newPassword) {
        // Xử lý đổi mật khẩu
        const result = await userService.changePassword(
          userId,
          userData.newPassword
        );
        if (!result) {
          return res
            .status(400)
            .json({ message: "Không thể đổi mật khẩu" });
        }
        // Xóa trường mật khẩu khỏi userData
        delete userData.newPassword;
      }

      const user = await userService.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Create a new user
  async createUser(req, res) {
    try {
      const userData = req.body;
      const user = await userService.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get all users
  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get user by email
  async getUserByEmail(req, res) {
    try {
      const { email } = req.params;
      const user = await userService.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await userService.updateUser(id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.deleteUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new UserController();
