const prisma = require("../config/prismaConfig");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class ApiKeyManager {
  constructor(modelValue) {
    this.modelValue = modelValue;
    this.defaultKeys = [];
    this.lastError = null;
    this.modelInfo = null;
    this.providerModels = null; // Cache danh sách models của provider
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

  // Lấy danh sách models của provider từ database
  async getProviderModels(key) {
    try {
      if (!this.providerModels) {
        // Xác định provider từ format key
        const isOpenAI = key.startsWith('sk-');
        
        // Tìm provider dựa vào format key
        const provider = await prisma.provider.findFirst({
          where: {
            models: {
              some: {
                value: {
                  contains: isOpenAI ? 'gpt' : 'gemini'
                }
              }
            }
          },
          include: {
            models: {
              select: {
                id: true,
                value: true,
                label: true,
                description: true
              }
            }
          }
        });

        if (!provider) {
          throw new Error(`Không tìm thấy provider cho key ${key.substring(0, 10)}...`);
        }

        this.providerModels = provider.models;
        console.log(`\n✅ Đã lấy ${this.providerModels.length} models của provider ${provider.name}:`);
        this.providerModels.forEach(model => {
          console.log(`  • ${model.label} (${model.value})`);
        });
      }
      return this.providerModels;
    } catch (error) {
      this.lastError = `❌ Lỗi khi lấy danh sách models: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  // Xác định provider và model từ key
  async determineProviderAndModel(key) {
    try {
      // Lấy danh sách models của provider
      const models = await this.getProviderModels(key);
      
      if (!models || models.length === 0) {
        throw new Error(`Không tìm thấy models cho key ${key.substring(0, 10)}...`);
      }

      // Lấy model mặc định (model đầu tiên trong danh sách)
      const defaultModel = models[0];
      
      // Xác định provider từ model
      const provider = await prisma.provider.findFirst({
        where: {
          models: {
            some: {
              id: defaultModel.id
            }
          }
        }
      });

      if (!provider) {
        throw new Error(`Không tìm thấy provider cho model ${defaultModel.value}`);
      }

      return {
        provider: provider.name,
        model: defaultModel,
        models: models // Trả về cả danh sách models để sử dụng sau này
      };
    } catch (error) {
      this.lastError = `❌ Lỗi khi xác định provider và model: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  // Kiểm tra key có hợp lệ không
  async validateKey(key) {
    try {
      console.log(`\n🔍 Đang kiểm tra key ${key.substring(0, 10)}...`);
      
      // Xác định provider và model từ key
      const { provider, model } = await this.determineProviderAndModel(key);
      
      if (provider === 'google') {
        try {
          // Khởi tạo model Gemini với model value từ database
          const genAI = new GoogleGenerativeAI(key);
          const geminiModel = genAI.getGenerativeModel({ model: model.value });

          // Thử một request đơn giản
          const prompt = "Test connection";
          const result = await geminiModel.generateContent(prompt);
          const response = await result.response;
          
          console.log(`✅ Key Google hợp lệ và có thể sử dụng với model ${model.label}`);
          return true;
        } catch (error) {
          console.error(`❌ Key Google không hợp lệ với model ${model.label}:`, error.message);
          return false;
        }
      } else {
        // TODO: Thêm validation cho OpenAI key
        console.log("⚠️ Chưa hỗ trợ validate OpenAI key");
        return true; // Tạm thời cho phép luôn
      }
    } catch (error) {
      console.error("❌ Lỗi khi validate key:", error.message);
      return false;
    }
  }

  // Lấy thông báo lỗi cuối cùng
  getLastError() {
    return this.lastError;
  }

  // Lấy tất cả API keys của user
  async getUserKeys(userId) {
    try {
      console.log(`\n🔍 Đang lấy danh sách API keys của user ${userId}...`);
      
      const keys = await prisma.userApiKey.findMany({
        where: { userId },
        select: {
          id: true,
          key: true,
          label: true,
          status: true,
          modelIds: true,
          usageCount: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Lấy thông tin chi tiết về models cho mỗi key
      const keysWithModels = await Promise.all(keys.map(async (key) => {
        const models = await prisma.model.findMany({
          where: { id: { in: key.modelIds } },
          select: {
            id: true,
            value: true,
            label: true,
            description: true
          }
        });
        return { ...key, models };
      }));

      console.log(`✅ Đã lấy ${keysWithModels.length} keys của user`);
      return keysWithModels;
    } catch (error) {
      this.lastError = `❌ Lỗi khi lấy danh sách keys: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  // Tạo API key mới cho user
  async createUserKey(userId, key, label = null) {
    try {
      console.log(`\n🔑 Đang tạo API key mới cho user ${userId}...`);
      
      // Kiểm tra key đã tồn tại chưa
      const existingKey = await prisma.userApiKey.findFirst({
        where: { 
          key: key,
          OR: [
            { userId: userId },
            { userId: { not: userId } }
          ]
        }
      });

      if (existingKey) {
        if (existingKey.userId === userId) {
          throw new Error('Bạn đã thêm key này trước đó');
        } else {
          throw new Error('Key này đã được sử dụng bởi người dùng khác');
        }
      }

      // Xác định provider và models từ key
      const { provider, models } = await this.determineProviderAndModel(key);
      
      // Kiểm tra key có hợp lệ không
      const isValid = await this.validateKey(key);
      if (!isValid) {
        throw new Error('Key không hợp lệ hoặc không có quyền truy cập model này');
      }

      console.log(`\n📝 Đang tạo key mới cho provider ${provider}:`);
      console.log(`- Số lượng models sẽ kết nối: ${models.length}`);
      console.log("- Danh sách models:");
      models.forEach(model => {
        console.log(`  • ${model.label} (${model.value})`);
      });

      // Tạo key mới với tất cả models của provider
      const newKey = await prisma.userApiKey.create({
        data: {
          userId,
          key,
          label: label || `${provider.toUpperCase()} Key`,
          status: 'ACTIVE',
          modelIds: models.map(model => model.id),
          usageCount: 0
        }
      });

      console.log(`\n✅ Đã tạo key mới thành công:`);
      console.log(`- Key: ${newKey.key.substring(0, 10)}...`);
      console.log(`- Provider: ${provider}`);
      console.log(`- Số lượng models: ${newKey.modelIds.length}`);

      return { ...newKey, models };
    } catch (error) {
      this.lastError = `❌ Lỗi khi tạo key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  // Xóa API key của user
  async deleteUserKey(userId, keyId) {
    try {
      if (!keyId) {
        throw new Error('ID của key không được để trống');
      }

      console.log(`\n🗑️ Đang xóa API key ${keyId} của user ${userId}...`);
      
      // Kiểm tra key có tồn tại và thuộc về user không
      const key = await prisma.userApiKey.findUnique({
        where: {
          id: keyId
        }
      });

      if (!key) {
        throw new Error('Không tìm thấy key');
      }

      if (key.userId !== userId) {
        throw new Error('Bạn không có quyền xóa key này');
      }

      // Xóa key
      await prisma.userApiKey.delete({
        where: {
          id: keyId
        }
      });

      console.log(`✅ Đã xóa key thành công`);
      return true;
    } catch (error) {
      this.lastError = `❌ Lỗi khi xóa key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  // Cập nhật trạng thái API key
  async updateKeyStatus(userId, keyId, status) {
    try {
      console.log(`\n🔄 Đang cập nhật trạng thái key ${keyId} thành ${status}...`);
      
      const key = await prisma.userApiKey.findFirst({
        where: {
          id: keyId,
          userId: userId
        }
      });

      if (!key) {
        throw new Error('Không tìm thấy key hoặc bạn không có quyền cập nhật key này');
      }

      const updatedKey = await prisma.userApiKey.update({
        where: { id: keyId },
        data: { status }
      });

      console.log(`✅ Đã cập nhật trạng thái key thành công`);
      return updatedKey;
    } catch (error) {
      this.lastError = `❌ Lỗi khi cập nhật trạng thái key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }
}

module.exports = ApiKeyManager;
