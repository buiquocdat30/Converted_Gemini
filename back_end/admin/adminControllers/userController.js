const { prisma, toObjectId } = require('../../config/prismaConfig');

const userController = {
  // Lấy tất cả users
  async getAllUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        include: {
          UserApiKey: {
            include: {
              usage: {
                include: {
                  model: {
                    include: {
                      provider: true
                    }
                  }
                }
              }
            }
          },
          libraryStories: {
            include: {
              chapters: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Tính toán thống kê cho mỗi user
      const usersWithStats = users.map(user => {
        const totalKeys = user.UserApiKey.length;
        const totalStories = user.libraryStories.length;
        const totalChapters = user.libraryStories.reduce((sum, story) => sum + story.chapters.length, 0);
        const totalUsage = user.UserApiKey.reduce((sum, key) => 
          sum + key.usage.reduce((keySum, usage) => keySum + usage.usageCount, 0), 0
        );

        return {
          ...user,
          stats: {
            totalKeys,
            totalStories,
            totalChapters,
            totalUsage
          }
        };
      });

      res.json({
        success: true,
        data: usersWithStats
      });
    } catch (error) {
      console.error('Lỗi khi lấy users:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách users'
      });
    }
  },

  // Lấy user theo ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: toObjectId(id) },
        include: {
          UserApiKey: {
            include: {
              usage: {
                include: {
                  model: {
                    include: {
                      provider: true
                    }
                  }
                }
              }
            }
          },
          libraryStories: {
            include: {
              chapters: {
                include: {
                  translation: true,
                  versions: true
                }
              }
            }
          }
        }
      });

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
  },

  // Cập nhật user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, avatar, backgroundImage, birthdate } = req.body;

      // Kiểm tra user tồn tại
      const existingUser = await prisma.user.findUnique({
        where: { id: toObjectId(id) }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User không tồn tại'
        });
      }

      // Kiểm tra username/email trùng lặp
      if (username && username !== existingUser.username) {
        const duplicateUsername = await prisma.user.findFirst({
          where: {
            username,
            id: { not: toObjectId(id) }
          }
        });

        if (duplicateUsername) {
          return res.status(400).json({
            success: false,
            message: 'Username đã tồn tại'
          });
        }
      }

      if (email && email !== existingUser.email) {
        const duplicateEmail = await prisma.user.findFirst({
          where: {
            email,
            id: { not: toObjectId(id) }
          }
        });

        if (duplicateEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email đã tồn tại'
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: toObjectId(id) },
        data: {
          username: username || existingUser.username,
          email: email || existingUser.email,
          avatar,
          backgroundImage,
          birthdate: birthdate ? new Date(birthdate) : existingUser.birthdate,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Cập nhật user thành công',
        data: updatedUser
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật user'
      });
    }
  },

  // Xóa user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra user tồn tại
      const existingUser = await prisma.user.findUnique({
        where: { id: toObjectId(id) },
        include: {
          libraryStories: true,
          UserApiKey: true
        }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User không tồn tại'
        });
      }

      // Xóa user (cascade sẽ xóa tất cả dữ liệu liên quan)
      await prisma.user.delete({
        where: { id: toObjectId(id) }
      });

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
  },

  // Lấy keys của user
  async getUserKeys(req, res) {
    try {
      const { id } = req.params;

      const userKeys = await prisma.userApiKey.findMany({
        where: { userId: toObjectId(id) },
        include: {
          usage: {
            include: {
              model: {
                include: {
                  provider: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: userKeys
      });
    } catch (error) {
      console.error('Lỗi khi lấy user keys:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy user keys'
      });
    }
  },

  // Lấy usage của user
  async getUserUsage(req, res) {
    try {
      const { id } = req.params;

      const userUsage = await prisma.userApiKeyUsage.findMany({
        where: {
          userApiKey: {
            userId: toObjectId(id)
          }
        },
        include: {
          userApiKey: true,
          model: {
            include: {
              provider: true
            }
          }
        },
        orderBy: {
          lastUsedAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: userUsage
      });
    } catch (error) {
      console.error('Lỗi khi lấy user usage:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy user usage'
      });
    }
  }
};

module.exports = userController; 