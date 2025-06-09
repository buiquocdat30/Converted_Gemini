const { prisma, toObjectId } = require("../config/prismaConfig");
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
      
      // Query cơ bản cho model
      const modelQuery = {
        where: {
          value: this.modelValue
        },
        include: {
          provider: true
        }
      };

      const model = await prisma.model.findFirst(modelQuery);

      if (!model) {
        console.log("❌ Không tìm thấy model:", this.modelValue);
        return null;
      }

      console.log("✅ Tìm thấy model:", {
        id: model.id,
        value: model.value,
        label: model.label,
        provider: model.provider.name
      });

      // Chỉ query defaultKeys khi cần
      if (!this.userKey) {
        const defaultKeys = await prisma.defaultKey.findMany({
          where: {
            modelIds: {
              has: model.id
            },
            status: "ACTIVE"
          }
        });

        if (defaultKeys && defaultKeys.length > 0) {
          console.log(`📊 Số lượng default keys: ${defaultKeys.length}`);
          model.defaultKeys = defaultKeys;
        }
      }

      return model;
    } catch (error) {
      console.error("❌ Lỗi khi tải thông tin model:", error);
      return null;
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

      // Lấy tất cả default keys của model dựa vào modelIds
      const defaultKeys = await prisma.defaultKey.findMany({
        where: {
          modelIds: {
            has: modelLoaded.id // Tìm các key có modelId trong mảng modelIds
          },
          status: "ACTIVE"
        }
      });

      console.log("\n📊 Thống kê default keys:");
      console.log(`- Tổng số keys tìm thấy: ${defaultKeys.length}`);

      if (defaultKeys.length === 0) {
        console.log("⚠️ Không tìm thấy default key nào cho model này!");
        return false;
      }

      console.log("\n📋 Chi tiết từng key:");
      defaultKeys.forEach((key, index) => {
        console.log(`\n🔑 Key ${index + 1}: ${key.key.substring(0, 10)}...`);
        console.log(`- Trạng thái: ${key.status}`);
        console.log(`- Số lần sử dụng: ${key.usageCount}`);
        console.log(
          `- Lần sử dụng cuối: ${
            key.lastUsedAt
              ? new Date(key.lastUsedAt).toLocaleString()
              : "Chưa sử dụng"
          }`
        );
        console.log(`- Số lượng models hỗ trợ: ${key.modelIds.length}`);
      });

      // Chuyển đổi dữ liệu để lưu vào this.defaultKeys
      this.defaultKeys = defaultKeys.map((k) => ({
        key: k.key,
        lastUsed: k.lastUsedAt || null,
        requestCount: k.usageCount || 0,
        modelStatus: k.status,
      }));

      return true;
    } catch (error) {
      this.lastError = `❌ Lỗi khi tải default keys: ${error.message}`;
      console.error(this.lastError);
      return false;
    }
  }

  // Lấy key để sử dụng
  async getKeyToUse(userId, userKey = null, modelValue = null) {
  console.log("userId", userId)
  console.log("userKey", userKey)
  console.log("modelValue", modelValue)

    try {
      this.lastError = null;
      
      // Nếu không có modelValue, sử dụng giá trị mặc định từ constructor
      const targetModelValue = modelValue || this.modelValue;
      
      if (!targetModelValue) {
        throw new Error("Không có model value để kiểm tra");
      }

      console.log(`🔍 Đang tìm key khả dụng cho model ${targetModelValue}...`);
      console.log(`- UserId: ${userId || 'Không có'}`);
      console.log(`- UserKey: ${userKey ? 'Có' : 'Không có'}`);

      // Tìm model theo value trước
      const model = await prisma.model.findFirst({
        where: { value: targetModelValue }
      });

      if (!model) {
        throw new Error(`Không tìm thấy model ${targetModelValue}`);
      }

      // Kiểm tra userKey nếu có
      if (userKey && userId) {
        console.log("🔑 Kiểm tra user key...");
        try {
          // Chuyển đổi userId sang ObjectId
          const userIdObjectId = toObjectId(userId);

          // Tìm key của user
          const userKeyRecord = await prisma.userApiKey.findFirst({
            where: {
              AND: [
                { userId: userIdObjectId },
                { key: userKey },
                { status: "ACTIVE" },
                { modelIds: { has: model.id } }
              ]
            },
            include: {
              user: {
                select: {
                  username: true
                }
              }
            }
          });

          if (userKeyRecord) {
            console.log("✅ Tìm thấy user key khả dụng");
            console.log(`- Label: ${userKeyRecord.label || "Không có nhãn"}`);
            console.log(`- User: ${userKeyRecord.user.username}`);
            console.log(`- Model: ${targetModelValue}`);
            console.log(`- Trạng thái: ${userKeyRecord.status}`);
            console.log(`- Số lần sử dụng: ${userKeyRecord.usageCount}`);
            console.log(`- Lần sử dụng cuối: ${
              userKeyRecord.lastUsedAt 
                ? new Date(userKeyRecord.lastUsedAt).toLocaleString()
                : "Chưa sử dụng"
            }`);

            // Cập nhật thông tin sử dụng
            await prisma.userApiKey.update({
              where: { id: userKeyRecord.id },
              data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date()
              }
            });

            return userKeyRecord.key; // Trả về key string
          } else {
            console.log("❌ User key không khả dụng, đang tìm default key...");
          }
        } catch (error) {
          console.log(`⚠️ Lỗi khi kiểm tra user key: ${error.message}`);
          console.log("🔄 Chuyển sang tìm default key...");
        }
      } else {
        console.log("ℹ️ Không có user key hoặc userId, tìm default key...");
      }

      // Tìm default key
      console.log("🔍 Đang tìm default key...");
      const defaultKey = await prisma.defaultKey.findFirst({
        where: {
          AND: [
            { status: "ACTIVE" },
            { modelIds: { has: model.id } }
          ]
        },
        orderBy: [
          { usageCount: 'asc' },
          { lastUsedAt: 'asc' }
        ]
      });

      if (defaultKey) {
        console.log("✅ Tìm thấy default key khả dụng");
        console.log(`- Model: ${targetModelValue}`);
        console.log(`- Trạng thái: ${defaultKey.status}`);
        console.log(`- Số lần sử dụng: ${defaultKey.usageCount}`);
        console.log(`- Lần sử dụng cuối: ${
          defaultKey.lastUsedAt 
            ? new Date(defaultKey.lastUsedAt).toLocaleString()
            : "Chưa sử dụng"
        }`);

        // Cập nhật thông tin sử dụng
        await prisma.defaultKey.update({
          where: { id: defaultKey.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        });

        return defaultKey.key; // Trả về key string
      }

      this.lastError = "⚠️ Không tìm thấy key khả dụng nào";
      console.log(this.lastError);
      return null;

    } catch (error) {
      console.error("❌ Lỗi khi tìm key khả dụng:", error);
      this.lastError = error.message;
      return null;
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
  async hasAvailableKeys(userKey, userId, modelValue) {
    try {
      // Kiểm tra userKey và userId
      if (!userId) {
        console.log("❌ userId không được để trống");
        return false;
      }

      // Tìm model ID từ model value
      let modelId = null;
      if (modelValue) {
        const model = await prisma.model.findFirst({
          where: {
            value: modelValue
          },
          include: {
            provider: true
          }
        });
        if (!model) {
          console.log("❌ Không tìm thấy model:", modelValue);
          return false;
        }
        modelId = model.id;
        console.log("🔍 Tìm thấy model ID:", modelId, "cho model value:", modelValue);
      }

      // Nếu có userKey, kiểm tra key đó trước
      if (userKey) {
        try {
          // Kiểm tra key có hợp lệ không
          const isValid = await this.determineProviderAndModel(userKey);
          if (!isValid) {
            console.log("❌ Key không hợp lệ hoặc không xác định được provider/model");
            return false;
          }

          // Lấy thông tin key từ database
          const keyInfo = await prisma.userApiKey.findFirst({
            where: { 
              userId: toObjectId(userId),
              key: userKey,
              status: 'ACTIVE'
            }
          });

          if (!keyInfo) {
            console.log("❌ Không tìm thấy key trong database");
            return false;
          }

          console.log("📝 Thông tin key:", {
            keyId: keyInfo.id,
            modelIds: keyInfo.modelIds,
            status: keyInfo.status
          });

          // Kiểm tra model có trong danh sách modelIds của key không
          if (modelId && !keyInfo.modelIds.includes(modelId)) {
            console.log("❌ Model không được hỗ trợ bởi key này");
            console.log("Model ID cần:", modelId);
            console.log("Model IDs của key:", keyInfo.modelIds);
            return false;
          }

          return true;
        } catch (error) {
          if (error.message.includes("ID không hợp lệ")) {
            console.error("❌ Lỗi userId không hợp lệ:", userId);
            return false;
          }
          console.error("❌ Lỗi khi kiểm tra user key:", error);
          return false;
        }
      }

      // Nếu không có userKey, kiểm tra default keys
      try {
        // 1. Kiểm tra model tồn tại
        if (!modelId) {
          console.log("❌ Không có modelId để kiểm tra default keys");
          return false;
        }

        // 2. Tìm các DefaultKey có chứa modelId trong mảng modelIds
        const defaultKeys = await prisma.defaultKey.findMany({
          where: {
            status: 'ACTIVE',
            modelIds: {
              has: modelId  // Prisma hỗ trợ mảng với toán tử `has`
            }
          }
        });

        if (!defaultKeys || defaultKeys.length === 0) {
          console.log("❌ Không có default key nào cho model này:", modelValue);
          return false;
        }

        console.log("📝 Số lượng default keys khả dụng:", defaultKeys.length);
        return true;

      } catch (err) {
        console.error("❌ Lỗi khi kiểm tra default keys:", err);
        this.lastError = err.message;
        return false;
      }

    } catch (err) {
      console.error("❌ Lỗi khi kiểm tra keys:", err);
      this.lastError = err.message;
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

  async getAroundKeyFrom(userId, currentKey, modelValue) {
    try {
      console.log("🔄 Đang tìm key khác để thử...");
      
      // Tìm model ID trước
      const model = await prisma.model.findFirst({
        where: { value: modelValue }
      });

      if (!model) {
        console.log("❌ Không tìm thấy model:", modelValue);
        return null;
      }

      // Nếu có userId và currentKey, tìm key tiếp theo từ danh sách key của user
      if (userId && currentKey) {
        try {
          const userKeys = await prisma.userApiKey.findMany({
            where: {
              userId: toObjectId(userId),
              status: 'ACTIVE',
              modelIds: {
                has: model.id
              },
              NOT: {
                key: currentKey // Loại bỏ key hiện tại
              }
            }
          });

          if (userKeys && userKeys.length > 0) {
            const nextKey = userKeys[0]; // Lấy key đầu tiên vì đã lọc theo modelIds
            console.log("✅ Tìm thấy key khác của user để thử:", nextKey.key.substring(0, 10) + "...");
            return nextKey.key;
          }
        } catch (error) {
          console.log("⚠️ Không thể tìm key của user, thử dùng default key");
        }
      }

      // Nếu không tìm thấy key của user, thử dùng default key
      const defaultKeys = await prisma.defaultKey.findMany({
        where: {
          modelIds: {
            has: model.id
          },
          status: 'ACTIVE'
        }
      });

      if (defaultKeys && defaultKeys.length > 0) {
        const defaultKey = defaultKeys[0];
        console.log("✅ Sử dụng default key:", defaultKey.key.substring(0, 10) + "...");
        return defaultKey.key;
      }

      console.log("❌ Không tìm thấy key nào khác để thử");
      return null;
    } catch (error) {
      console.error("❌ Lỗi khi tìm key khác:", error);
      return null;
    }
  }
}

module.exports = ApiKeyManager;
