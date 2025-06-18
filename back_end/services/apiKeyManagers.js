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

  // Helper function để lấy thông tin user key
  async getUserKeyRecord(userId, userkey) {
    try {
      if (!userId || !userkey) {
        console.log("❌ Thiếu userId hoặc userkey");
        return null;
      }

      const userKeyRecord = await prisma.userApiKey.findFirst({
        where: {
          userId: toObjectId(userId),
          key: userkey,
          status: "ACTIVE"
        },
        select: {
          id: true,
          key: true,
          modelIds: true,
          status: true,
          usageCount: true,
          lastUsedAt: true
        }
      });

      if (!userKeyRecord) {
        console.log("❌ Không tìm thấy user key record");
        return null;
      }

      // Lấy thông tin chi tiết về models
      const models = await prisma.model.findMany({
        where: {
          id: { in: userKeyRecord.modelIds }
        },
        select: {
          id: true,
          value: true,
          label: true
        }
      });

      console.log("📝 Thông tin user key:", {
        keyId: userKeyRecord.id,
        modelIds: userKeyRecord.modelIds,
        models: models.map(m => m.value),
        status: userKeyRecord.status,
        usageCount: userKeyRecord.usageCount
      });

      return { ...userKeyRecord, models };
    } catch (err) {
      console.error("❌ Lỗi khi lấy thông tin user key:", err);
      return null;
    }
  }

  // Helper function để lấy thông tin default key
  async getDefaultKeyRecord(key) {
    try {
      if (!key) {
        console.log("❌ Thiếu key");
        return null;
      }

      const defaultKeyRecord = await prisma.defaultKey.findFirst({
        where: {
          key: key,
          status: "ACTIVE"
        },
        select: {
          id: true,
          key: true,
          modelIds: true,
          status: true,
          usageCount: true,
          lastUsedAt: true
        }
      });

      if (!defaultKeyRecord) {
        console.log("❌ Không tìm thấy default key record");
        return null;
      }

      console.log("📝 Thông tin default key:", {
        keyId: defaultKeyRecord.id,
        modelIds: defaultKeyRecord.modelIds,
        status: defaultKeyRecord.status,
        usageCount: defaultKeyRecord.usageCount
      });

      return defaultKeyRecord;
    } catch (err) {
      console.error("❌ Lỗi khi lấy thông tin default key:", err);
      return null;
    }
  }

  // Helper function để lấy default key tiếp theo
  async getNextDefaultKey(modelValue = null) {
    try {
      // Lấy model ID nếu có modelValue
      let modelId = null;
      if (modelValue) {
        const model = await prisma.model.findFirst({
          where: { value: modelValue }
        });
        if (!model) {
          console.log("❌ Không tìm thấy model:", modelValue);
          return null;
        }
        modelId = model.id;
      }

      // Tìm default key khả dụng
      const defaultKey = await prisma.defaultKey.findFirst({
        where: {
          status: "ACTIVE",
          ...(modelId && { modelIds: { has: modelId } })
        },
        orderBy: [
          { usageCount: 'asc' },  // Ưu tiên key ít dùng nhất
          { lastUsedAt: 'asc' }   // Nếu cùng số lần dùng, ưu tiên key lâu chưa dùng
        ]
      });

      if (!defaultKey) {
        console.log("❌ Không tìm thấy default key khả dụng");
        return null;
      }

      console.log("✅ Tìm thấy default key khả dụng:", {
        keyId: defaultKey.id,
        modelIds: defaultKey.modelIds,
        usageCount: defaultKey.usageCount,
        lastUsedAt: defaultKey.lastUsedAt
      });

      // Cập nhật thông tin sử dụng
      await prisma.defaultKey.update({
        where: { id: defaultKey.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      });

      return defaultKey.key;
    } catch (err) {
      console.error("❌ Lỗi khi lấy default key:", err);
      return null;
    }
  }

  // Lấy key để sử dụng
  async getKeyToUse(userId, userKeys = null, modelValue = null) {
    try {
      // Xử lý userKeys - có thể là array hoặc single key
      let keysToCheck = [];
      if (Array.isArray(userKeys)) {
        keysToCheck = userKeys;
        console.log(`🔍 Kiểm tra ${userKeys.length} keys từ danh sách đã chọn`);
      } else if (userKeys) {
        keysToCheck = [userKeys];
        console.log("🔍 Kiểm tra 1 key từ userKey");
      }

      // Nếu có userKeys và userId, kiểm tra từng key
      if (keysToCheck.length > 0 && userId) {
        for (const userKey of keysToCheck) {
          const userKeyRecord = await this.getUserKeyRecord(userId, userKey);
          if (userKeyRecord) {
            // Kiểm tra model có trong danh sách modelIds không
            if (modelValue && userKeyRecord.modelIds.length > 0) {
              const model = await prisma.model.findFirst({
                where: { value: modelValue }
              });
              if (!model || !userKeyRecord.modelIds.includes(model.id)) {
                console.log(`❌ Model ${modelValue} không được hỗ trợ bởi key ${userKey.substring(0, 10)}...`);
                continue; // Thử key tiếp theo
              }
            }
            console.log(`✅ Tìm thấy key khả dụng: ${userKey.substring(0, 10)}...`);
            return userKey;
          } else {
            console.log(`❌ Key ${userKey.substring(0, 10)}... không hợp lệ, thử key tiếp theo...`);
          }
        }
        
        // Nếu không tìm thấy key nào trong danh sách, thử tìm key khác từ user
        console.log("❌ Không tìm thấy key nào khả dụng trong danh sách, thử tìm key khác từ user...");
        const nextKey = await this.getAroundKeyFrom(userId, keysToCheck[0], modelValue);
        if (nextKey) {
          console.log("✅ Đã tìm thấy user key khác để sử dụng");
          return nextKey;
        }
        console.log("❌ Không tìm thấy user key khác, thử dùng default key...");
      }

      // Nếu không có userKeys hoặc userKeys không khả dụng, tìm default key
      console.log("🔍 Tìm default key...");
      const defaultKey = await this.getNextDefaultKey(modelValue);
      if (!defaultKey) {
        throw new Error("Không tìm thấy key khả dụng");
      }

      return defaultKey;
    } catch (err) {
      console.error("❌ Lỗi khi lấy key:", err);
      throw err;
    }
  }

  // Xử lý lỗi 429 (Too Many Requests)
  async handle429Error(userId, key) {
    try {
      console.log(
        `\n⚠️ Phát hiện lỗi 429 (Too Many Requests) cho key ${key.substring(
          0,
          10
        )}...`
      );

      // Kiểm tra xem là user key hay default key
      let keyRecord = null;
      if (userId) {
        keyRecord = await this.getUserKeyRecord(userId, key);
      }
      
      if (!keyRecord) {
        keyRecord = await this.getDefaultKeyRecord(key);
      }

      if (!keyRecord) {
        console.log("❌ Không tìm thấy thông tin key");
        throw new Error("KEY_NOT_FOUND");
      }

      // Cập nhật trạng thái key
      if (userId && keyRecord.id) {
        // Nếu là user key
        await prisma.userApiKey.update({
          where: { id: keyRecord.id },
          data: {
            status: "EXHAUSTED",
            lastUsedAt: new Date()
          }
        });
        console.log(`🔄 Đánh dấu user key đã hết quota`);

        // Thử lấy key khác từ user
        const nextKey = await this.getAroundKeyFrom(userId, key, this.modelValue);
        if (nextKey) {
          console.log("✅ Đã tìm thấy user key khác để sử dụng");
          return { key: nextKey, error: null };
        }

        // Nếu không tìm thấy key khác, trả về lỗi với thông tin chi tiết
        const availableModels = keyRecord.models
          .filter(m => m.value !== this.modelValue)
          .map(m => m.value);
        
        throw new Error(JSON.stringify({
          code: "KEY_EXHAUSTED",
          message: "Key đã hết quota cho model này",
          details: {
            currentModel: this.modelValue,
            availableModels: availableModels,
            suggestion: availableModels.length > 0 
              ? "Vui lòng chọn model khác hoặc thêm key mới" 
              : "Vui lòng thêm key mới"
          }
        }));
      } else {
        // Nếu là default key
        await prisma.defaultKey.update({
          where: { id: keyRecord.id },
          data: {
            status: "EXHAUSTED",
            lastUsedAt: new Date()
          }
        });
        console.log("🔄 Đánh dấu default key đã hết quota");

        // Thử lấy default key khác
        const nextDefaultKey = await this.getNextDefaultKey();
        if (nextDefaultKey) {
          console.log("✅ Đã tìm thấy default key khác để sử dụng");
          return { key: nextDefaultKey, error: null };
        }

        throw new Error(JSON.stringify({
          code: "DEFAULT_KEY_EXHAUSTED",
          message: "Không còn default key khả dụng",
          details: {
            suggestion: "Vui lòng thêm key của bạn hoặc thử lại sau"
          }
        }));
      }
    } catch (err) {
      console.error("❌ Lỗi khi xử lý lỗi 429:", err);
      if (err.message === "KEY_NOT_FOUND") {
        throw new Error(JSON.stringify({
          code: "KEY_NOT_FOUND",
          message: "Không tìm thấy thông tin key",
          details: {
            suggestion: "Vui lòng kiểm tra lại key của bạn"
          }
        }));
      }
      throw err;
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
      const userKeyRecord = await this.getUserKeyRecord(userId, key);

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
  async hasAvailableKeys(userKeys, userId, modelValue) {
    try {
      // Xử lý userKeys - có thể là array hoặc single key
      let keysToCheck = [];
      if (Array.isArray(userKeys)) {
        keysToCheck = userKeys;
        console.log(`🔍 Kiểm tra ${userKeys.length} keys từ danh sách đã chọn`);
      } else if (userKeys) {
        keysToCheck = [userKeys];
        console.log("🔍 Kiểm tra 1 key từ userKey");
      }

      // Kiểm tra userKeys và userId
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

      // Nếu có userKeys, kiểm tra từng key
      if (keysToCheck.length > 0) {
        for (const userKey of keysToCheck) {
          const userKeyRecord = await this.getUserKeyRecord(userId, userKey);
          if (userKeyRecord) {
            // Kiểm tra model có trong danh sách modelIds không
            if (modelValue && userKeyRecord.modelIds.length > 0) {
              const model = await prisma.model.findFirst({
                where: { value: modelValue }
              });
              if (!model || !userKeyRecord.modelIds.includes(model.id)) {
                console.log(`❌ Model ${modelValue} không được hỗ trợ bởi key ${userKey.substring(0, 10)}...`);
                continue; // Thử key tiếp theo
              }
            }
            console.log(`✅ Tìm thấy key khả dụng: ${userKey.substring(0, 10)}...`);
            return true;
          }
        }
        console.log("❌ Không có key nào trong danh sách khả dụng");
        return false;
      }

      // Nếu không có userKeys, kiểm tra default keys
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

      let modelIds = [];

      // Nếu có userId, thử lấy modelIds từ các key khác của user
      if (userId) {
        console.log(`\n🔍 Đang tìm các key khác của user ${userId}...`);
        
        // Lấy tất cả key khác của user (trừ key hiện tại)
        const userKeys = await prisma.userApiKey.findMany({
          where: {
            userId: toObjectId(userId),
            key: { not: key },
            status: 'ACTIVE'
          }
        });

        console.log(`📊 Tìm thấy ${userKeys.length} key khác của user`);

        if (userKeys && userKeys.length > 0) {
          // Gộp tất cả modelIds từ các key khác
          modelIds = [...new Set(userKeys.flatMap(k => k.modelIds))];
          console.log(`✅ Tìm thấy ${modelIds.length} models từ các key khác của user`);
        } else {
          console.log('ℹ️ Không tìm thấy key khác của user, thử tìm từ default keys...');
          
          // Nếu không có key khác, lấy từ default keys
          const defaultKeys = await prisma.defaultKey.findMany({
            where: {
              status: 'ACTIVE'
            }
          });

          if (defaultKeys && defaultKeys.length > 0) {
            // Gộp tất cả modelIds từ default keys
            modelIds = [...new Set(defaultKeys.flatMap(k => k.modelIds))];
            console.log(`✅ Tìm thấy ${modelIds.length} models từ default keys`);
          }
        }
      }

      // Nếu vẫn không có modelIds, lấy tất cả model của provider
      if (modelIds.length === 0) {
        console.log('ℹ️ Không tìm thấy modelIds từ key khác, sử dụng tất cả model của provider');
        modelIds = allProviderModels.map(m => m.id);
      }

      // Lọc các modelIds để chỉ lấy model của provider hiện tại
      const validModelIds = modelIds.filter(id => 
        allProviderModels.some(m => m.id === id)
      );

      // Lấy thông tin chi tiết của các model được chọn
      const selectedModels = allProviderModels.filter(m => validModelIds.includes(m.id));

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
      // Lấy model ID
      const model = await prisma.model.findFirst({
        where: { value: modelValue }
      });
      if (!model) {
        console.log("❌ Không tìm thấy model:", modelValue);
        return null;
      }

      // Tìm key khác của user có cùng model
      const nextKey = await prisma.userApiKey.findFirst({
        where: {
          userId: toObjectId(userId),
          key: { not: currentKey },
          status: "ACTIVE",
          modelIds: { has: model.id }
        },
        orderBy: { lastUsedAt: 'asc' } // Ưu tiên key ít dùng nhất
      });

      if (nextKey) {
        console.log("✅ Tìm thấy key khác:", nextKey.key.substring(0, 10) + "...");
        return nextKey.key;
      }

      console.log("❌ Không tìm thấy key khác của user");
      return null;
    } catch (err) {
      console.error("❌ Lỗi khi tìm key khác:", err);
      return null;
    }
  }
}

module.exports = ApiKeyManager;