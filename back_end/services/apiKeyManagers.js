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

  // ================= USER KEY =================
  // Quản lý, tạo, cập nhật, xóa, lấy usage cho User Key

  /**
   * Tạo user key mới và usage record cho từng model
   * @param {string} userId
   * @param {string} key
   * @param {string|null} label
   */
  async createUserKey(userId, key, label = null) {
    if (!userId || !key) throw new Error("Thiếu userId hoặc key");
    try {
      console.log(`\n🔑 Đang tạo API key mới cho user ${userId}...`);
      // Kiểm tra key đã tồn tại chưa
      const existingKey = await prisma.userApiKey.findFirst({
        where: { 
          key: key,
          userId: userId
        }
      });
      if (existingKey) {
        throw new Error('Bạn đã thêm key này trước đó');
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
      // Tạo key mới
      const newKey = await prisma.userApiKey.create({
        data: {
          userId,
          key,
          label: label || `${provider.toUpperCase()} Key`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      // Tạo usage record cho từng model
      for (const model of models) {
        await prisma.userApiKeyUsage.create({
          data: {
            userApiKeyId: newKey.id,
            modelId: model.id,
            status: "ACTIVE",
            usageCount: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            lastUsedAt: null,
          }
        });
      }
      console.log(`\n✅ Đã tạo key mới thành công và usage cho từng model!`);
      return { ...newKey, models };
    } catch (error) {
      this.lastError = `❌ Lỗi khi tạo key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  /**
   * Cập nhật usage record cho user key (theo usageId)
   * @param {string} usageId
   * @param {object} usage
   * @param {boolean} isUserKey
   */
  async updateUsageStats(usageId, usage, isUserKey = true) {
    if (!usageId || !usage) {
      console.error("❌ usageId hoặc dữ liệu sử dụng bị thiếu để cập nhật thống kê.");
      return;
    }
    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usage;
    try {
      if (isUserKey) {
        await prisma.userApiKeyUsage.update({
          where: { id: usageId },
          data: {
            usageCount: { increment: 1 },
            promptTokens: { increment: promptTokenCount || 0 },
            completionTokens: { increment: candidatesTokenCount || 0 },
            totalTokens: { increment: totalTokenCount || 0 },
            lastUsedAt: new Date(),
          },
        });
        console.log(`📊 Đã cập nhật usage cho user key usageId: ${usageId}`);
      } else {
        await prisma.defaultKeyUsage.update({
          where: { id: usageId },
          data: {
            usageCount: { increment: 1 },
            promptTokens: { increment: promptTokenCount || 0 },
            completionTokens: { increment: candidatesTokenCount || 0 },
            totalTokens: { increment: totalTokenCount || 0 },
            lastUsedAt: new Date(),
          },
        });
        console.log(`📊 Đã cập nhật usage cho default key usageId: ${usageId}`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi cập nhật usage cho usageId ${usageId}:`, error);
    }
  }

  /**
   * Đánh dấu usage record hết quota hoặc cooldown
   * @param {string} usageId
   * @param {string} status
   * @param {boolean} isUserKey
   */
  async exhaustKey(usageId, status = "EXHAUSTED", isUserKey = true) {
    try {
      if (!usageId) throw new Error("Thiếu usageId");
      if (status !== "EXHAUSTED" && status !== "COOLDOWN") throw new Error("Trạng thái không hợp lệ");
      if (isUserKey) {
        await prisma.userApiKeyUsage.update({
          where: { id: usageId },
          data: {
            status: status,
            lastUsedAt: new Date(),
          },
        });
        console.log(`🔄 Đã cập nhật trạng thái ${status} cho user key usageId: ${usageId}`);
      } else {
        await prisma.defaultKeyUsage.update({
          where: { id: usageId },
          data: {
            status: status,
            lastUsedAt: new Date(),
          },
        });
        console.log(`🔄 Đã cập nhật trạng thái ${status} cho default key usageId: ${usageId}`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi cập nhật trạng thái ${status} cho usageId ${usageId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy key khả dụng cho user hoặc default key cho 1 model
   * @param {string} userId
   * @param {string|array|null} userKeys
   * @param {string} modelValue
   * @returns { key, usageId }
   */
  async getKeyToUse(userId, userKeys = null, modelValue = null) {
    try {
      // Lấy modelId từ modelValue
      let model = null;
      if (!modelValue) throw new Error("Thiếu thông tin model");
      model = await prisma.model.findFirst({ where: { value: modelValue } });
      if (!model) throw new Error("Không tìm thấy model");

      // Ưu tiên key của user
      if (userId) {
        // Lấy tất cả key của user (nếu userKeys truyền vào thì chỉ lấy các key đó)
        let userKeyFilter = { userId: toObjectId(userId) };
        if (userKeys) {
          userKeyFilter.key = Array.isArray(userKeys) ? { in: userKeys } : userKeys;
        }
        const userApiKeys = await prisma.userApiKey.findMany({ where: userKeyFilter });
        if (userApiKeys.length > 0) {
          // Tìm usage record ACTIVE cho đúng model
          for (const userKey of userApiKeys) {
            const usage = await prisma.userApiKeyUsage.findFirst({
              where: {
                userApiKeyId: userKey.id,
                modelId: model.id,
                status: "ACTIVE"
              },
              orderBy: [
                { usageCount: "asc" },
                { lastUsedAt: "asc" }
              ]
            });
            if (usage) {
              console.log(`✅ Tìm thấy user key khả dụng: ${userKey.key.substring(0, 10)}... cho model ${modelValue}`);
              return { key: userKey.key, usageId: usage.id };
            }
          }
        }
      }

      // Nếu không có user key khả dụng, tìm default key
      const defaultKeys = await prisma.defaultKey.findMany();
      console.log(`🔍 Tìm thấy ${defaultKeys.length} default keys`);
      
      for (const defaultKey of defaultKeys) {
        // Kiểm tra xem có usage record cho model này không
        let usage = await prisma.defaultKeyUsage.findFirst({
          where: {
            defaultKeyId: defaultKey.id,
            modelId: model.id,
            status: "ACTIVE"
          },
          orderBy: [
            { usageCount: "asc" },
            { lastUsedAt: "asc" }
          ]
        });

        // Nếu không có usage record, tạo mới
        if (!usage) {
          console.log(`📝 Tạo usage record mới cho default key ${defaultKey.key.substring(0, 10)}... và model ${modelValue}`);
          try {
            usage = await prisma.defaultKeyUsage.create({
              data: {
                defaultKeyId: defaultKey.id,
                modelId: model.id,
                status: "ACTIVE",
                usageCount: 0,
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                lastUsedAt: null,
              }
            });
            console.log(`✅ Đã tạo usage record cho default key`);
          } catch (error) {
            console.error(`❌ Lỗi khi tạo usage record:`, error);
            continue; // Thử key tiếp theo
          }
        }

        if (usage) {
          console.log(`✅ Tìm thấy default key khả dụng: ${defaultKey.key.substring(0, 10)}... cho model ${modelValue}`);
          return { key: defaultKey.key, usageId: usage.id };
        }
      }

      console.log(`❌ Không tìm thấy key khả dụng cho model ${modelValue}`);
      throw new Error("Không tìm thấy key khả dụng cho model này");
    } catch (err) {
      console.error("❌ Lỗi khi lấy key khả dụng:", err);
      throw err;
    }
  }

  // ================= DEFAULT KEY =================
  // Quản lý, tạo, cập nhật, xóa, lấy usage cho Default Key

  /**
   * Tạo default key mới và usage record cho từng model
   * @param {string} key
   * @param {array} modelValues
   * @param {string|null} label
   */
  async createDefaultKey(key, modelValues = [], label = null) {
    if (!key || !Array.isArray(modelValues) || modelValues.length === 0) throw new Error("Thiếu key hoặc danh sách model");
    try {
      console.log(`\n🔑 Đang tạo default key mới...`);
      // Kiểm tra key đã tồn tại chưa
      const existingKey = await prisma.defaultKey.findFirst({ where: { key } });
      if (existingKey) {
        throw new Error('Key này đã tồn tại');
      }
      // Lấy danh sách model theo value
      const models = await prisma.model.findMany({ where: { value: { in: modelValues } } });
      if (models.length === 0) throw new Error('Không tìm thấy model nào phù hợp');
      // Tạo default key mới
      const newKey = await prisma.defaultKey.create({
        data: {
          key,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      // Tạo usage record cho từng model
      for (const model of models) {
        await prisma.defaultKeyUsage.create({
          data: {
            defaultKeyId: newKey.id,
            modelId: model.id,
            status: "ACTIVE",
            usageCount: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            lastUsedAt: null,
          }
        });
      }
      console.log(`\n✅ Đã tạo default key mới thành công và usage cho từng model!`);
      return { ...newKey, models };
    } catch (error) {
      this.lastError = `❌ Lỗi khi tạo default key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  /**
   * Xóa default key và toàn bộ usage liên quan
   * @param {string} defaultKeyId
   */
  async deleteDefaultKey(defaultKeyId) {
    try {
      if (!defaultKeyId) throw new Error('Thiếu id của default key');
      // Xóa toàn bộ usage trước
      await prisma.defaultKeyUsage.deleteMany({ where: { defaultKeyId } });
      // Xóa default key
      await prisma.defaultKey.delete({ where: { id: defaultKeyId } });
      console.log(`✅ Đã xóa default key và toàn bộ usage liên quan!`);
      return true;
    } catch (error) {
      this.lastError = `❌ Lỗi khi xóa default key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái usage của default key cho 1 model
   * @param {string} defaultKeyId
   * @param {string} modelId
   * @param {string} status
   */
  async updateDefaultKeyUsageStatus(defaultKeyId, modelId, status) {
    try {
      if (!defaultKeyId || !modelId) throw new Error('Thiếu id');
      if (!["ACTIVE", "EXHAUSTED", "COOLDOWN"].includes(status)) throw new Error('Trạng thái không hợp lệ');
      await prisma.defaultKeyUsage.updateMany({
        where: { defaultKeyId, modelId },
        data: { status, lastUsedAt: new Date() }
      });
      console.log(`✅ Đã cập nhật trạng thái usage của default key ${defaultKeyId} cho model ${modelId} thành ${status}`);
      return true;
    } catch (error) {
      this.lastError = `❌ Lỗi khi cập nhật trạng thái usage default key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  /**
   * Lấy danh sách default key và usage theo model
   * @param {string|null} modelValue
   */
  async getDefaultKeysWithUsage(modelValue = null) {
    try {
      let model = null;
      if (modelValue) {
        model = await prisma.model.findFirst({ where: { value: modelValue } });
        if (!model) throw new Error('Không tìm thấy model');
      }
      const defaultKeys = await prisma.defaultKey.findMany({
        include: {
          usage: model ? {
            where: { modelId: model.id },
          } : true
        }
      });
      return defaultKeys;
    } catch (error) {
      this.lastError = `❌ Lỗi khi lấy danh sách default key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  // ================= HELPER =================
  // (Nếu cần, chỉ giữ lại các hàm helper thao tác với usage record)

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
  async determineProviderAndModel(key, userId = null) {
    try {
      console.log(`\n🔍 Đang xác định provider và model cho key ${key.substring(0, 10)}...`);

      // Xác định provider từ format key
      let provider;
      if (key.startsWith('AI')) {
        provider = 'Google';
      } else if (key.startsWith('sk-')) {
        provider = 'OpenAI';
      } else {
        throw new Error('Key không hợp lệ, không xác định được provider');
      }

      // Lấy provider từ database
      const providerRecord = await prisma.provider.findFirst({
        where: { name: provider }
      });

      if (!providerRecord) {
        throw new Error(`Không tìm thấy provider ${provider}`);
      }

      // Lấy tất cả models của provider
      const allProviderModels = await prisma.model.findMany({
        where: {
          providerId: providerRecord.id
        }
      });

      if (!allProviderModels || allProviderModels.length === 0) {
        throw new Error(`Không tìm thấy models của provider ${provider}`);
      }

      // Sử dụng tất cả models của provider cho key mới
      const selectedModels = allProviderModels;
      const validModelIds = selectedModels.map(m => m.id);

      console.log("\n📋 Kết quả xác định provider và model:", {
        provider: provider,
        totalModels: allProviderModels.length,
        selectedModels: selectedModels.length,
        modelValues: selectedModels.map(m => m.value)
      });

      return {
        provider: provider,
        modelIds: validModelIds,
        models: selectedModels
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
      
      // Xác định provider và models từ key
      const { provider, models } = await this.determineProviderAndModel(key);
      
      if (provider === 'Google') {
        try {
          // Thử với model đầu tiên để kiểm tra key
          const genAI = new GoogleGenerativeAI(key);
          const testModel = models[0]; // Lấy model đầu tiên để test
          const geminiModel = genAI.getGenerativeModel({ model: testModel.value });

          // Thử một request đơn giản
          const prompt = "Test connection";
          const result = await geminiModel.generateContent(prompt);
          const response = await result.response;
          
          console.log(`✅ Key Google hợp lệ và có thể sử dụng với ${models.length} models`);
          return true;
        } catch (error) {
          console.error(`❌ Key Google không hợp lệ:`, error.message);
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

  /**
   * Xử lý lỗi 429 (Too Many Requests) - đánh dấu key vào cooldown
   * @param {string} userId
   * @param {string} key
   */
  async handle429Error(userId, key) {
    try {
      console.log(`\n🔄 Đang xử lý lỗi 429 cho key ${key.substring(0, 10)}...`);
      
      // Tìm usage record của key này
      const userKey = await prisma.userApiKey.findFirst({
        where: {
          key: key,
          userId: toObjectId(userId)
        }
      });

      if (userKey) {
        // Đánh dấu tất cả usage records của key này vào cooldown
        await prisma.userApiKeyUsage.updateMany({
          where: {
            userApiKeyId: userKey.id
          },
          data: {
            status: "COOLDOWN"
          }
        });
        console.log(`✅ Đã đánh dấu key ${key.substring(0, 10)}... vào cooldown`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi xử lý 429 error:`, error);
    }
  }

  /**
   * Kiểm tra xem còn key khả dụng không
   * @param {array} keysToUse
   * @param {string} userId
   * @param {string} modelValue
   * @returns {boolean}
   */
  async hasAvailableKeys(keysToUse, userId, modelValue) {
    try {
      // Lấy modelId từ modelValue
      const model = await prisma.model.findFirst({ where: { value: modelValue } });
      if (!model) return false;

      // Kiểm tra user keys
      if (userId) {
        let userKeyFilter = { userId: toObjectId(userId) };
        if (keysToUse && keysToUse.length > 0) {
          userKeyFilter.key = { in: keysToUse };
        }
        
        const userApiKeys = await prisma.userApiKey.findMany({ where: userKeyFilter });
        for (const userKey of userApiKeys) {
          const usage = await prisma.userApiKeyUsage.findFirst({
            where: {
              userApiKeyId: userKey.id,
              modelId: model.id,
              status: "ACTIVE"
            }
          });
          if (usage) return true;
        }
      }

      // Kiểm tra default keys
      const defaultKeys = await prisma.defaultKey.findMany();
      for (const defaultKey of defaultKeys) {
        const usage = await prisma.defaultKeyUsage.findFirst({
          where: {
            defaultKeyId: defaultKey.id,
            modelId: model.id,
            status: "ACTIVE"
          }
        });
        if (usage) return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Lỗi khi kiểm tra key khả dụng:", error);
      return false;
    }
  }

  // Lấy danh sách user keys
  async getUserKeys(userId) {
    if (!userId) return [];
    try {
      const keys = await prisma.userApiKey.findMany({
        where: { userId: toObjectId(userId) },
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
          createdAt: "desc",
        },
      });

      // Chuyển đổi dữ liệu để dễ sử dụng
      const formattedKeys = keys.map(key => ({
        ...key,
        models: key.usage.map(usage => ({
          id: usage.model.id,
          value: usage.model.value,
          label: usage.model.label,
          description: usage.model.description,
          rpm: usage.model.rpm,
          tpm: usage.model.tpm,
          rpd: usage.model.rpd,
          providerId: usage.model.providerId,
          provider: usage.model.provider,
          status: usage.status,
          usageCount: usage.usageCount,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          lastUsedAt: usage.lastUsedAt
        }))
      }));

      return formattedKeys;
    } catch (error) {
      console.error("Lỗi khi lấy user keys:", error);
      return [];
    }
  }

  /**
   * Xóa user key và tất cả usage records liên quan
   * @param {string} userId
   * @param {string} keyId
   */
  async deleteUserKey(userId, keyId) {
    if (!userId || !keyId) throw new Error("Thiếu userId hoặc keyId");
    try {
      console.log(`\n🗑️ Đang xóa key ${keyId} của user ${userId}...`);
      
      // Kiểm tra key có thuộc về user không
      const existingKey = await prisma.userApiKey.findFirst({
        where: { 
          id: keyId,
          userId: toObjectId(userId)
        }
      });
      
      if (!existingKey) {
        throw new Error('Không tìm thấy key hoặc key không thuộc về user này');
      }

      // Xóa tất cả usage records trước
      await prisma.userApiKeyUsage.deleteMany({
        where: {
          userApiKeyId: keyId
        }
      });

      // Xóa key
      await prisma.userApiKey.delete({
        where: {
          id: keyId
        }
      });

      console.log(`✅ Đã xóa key ${keyId} và tất cả usage records thành công!`);
    } catch (error) {
      this.lastError = `❌ Lỗi khi xóa key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái của user key cho tất cả models
   * @param {string} userId
   * @param {string} keyId
   * @param {string} status
   */
  async updateKeyStatus(userId, keyId, status) {
    if (!userId || !keyId || !status) throw new Error("Thiếu userId, keyId hoặc status");
    if (!['ACTIVE', 'COOLDOWN', 'EXHAUSTED'].includes(status)) {
      throw new Error("Trạng thái không hợp lệ");
    }
    
    try {
      console.log(`\n🔄 Đang cập nhật trạng thái ${status} cho key ${keyId} của user ${userId}...`);
      
      // Kiểm tra key có thuộc về user không
      const existingKey = await prisma.userApiKey.findFirst({
        where: { 
          id: keyId,
          userId: toObjectId(userId)
        }
      });
      
      if (!existingKey) {
        throw new Error('Không tìm thấy key hoặc key không thuộc về user này');
      }

      // Cập nhật trạng thái cho tất cả usage records
      await prisma.userApiKeyUsage.updateMany({
        where: {
          userApiKeyId: keyId
        },
        data: {
          status: status
        }
      });

      console.log(`✅ Đã cập nhật trạng thái ${status} cho key ${keyId} thành công!`);
      
      // Trả về key đã cập nhật
      return await this.getUserKeys(userId).then(keys => 
        keys.find(key => key.id === keyId)
      );
    } catch (error) {
      this.lastError = `❌ Lỗi khi cập nhật trạng thái key: ${error.message}`;
      console.error(this.lastError);
      throw error;
    }
  }
}

module.exports = ApiKeyManager;