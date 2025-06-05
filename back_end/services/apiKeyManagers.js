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
            where: { status: "ACTIVE" },
          },
        },
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

      console.log(
        "\n🔍 Kiểm tra chi tiết default keys cho model:",
        this.modelValue
      );

      // Lấy tất cả default keys của model thông qua bảng trung gian DefaultKeyToModel
      const defaultKeys = await prisma.defaultKey.findMany({
        where: {
          models: {
            some: {
              model: {
                value: this.modelValue,
              },
              status: "ACTIVE", // Chỉ lấy các key có trạng thái ACTIVE cho model này
            },
          },
        },
        include: {
          models: {
            where: {
              model: {
                value: this.modelValue,
              },
            },
            include: {
              model: true,
            },
          },
        },
      });

      console.log("\n📊 Thống kê default keys:");
      console.log(`- Tổng số keys tìm thấy: ${defaultKeys.length}`);

      if (defaultKeys.length === 0) {
        console.log("⚠️ Không tìm thấy default key nào cho model này!");
        return false;
      }

      console.log("\n📋 Chi tiết từng key:");
      defaultKeys.forEach((key, index) => {
        const modelStatus = key.models.find(
          (m) => m.model.value === this.modelValue
        );
        console.log(`\n🔑 Key ${index + 1}: ${key.key.substring(0, 10)}...`);
        console.log(
          `- Trạng thái cho model ${this.modelValue}: ${
            modelStatus?.status || "UNKNOWN"
          }`
        );
        console.log(
          `- Số lần sử dụng cho model này: ${modelStatus?.usageCount || 0}`
        );
        console.log(
          `- Lần sử dụng cuối cho model này: ${
            modelStatus?.lastUsedAt
              ? new Date(modelStatus.lastUsedAt).toLocaleString()
              : "Chưa sử dụng"
          }`
        );
        console.log(`- Tổng số models có thể dùng: ${key.models.length}`);
      });

      // Chuyển đổi dữ liệu để lưu vào this.defaultKeys
      this.defaultKeys = defaultKeys.map((k) => {
        const modelStatus = k.models.find(
          (m) => m.model.value === this.modelValue
        );
        return {
          key: k.key,
          lastUsed: modelStatus?.lastUsedAt || null,
          requestCount: modelStatus?.usageCount || 0,
          modelStatus: modelStatus?.status || "UNKNOWN",
        };
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
            models: {
              some: {
                model: {
                  value: this.modelValue,
                },
                status: "ACTIVE",
              },
            },
          },
          include: {
            models: {
              where: {
                model: {
                  value: this.modelValue,
                },
              },
              include: {
                model: true,
              },
            },
            usageStats: {
              orderBy: {
                lastUsedAt: "desc",
              },
              take: 1,
            },
          },
        });

        if (userKeyRecord) {
          const modelStatus = userKeyRecord.models.find(
            (m) => m.model.value === this.modelValue
          );
          if (modelStatus && modelStatus.status === "ACTIVE") {
            console.log("✅ User key hợp lệ và đang hoạt động cho model này");
            console.log(`- Label: ${userKeyRecord.label || "Không có nhãn"}`);
            console.log(`- Model: ${this.modelValue}`);
            console.log(`- Trạng thái: ${modelStatus.status}`);
            console.log(
              `- Lần sử dụng cuối: ${
                userKeyRecord.usageStats[0]?.lastUsedAt
                  ? new Date(
                      userKeyRecord.usageStats[0].lastUsedAt
                    ).toLocaleString()
                  : "Chưa sử dụng"
              }`
            );
            console.log(
              `- Số request: ${userKeyRecord.usageStats[0]?.requestCount || 0}`
            );
            return userKey;
          } else {
            this.lastError = `⚠️ Key của user không khả dụng cho model ${
              this.modelValue
            } (Trạng thái: ${modelStatus?.status || "Không tìm thấy"})`;
            console.log(this.lastError);
          }
        } else {
          this.lastError = `⚠️ Key của user không tồn tại hoặc chưa được liên kết với model ${this.modelValue}`;
          console.log(this.lastError);
        }
      }

      // Nếu không có userKey hoặc key không hợp lệ, sử dụng default key
      console.log("📥 Đang tìm default key...");
      const defaultKeyRecord = await prisma.defaultKeyToModel.findFirst({
        where: {
          model: {
            value: this.modelValue,
          },
          status: "ACTIVE",
        },
        include: {
          defaultKey: true,
          model: true,
        },
        orderBy: {
          updatedAt: "asc",
        },
      });

      if (defaultKeyRecord) {
        console.log("\n✅ Đã tìm thấy default key khả dụng:");
        console.log(
          `- Key: ${defaultKeyRecord.defaultKey.key.substring(0, 10)}...`
        );
        console.log(`- Model: ${defaultKeyRecord.model.value}`);
        console.log(`- Trạng thái: ${defaultKeyRecord.status}`);
        return defaultKeyRecord.defaultKey.key;
      }

      this.lastError = `⚠️ Không có key nào khả dụng cho model "${this.modelValue}". Vui lòng thêm key mới hoặc liên hệ admin.`;
      throw new Error(this.lastError);
    } catch (error) {
      this.lastError = error.message;
      console.error("❌ Lỗi khi lấy key:", error);
      throw error;
    }
  }

  // Xử lý lỗi 429 (Too Many Requests)
  async handle429Error(userId, key) {
    try {
      console.log(
        `\n⚠️ Phát hiện lỗi 429 (Too Many Requests) cho key ${key.substring(
          0,
          10
        )}... với model ${this.modelValue}`
      );

      // Kiểm tra xem key có phải là key của user không
      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId,
          key,
          models: {
            some: {
              model: {
                value: this.modelValue,
              },
            },
          },
        },
        include: {
          models: {
            where: {
              model: {
                value: this.modelValue,
              },
            },
          },
        },
      });

      if (userKeyRecord) {
        console.log(
          "🔒 Đây là key của user, chuyển sang trạng thái COOLDOWN cho model này"
        );
        // Cập nhật trạng thái cho model cụ thể
        await prisma.userApiKeyToModel.updateMany({
          where: {
            userApiKeyId: userKeyRecord.id,
            model: {
              value: this.modelValue,
            },
          },
          data: {
            status: "COOLDOWN",
            updatedAt: new Date(),
          },
        });
        console.log(
          `✅ Đã cập nhật trạng thái key của user cho model ${this.modelValue}`
        );
      } else {
        console.log("🔑 Đây là default key, cập nhật trạng thái cho model này");
        // Cập nhật trạng thái cho model cụ thể
        await prisma.defaultKeyToModel.updateMany({
          where: {
            defaultKey: {
              key: key,
            },
            model: {
              value: this.modelValue,
            },
          },
          data: {
            status: "COOLDOWN",
            updatedAt: new Date(),
          },
        });
        console.log(
          `✅ Đã cập nhật trạng thái default key cho model ${this.modelValue}`
        );
      }

      // Kiểm tra số lượng keys còn lại cho model này
      const remainingKeys = await prisma.defaultKeyToModel.count({
        where: {
          model: {
            value: this.modelValue,
          },
          status: "ACTIVE",
        },
      });
      console.log(
        `📊 Còn ${remainingKeys} keys đang hoạt động cho model ${this.modelValue}`
      );
    } catch (error) {
      console.error("❌ Lỗi khi xử lý lỗi 429:", error);
    }
  }

  // Đánh dấu key đã hết quota
  async exhaustKey(userId, key) {
    try {
      console.log(
        `\n⚠️ Phát hiện key ${key.substring(0, 10)}... đã hết quota cho model ${
          this.modelValue
        }`
      );

      // Kiểm tra xem key có phải là key của user không
      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId,
          key,
          models: {
            some: {
              model: {
                value: this.modelValue,
              },
            },
          },
        },
        include: {
          models: {
            where: {
              model: {
                value: this.modelValue,
              },
            },
          },
        },
      });

      if (userKeyRecord) {
        console.log(
          "🔒 Đây là key của user, đánh dấu là EXHAUSTED cho model này"
        );
        // Cập nhật trạng thái cho model cụ thể
        await prisma.userApiKeyToModel.updateMany({
          where: {
            userApiKeyId: userKeyRecord.id,
            model: {
              value: this.modelValue,
            },
          },
          data: {
            status: "EXHAUSTED",
            updatedAt: new Date(),
          },
        });
        console.log(
          `✅ Đã cập nhật trạng thái key của user cho model ${this.modelValue}`
        );
      } else {
        console.log("🔑 Đây là default key, cập nhật trạng thái cho model này");
        // Cập nhật trạng thái cho model cụ thể
        await prisma.defaultKeyToModel.updateMany({
          where: {
            defaultKey: {
              key: key,
            },
            model: {
              value: this.modelValue,
            },
          },
          data: {
            status: "EXHAUSTED",
            updatedAt: new Date(),
          },
        });
        console.log(
          `✅ Đã cập nhật trạng thái default key cho model ${this.modelValue}`
        );
      }

      // Kiểm tra số lượng keys còn lại cho model này
      const remainingKeys = await prisma.defaultKeyToModel.count({
        where: {
          model: {
            value: this.modelValue,
          },
          status: "ACTIVE",
        },
      });
      console.log(
        `📊 Còn ${remainingKeys} keys đang hoạt động cho model ${this.modelValue}`
      );

      if (remainingKeys === 0) {
        console.log(
          `⚠️ Không còn key nào khả dụng cho model ${this.modelValue}!`
        );
        throw new Error(
          `Key ${key.substring(0, 10)}... đã không còn sử dụng được cho model ${
            this.modelValue
          }. Vui lòng thử model khác hoặc thêm key mới.`
        );
      }
    } catch (error) {
      console.error("❌ Lỗi khi đánh dấu key hết quota:", error);
      throw error;
    }
  }

  // Kiểm tra xem có key nào khả dụng không
  async hasAvailableKeys(userId, userKey = null) {
    try {
      console.log(
        `\n🔍 Kiểm tra keys khả dụng cho model ${this.modelValue}...`
      );

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
                  value: this.modelValue,
                },
                status: "ACTIVE",
              },
            },
          },
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
            value: this.modelValue,
          },
          status: "ACTIVE",
        },
      });

      console.log(
        `📊 Số lượng default keys khả dụng cho model ${this.modelValue}: ${availableKeys}`
      );
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
