const prisma = require("../config/prismaConfig");

class ApiKeyManager {
  constructor(modelValue) {
    this.modelValue = modelValue;
    this.defaultKeys = [];
    this.lastError = null;
    this.modelInfo = null;
  }

  // Lấy thông tin model và kiểm tra default keys
  async loadModelInfo() {
    try {
      console.log(`\n🔍 Đang kiểm tra thông tin model "${this.modelValue}"...`);
      const model = await prisma.model.findFirst({
        where: { value: this.modelValue },
        include: {
          provider: true,
          defaultKeys: {
            where: { status: "ACTIVE" }
          }
        }
      });

      if (!model) {
        this.lastError = `⚠️ Không tìm thấy model "${this.modelValue}" trong database`;
        console.log(this.lastError);
        return false;
      }

      this.modelInfo = model;
      console.log(`\n📊 Thông tin model:`);
      console.log(`- Tên: ${model.label}`);
      console.log(`- Provider: ${model.provider.name}`);
      console.log(`- Số lượng default keys: ${model.defaultKeys.length}`);
      console.log(`- Giới hạn RPM: ${model.rpm}`);
      console.log(`- Giới hạn TPM: ${model.tpm}`);
      console.log(`- Giới hạn RPD: ${model.rpd}`);

      if (model.defaultKeys.length === 0) {
        this.lastError = `⚠️ Không có default key nào cho model "${this.modelValue}". Vui lòng thêm key mới hoặc liên hệ admin.`;
        console.log(this.lastError);
        return false;
      }

      return true;
    } catch (error) {
      this.lastError = `❌ Lỗi khi tải thông tin model: ${error.message}`;
      console.error(this.lastError);
      return false;
    }
  }

  // Lấy default keys từ database
  async loadDefaultKeys() {
    try {
      // Kiểm tra thông tin model trước
      const modelLoaded = await this.loadModelInfo();
      if (!modelLoaded) {
        return false;
      }

      // Lấy tất cả default keys của model
      const defaultKeys = await prisma.defaultKey.findMany({
        where: { 
          modelId: this.modelInfo.id,
          status: "ACTIVE"
        },
        include: {
          usageStats: {
            orderBy: {
              lastUsedAt: 'desc'
            },
            take: 1
          }
        }
      });

      this.defaultKeys = defaultKeys.map(k => ({
        key: k.key,
        lastUsed: k.usageStats[0]?.lastUsedAt || null,
        requestCount: k.usageStats[0]?.requestCount || 0
      }));
      
      console.log(`\n📥 Đã tải ${this.defaultKeys.length} default keys cho model "${this.modelValue}"`);
      console.log("📋 Chi tiết keys:");
      this.defaultKeys.forEach((k, index) => {
        console.log(`\n🔑 Key ${index + 1}: ${k.key.substring(0, 10)}...`);
        console.log(`- Lần sử dụng cuối: ${k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Chưa sử dụng'}`);
        console.log(`- Số request: ${k.requestCount}`);
      });

      return true;
    } catch (error) {
      this.lastError = `❌ Lỗi khi tải default keys: ${error.message}`;
      console.error(this.lastError);
      return false;
    }
  }

