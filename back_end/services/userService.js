const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

class UserService {
  // Create a new user
  async createUser(userData) {
    try {
      // Hash password before saving
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      const user = await prisma.user.create({
        data: userData,
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get all users
  async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        include: {
          libraryStories: true,
          UserApiKey: true,
        },
      });
      return users;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id) {
    try {
      console.log("🔍 Đang tìm user với ID:", id);
      
      const user = await prisma.user.findUnique({
        where: { id }
      });

      console.log("📦 Kết quả tìm user:", user);
      
      if (!user) {
        console.log("⚠️ Không tìm thấy user với ID:", id);
      }

      return user;
    } catch (error) {
      console.error("❌ Lỗi khi tìm user:", error);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          libraryStories: true,
          UserApiKey: true,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(id, userData) {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: userData,
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      const user = await prisma.user.delete({
        where: { id },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(userId, newPassword) {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();
