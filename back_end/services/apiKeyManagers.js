const prisma = require("../config/prismaConfig");
const { getModelInfo } = require("./modelAIManagers");

class ApiKeyManager {
  constructor(modelValue) {
    this.modelValue = modelValue;
    this.aliveKeys = [];
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

      // Thêm default keys vào danh sách aliveKeys
      const defaultKeyValues = defaultKeys.map(k => k.key);
      this.aliveKeys = [...new Set([...this.aliveKeys, ...defaultKeyValues])];
      
      console.log(`📥 Đã tải ${defaultKeyValues.length} default keys`);
    } catch (error) {
      console.error("❌ Lỗi khi tải default keys:", error);
    }
  }

  // Lấy keys của user từ database
  async loadUserKeys(userId) {
    try {
      const userKeys = await prisma.userApiKey.findMany({
        where: {
          userId,
          status: "ACTIVE",
          model: {
            value: this.modelValue
          }
        },
        select: {
          key: true
        }
      });

      // Thêm keys của user vào danh sách aliveKeys
      const userKeyValues = userKeys.map(k => k.key);
      this.aliveKeys = [...new Set([...this.aliveKeys, ...userKeyValues])];
      
      console.log(`📥 Đã tải ${userKeyValues.length} keys của user`);
    } catch (error) {
      console.error("❌ Lỗi khi tải keys của user:", error);
    }
  }

  // Lưu key mới của user vào database
  async saveUserKey(userId, key) {
    try {
      // Tìm model ID dựa trên modelValue
      const model = await prisma.model.findFirst({
        where: { value: this.modelValue }
      });

      if (!model) {
        throw new Error("Không tìm thấy model");
      }

      // Lưu key vào database
      await prisma.userApiKey.create({
        data: {
          key,
          userId,
          modelId: model.id,
          status: "ACTIVE"
        }
      });

      // Thêm vào danh sách aliveKeys nếu chưa có
      if (!this.aliveKeys.includes(key)) {
        this.aliveKeys.push(key);
      }

      console.log("✅ Đã lưu key mới của user");
    } catch (error) {
      console.error("❌ Lỗi khi lưu key của user:", error);
      throw error;
    }
  }

  // Xử lý lỗi 429 (Too Many Requests)
  async handle429Error(userId, key) {
    try {
      // Cập nhật trạng thái key trong database
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

      // Xóa khỏi danh sách aliveKeys
      const index = this.aliveKeys.indexOf(key);
      if (index !== -1) {
        this.aliveKeys.splice(index, 1);
      }
    } catch (error) {
      console.error("❌ Lỗi khi xử lý lỗi 429:", error);
    }
  }

  // Đánh dấu key đã hết quota
  async exhaustKey(userId, key) {
    try {
      // Cập nhật trạng thái key trong database
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

      // Xóa khỏi danh sách aliveKeys
      const index = this.aliveKeys.indexOf(key);
      if (index !== -1) {
        this.aliveKeys.splice(index, 1);
      }
    } catch (error) {
      console.error("❌ Lỗi khi đánh dấu key hết quota:", error);
    }
  }

  // Lấy key theo vòng tròn
  getAroundKeyFrom(keys, type = "default") {
    if (!keys || keys.length === 0) return null;
    const key = keys[Math.floor(Math.random() * keys.length)];
    return key;
  }
}

module.exports = ApiKeyManager;