  // Lấy key để sử dụng
  async getKeyToUse(userId, userKey = null) {
    try {
      console.log("\n🔑 Bắt đầu quá trình lấy key để sử dụng...");
      this.lastError = null;

      // Nếu có userKey, kiểm tra xem key có hợp lệ không
      if (userKey) {
        console.log("🔍 Kiểm tra user key...");
        const userKeyRecord = await prisma.userApiKey.findFirst({
          where: {
            userId,
            key: userKey,
            status: "ACTIVE",
            model: {
              value: this.modelValue
            }
          },
          include: {
            usageStats: {
              orderBy: {
                lastUsedAt: 'desc'
              },
              take: 1
            }
          }
        });

        if (userKeyRecord) {
          console.log("✅ User key hợp lệ");
          console.log(`- Label: ${userKeyRecord.label || 'Không có nhãn'}`);
          console.log(`- Lần sử dụng cuối: ${userKeyRecord.usageStats[0]?.lastUsedAt ? new Date(userKeyRecord.usageStats[0].lastUsedAt).toLocaleString() : 'Chưa sử dụng'}`);
          console.log(`- Số request: ${userKeyRecord.usageStats[0]?.requestCount || 0}`);
          return userKey;
        } else {
          this.lastError = "⚠️ Key của user không hợp lệ hoặc đã bị vô hiệu hóa";
          console.log(this.lastError);
        }
      }

      // Nếu không có userKey hoặc key không hợp lệ, sử dụng default key
      if (this.defaultKeys.length === 0) {
        console.log("📥 Đang tải default keys...");
        const loaded = await this.loadDefaultKeys();
        if (!loaded) {
          throw new Error(this.lastError || "Không thể tải default keys");
        }
      }

      if (this.defaultKeys.length === 0) {
        this.lastError = `⚠️ Không có key nào khả dụng cho model "${this.modelValue}". Vui lòng thêm key mới hoặc liên hệ admin.`;
        throw new Error(this.lastError);
      }

      // Sắp xếp keys theo thời gian sử dụng cuối (key chưa dùng sẽ được ưu tiên)
      this.defaultKeys.sort((a, b) => {
        if (!a.lastUsed) return -1;
        if (!b.lastUsed) return 1;
        return new Date(a.lastUsed) - new Date(b.lastUsed);
      });

      // Lấy key đầu tiên (ít được sử dụng nhất)
      const selectedKey = this.defaultKeys[0];
      console.log("\n✅ Đã chọn default key để sử dụng:");
      console.log(`- Key: ${selectedKey.key.substring(0, 10)}...`);
      console.log(`- Lần sử dụng cuối: ${selectedKey.lastUsed ? new Date(selectedKey.lastUsed).toLocaleString() : 'Chưa sử dụng'}`);
      console.log(`- Số request: ${selectedKey.requestCount}`);

      return selectedKey.key;
    } catch (error) {
      this.lastError = error.message;
      console.error("❌ Lỗi khi lấy key:", error);
      throw error;
    }
  }

