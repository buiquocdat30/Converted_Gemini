const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function seedDefaultKeys() {
    try {
        console.log("\n🔍 Bắt đầu quá trình seed keys...");
        console.log("📡 Đang kết nối database...");

        // Xóa các bảng trung gian cũ nếu còn tồn tại
        console.log("\n🧹 Đang dọn dẹp dữ liệu cũ...");
        try {
            await prisma.$executeRaw`DROP TABLE IF EXISTS "DefaultKeyToModel"`;
            await prisma.$executeRaw`DROP TABLE IF EXISTS "UserApiKeyToModel"`;
            console.log("✅ Đã xóa các bảng trung gian cũ");
        } catch (error) {
            console.log("ℹ️ Không tìm thấy bảng trung gian để xóa");
        }

        // Lấy tất cả providers và models
        console.log("\n📦 Đang lấy danh sách providers và models...");
        const providers = await prisma.provider.findMany({
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

        // Log chi tiết về providers và models
        console.log("\n📊 Thông tin providers và models:");
        providers.forEach(provider => {
            console.log(`\n🔹 Provider: ${provider.name} (ID: ${provider.id})`);
            console.log(`📚 Số lượng models: ${provider.models.length}`);
            console.log("📝 Danh sách models:");
            provider.models.forEach(model => {
                console.log(`  • ${model.label} (${model.value})`);
                console.log(`    - ID: ${model.id}`);
                console.log(`    - Mô tả: ${model.description || 'Không có'}`);
            });
        });

        console.log(`\n✅ Đã tìm thấy ${providers.length} providers`);

        // Default keys cho từng provider (nhiều key phân cách bằng dấu phẩy)
        const defaultKeys = {
            // Google provider
            "google": {
                keys: (process.env.GOOGLE_API_KEY || "AIzaSyDEFAULT_KEY_GOOGLE").split(',').filter(key => key.trim())
            },
            // OpenAI provider
            "openai": {
                keys: (process.env.OPENAI_API_KEY || "sk-DEFAULT_KEY_OPENAI").split(',').filter(key => key.trim())
            }
        };

        console.log("\n🔑 Thông tin keys từ biến môi trường:");
        Object.entries(defaultKeys).forEach(([provider, data]) => {
            console.log(`\n📌 Provider ${provider}:`);
            console.log(`- Số lượng keys: ${data.keys.length}`);
            console.log("- Danh sách keys:");
            data.keys.forEach((key, index) => {
                console.log(`  ${index + 1}. ${key.substring(0, 10)}...`);
            });
        });

        // Thêm default keys cho từng provider
        for (const provider of providers) {
            const providerKeys = defaultKeys[provider.name.toLowerCase()];
            if (!providerKeys) {
                console.log(`\n⚠️ Không tìm thấy default keys cho provider ${provider.name}`);
                continue;
            }

            // Lấy tất cả models của provider từ database
            const modelsToAdd = provider.models;

            console.log(`\n📝 Xử lý provider ${provider.name}:`);
            console.log(`- Số lượng keys cần thêm: ${providerKeys.keys.length}`);
            console.log(`- Số lượng models cần kết nối: ${modelsToAdd.length}`);
            console.log("- Danh sách models sẽ kết nối:");
            modelsToAdd.forEach(model => {
                console.log(`  • ${model.label} (${model.value})`);
            });

            // Thêm từng key
            for (const key of providerKeys.keys) {
                const trimmedKey = key.trim();
                if (!trimmedKey) continue;

                console.log(`\n🔑 Đang xử lý key: ${trimmedKey.substring(0, 10)}...`);

                try {
                    // Kiểm tra xem key đã tồn tại chưa
                    console.log("🔍 Kiểm tra key đã tồn tại...");
                    const existingKey = await prisma.defaultKey.findUnique({
                        where: { key: trimmedKey }
                    });

                    if (existingKey) {
                        console.log("✅ Key đã tồn tại, cập nhật danh sách models...");
                        // Cập nhật modelIds cho key hiện có
                        const modelIds = modelsToAdd.map(model => model.id);
                        await prisma.defaultKey.update({
                            where: { id: existingKey.id },
                            data: {
                                modelIds: modelIds
                            }
                        });
                        console.log(`✅ Đã cập nhật key ${trimmedKey.substring(0, 10)}... với ${modelIds.length} models`);
                    } else {
                        console.log("📝 Tạo key mới...");
                        // Tạo key mới với danh sách modelIds
                        const modelIds = modelsToAdd.map(model => model.id);
                        const newKey = await prisma.defaultKey.create({
                            data: {
                                key: trimmedKey,
                                status: 'ACTIVE',
                                modelIds: modelIds
                            }
                        });

                        console.log(`✅ Đã thêm key ${trimmedKey.substring(0, 10)}... cho ${modelIds.length} models`);
                    }
                } catch (error) {
                    console.error(`❌ Lỗi khi thêm key ${trimmedKey.substring(0, 10)}...:`, error.message);
                }
            }
        }

        // Cập nhật UserApiKey để thêm modelIds
        console.log("\n🔄 Đang cập nhật UserApiKey...");
        const userApiKeys = await prisma.userApiKey.findMany({
            where: {
                modelIds: {
                    isEmpty: true // Tìm các key chưa có modelIds
                }
            }
        });

        if (userApiKeys.length > 0) {
            console.log(`📝 Tìm thấy ${userApiKeys.length} UserApiKey cần cập nhật`);
            
            for (const userKey of userApiKeys) {
                try {
                    // Lấy tất cả models của provider tương ứng
                    const provider = await prisma.provider.findFirst({
                        where: {
                            models: {
                                some: {
                                    value: {
                                        contains: userKey.key.includes('sk-') ? 'gpt' : 'gemini'
                                    }
                                }
                            }
                        },
                        include: {
                            models: true
                        }
                    });

                    if (provider) {
                        const modelIds = provider.models.map(model => model.id);
                        await prisma.userApiKey.update({
                            where: { id: userKey.id },
                            data: {
                                modelIds: modelIds
                            }
                        });
                        console.log(`✅ Đã cập nhật UserApiKey ${userKey.key.substring(0, 10)}... với ${modelIds.length} models`);
                    }
                } catch (error) {
                    console.error(`❌ Lỗi khi cập nhật UserApiKey ${userKey.key.substring(0, 10)}...:`, error.message);
                }
            }
        } else {
            console.log("✅ Không có UserApiKey nào cần cập nhật");
        }

        // Thống kê cuối cùng
        console.log("\n📊 Thống kê tổng hợp:");
        const totalKeys = await prisma.defaultKey.count();
        console.log(`- Tổng số default keys: ${totalKeys}`);

        // Liệt kê chi tiết theo provider
        for (const provider of providers) {
            const providerKeys = await prisma.defaultKey.findMany({
                where: {
                    modelIds: {
                        hasSome: provider.models.map(model => model.id)
                    }
                },
                distinct: ['key']
            });

            if (providerKeys.length > 0) {
                console.log(`\n📌 Provider ${provider.name}:`);
                console.log(`- Số lượng keys: ${providerKeys.length}`);
                providerKeys.forEach(key => {
                    console.log(`\n🔑 Key: ${key.key.substring(0, 10)}...`);
                    console.log(`- Số lượng models: ${key.modelIds.length}`);
                    // Lấy thông tin chi tiết về các models
                    const keyModels = provider.models.filter(model => 
                        key.modelIds.includes(model.id)
                    );
                    console.log("- Danh sách models:");
                    keyModels.forEach(model => {
                        console.log(`  • ${model.label} (${model.value})`);
                    });
                });
            }
        }

    } catch (error) {
        console.error("\n❌ Lỗi khi thêm default keys:", error);
    } finally {
        await prisma.$disconnect();
        console.log("\n🔌 Đã ngắt kết nối database");
    }
}

// Chạy seed
console.log("\n🚀 Bắt đầu chạy script seed keys...");
seedDefaultKeys()
    .then(() => {
        console.log('\n🏁 Kết thúc quá trình seed thành công!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Lỗi không xử lý được:', error);
        process.exit(1);
    }); 