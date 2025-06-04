const prisma = require("../config/prismaConfig");

class ApiKeyManager {
  constructor(modelValue) {
    this.modelValue = modelValue;
    this.defaultKeys = [];
  }

  // Lấy default keys từ database
  async loadDefaultKeys() {
    try {
      // Tìm model ID dựa trên modelValue
      const model = await prisma.model.findFirst({
        where: { value: this.modelValue }
      });

      if (!model) {
        console.log("⚠️ Không tìm thấy model trong database");
        return;
      }

      // Lấy tất cả default keys của model
      const defaultKeys = await prisma.defaultKey.findMany({
        where: { modelId: model.id }
      });

      this.defaultKeys = defaultKeys.map(k => k.key);
      console.log(`📥 Đã tải ${this.defaultKeys.length} default keys`);
    } catch (error) {
      console.error("❌ Lỗi khi tải default keys:", error);
    }
  }

  // Lấy key để sử dụng
  async getKeyToUse(userId, userKey = null) {
    try {
      // Nếu có userKey, kiểm tra xem key có hợp lệ không
      if (userKey) {
        const userKeyRecord = await prisma.userApiKey.findFirst({
          where: {
            userId,
            key: userKey,
            status: "ACTIVE",
            model: {
              value: this.modelValue
            }
          }
        });

        if (userKeyRecord) {
          console.log("🔑 Sử dụng key của user");
          return userKey;
        }
      }

      // Nếu không có userKey hoặc key không hợp lệ, sử dụng default key
      if (this.defaultKeys.length === 0) {
        await this.loadDefaultKeys();
      }

      if (this.defaultKeys.length === 0) {
        throw new Error("Không có key nào khả dụng");
      }

      // Lấy một key ngẫu nhiên từ danh sách default keys
      const key = this.defaultKeys[Math.floor(Math.random() * this.defaultKeys.length)];
      console.log("🔑 Sử dụng default key");
      return key;
    } catch (error) {
      console.error("❌ Lỗi khi lấy key:", error);
      throw error;
    }
  }

  // Xử lý lỗi 429 (Too Many Requests)
  async handle429Error(userId, key) {
    try {
      // Kiểm tra xem key có phải là key của user không
      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId,
          key,
          model: {
            value: this.modelValue
          }
        }
      });

      if (userKeyRecord) {
        // Nếu là key của user, cập nhật trạng thái
        await prisma.userApiKey.updateMany({
          where: {
            userId,
            key,
            model: {
              value: this.modelValue
            }
          },
          data: {
            status: "COOLDOWN"
          }
        });
      } else {
        // Nếu là default key, xóa khỏi danh sách
        const index = this.defaultKeys.indexOf(key);
        if (index !== -1) {
          this.defaultKeys.splice(index, 1);
        }
      }
    } catch (error) {
      console.error("❌ Lỗi khi xử lý lỗi 429:", error);
    }
  }

  // Đánh dấu key đã hết quota
  async exhaustKey(userId, key) {
    try {
      // Kiểm tra xem key có phải là key của user không
      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId,
          key,
          model: {
            value: this.modelValue
          }
        }
      });

      if (userKeyRecord) {
        // Nếu là key của user, cập nhật trạng thái
        await prisma.userApiKey.updateMany({
          where: {
            userId,
            key,
            model: {
              value: this.modelValue
            }
          },
          data: {
            status: "EXHAUSTED"
          }
        });
      } else {
        // Nếu là default key, xóa khỏi danh sách
        const index = this.defaultKeys.indexOf(key);
        if (index !== -1) {
          this.defaultKeys.splice(index, 1);
        }
      }
    } catch (error) {
      console.error("❌ Lỗi khi đánh dấu key hết quota:", error);
    }
  }
}

module.exports = ApiKeyManager;