  // Xử lý lỗi 429 (Too Many Requests)
  async handle429Error(userId, key) {
    try {
      console.log(`\n⚠️ Phát hiện lỗi 429 (Too Many Requests) cho key ${key.substring(0, 10)}... với model ${this.modelValue}`);
      
      // Kiểm tra xem key có phải là key của user không
      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId,
          key,
          models: {
            some: {
              model: {
                value: this.modelValue
              }
            }
          }
        },
        include: {
          models: {
            where: {
              model: {
                value: this.modelValue
              }
            }
          }
        }
      });

      if (userKeyRecord) {
        console.log("🔒 Đây là key của user, chuyển sang trạng thái COOLDOWN cho model này");
        // Cập nhật trạng thái cho model cụ thể
        await prisma.userApiKeyToModel.updateMany({
          where: {
            userApiKeyId: userKeyRecord.id,
            model: {
              value: this.modelValue
            }
          },
          data: {
            status: "COOLDOWN",
            updatedAt: new Date()
          }
        });
        console.log(`✅ Đã cập nhật trạng thái key của user cho model ${this.modelValue}`);
      } else {
        console.log("🔑 Đây là default key, cập nhật trạng thái cho model này");
        // Cập nhật trạng thái cho model cụ thể
        await prisma.defaultKeyToModel.updateMany({
          where: {
            defaultKey: {
              key: key
            },
            model: {
              value: this.modelValue
            }
          },
          data: {
            status: "COOLDOWN",
            updatedAt: new Date()
          }
        });
        console.log(`✅ Đã cập nhật trạng thái default key cho model ${this.modelValue}`);
      }

      // Kiểm tra số lượng keys còn lại cho model này
      const remainingKeys = await prisma.defaultKeyToModel.count({
        where: {
          model: {
            value: this.modelValue
          },
          status: "ACTIVE"
        }
      });
      console.log(`📊 Còn ${remainingKeys} keys đang hoạt động cho model ${this.modelValue}`);
    } catch (error) {
      console.error("❌ Lỗi khi xử lý lỗi 429:", error);
    }
  }

  // Đánh dấu key đã hết quota
  async exhaustKey(userId, key) {
    try {
      console.log(`\n⚠️ Phát hiện key ${key.substring(0, 10)}... đã hết quota cho model ${this.modelValue}`);
      
      // Kiểm tra xem key có phải là key của user không
      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId,
          key,
          models: {
            some: {
              model: {
                value: this.modelValue
              }
            }
          }
        },
        include: {
          models: {
            where: {
              model: {
                value: this.modelValue
              }
            }
          }
        }
      });

      if (userKeyRecord) {
        console.log("🔒 Đây là key của user, đánh dấu là EXHAUSTED cho model này");
        // Cập nhật trạng thái cho model cụ thể
        await prisma.userApiKeyToModel.updateMany({
          where: {
            userApiKeyId: userKeyRecord.id,
            model: {
              value: this.modelValue
            }
          },
          data: {
            status: "EXHAUSTED",
            updatedAt: new Date()
          }
        });
        console.log(`✅ Đã cập nhật trạng thái key của user cho model ${this.modelValue}`);
      } else {
        console.log("🔑 Đây là default key, cập nhật trạng thái cho model này");
        // Cập nhật trạng thái cho model cụ thể
        await prisma.defaultKeyToModel.updateMany({
          where: {
            defaultKey: {
              key: key
            },
            model: {
              value: this.modelValue
            }
          },
          data: {
            status: "EXHAUSTED",
            updatedAt: new Date()
          }
        });
        console.log(`✅ Đã cập nhật trạng thái default key cho model ${this.modelValue}`);
      }

      // Kiểm tra số lượng keys còn lại cho model này
      const remainingKeys = await prisma.defaultKeyToModel.count({
        where: {
          model: {
            value: this.modelValue
          },
          status: "ACTIVE"
        }
      });
      console.log(`📊 Còn ${remainingKeys} keys đang hoạt động cho model ${this.modelValue}`);

      if (remainingKeys === 0) {
        console.log(`⚠️ Không còn key nào khả dụng cho model ${this.modelValue}!`);
        throw new Error(`Key ${key.substring(0, 10)}... đã không còn sử dụng được cho model ${this.modelValue}. Vui lòng thử model khác hoặc thêm key mới.`);
      }
    } catch (error) {
      console.error("❌ Lỗi khi đánh dấu key hết quota:", error);
      throw error;
    }
  }

  // Kiểm tra xem có key nào khả dụng không
  async hasAvailableKeys(userId, userKey = null) {
    try {
      console.log(`\n🔍 Kiểm tra keys khả dụng cho model ${this.modelValue}...`);
      
      // Kiểm tra userKey nếu có
      if (userKey) {
        console.log("🔑 Kiểm tra user key...");
        const userKeyRecord = await prisma.userApiKey.findFirst({
          where: {
            userId,
            key: userKey,
            models: {
              some: {
                model: {
                  value: this.modelValue
                },
                status: "ACTIVE"
              }
            }
          }
        });
        if (userKeyRecord) {
          console.log("✅ User key khả dụng cho model này");
          return true;
        }
        console.log("❌ User key không khả dụng cho model này");
      }

      // Kiểm tra default keys
      const availableKeys = await prisma.defaultKeyToModel.count({
        where: {
          model: {
            value: this.modelValue
          },
          status: "ACTIVE"
        }
      });

      console.log(`📊 Số lượng default keys khả dụng cho model ${this.modelValue}: ${availableKeys}`);
      return availableKeys > 0;
    } catch (error) {
      console.error("❌ Lỗi khi kiểm tra key khả dụng:", error);
      return false;
    }
  }

  // Lấy thông báo lỗi cuối cùng
  getLastError() {
    return this.lastError;
  }
}

module.exports = ApiKeyManager;
