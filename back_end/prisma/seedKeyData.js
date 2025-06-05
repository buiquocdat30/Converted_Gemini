const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function seedDefaultKeys() {
    try {
        console.log("\n🔍 Bắt đầu quá trình seed keys...");
        console.log("📡 Đang kết nối database...");

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

            // Thêm từng key cho từng model
            for (const key of providerKeys.keys) {
                const trimmedKey = key.trim();
                if (!trimmedKey) continue;

                console.log(`\n🔑 Đang xử lý key: ${trimmedKey.substring(0, 10)}...`);

                try {
                    // Kiểm tra xem key đã tồn tại chưa
                    console.log("🔍 Kiểm tra key đã tồn tại...");
                    const existingKey = await prisma.defaultKey.findUnique({
                        where: { key: trimmedKey },
                        include: {
                            models: {
                                include: {
                                    model: true
                                }
                            }
                        }
                    });

                    if (existingKey) {
                        console.log("✅ Key đã tồn tại, kiểm tra models cần kết nối thêm...");
                        // Nếu key đã tồn tại, kiểm tra xem có cần thêm kết nối với models mới không
                        const existingModelIds = existingKey.models.map(m => m.model.id);
                        const newModelIds = modelsToAdd
                            .filter(model => !existingModelIds.includes(model.id))
                            .map(model => model.id);

                        if (newModelIds.length > 0) {
                            console.log(`📝 Cần kết nối thêm ${newModelIds.length} models mới`);
                            // Thêm kết nối với các models mới
                            await prisma.defaultKeyToModel.createMany({
                                data: newModelIds.map(modelId => ({
                                    defaultKeyId: existingKey.id,
                                    modelId
                                }))
                            });
                            console.log(`✅ Đã thêm kết nối cho key ${trimmedKey.substring(0, 10)}... với ${newModelIds.length} models mới`);
                        } else {
                            console.log(`⏭️ Key ${trimmedKey.substring(0, 10)}... đã tồn tại và đã kết nối với tất cả models`);
                        }
                        continue;
                    }

                    console.log("📝 Tạo key mới và kết nối với models...");
                    // Tạo key mới và kết nối với tất cả models của provider
                    const newKey = await prisma.defaultKey.create({
                        data: {
                            key: trimmedKey,
                            status: 'ACTIVE',
                            models: {
                                create: modelsToAdd.map(model => ({
                                    model: {
                                        connect: { id: model.id }
                                    }
                                }))
                            }
                        },
                        include: {
                            models: {
                                include: {
                                    model: true
                                }
                            }
                        }
                    });

                    console.log(`✅ Đã thêm key ${trimmedKey.substring(0, 10)}... cho ${modelsToAdd.length} models`);
                    console.log("📋 Chi tiết models đã kết nối:");
                    newKey.models.forEach(modelRelation => {
                        console.log(`  • ${modelRelation.model.label} (${modelRelation.model.value})`);
                    });
                } catch (error) {
                    console.error(`❌ Lỗi khi thêm key ${trimmedKey.substring(0, 10)}...:`, error.message);
                }
            }
        }

        // Thống kê cuối cùng
        console.log("\n📊 Thống kê tổng hợp:");
        const totalKeys = await prisma.defaultKey.count();
        console.log(`- Tổng số default keys: ${totalKeys}`);

        // Liệt kê chi tiết theo provider
        for (const provider of providers) {
            const providerKeys = await prisma.defaultKey.findMany({
                where: {
                    models: {
                        some: {
                            model: {
                                providerId: provider.id
                            }
                        }
                    }
                },
                include: {
                    models: {
                        include: {
                            model: true
                        }
                    }
                },
                distinct: ['key']
            });

            if (providerKeys.length > 0) {
                console.log(`\n📌 Provider ${provider.name}:`);
                console.log(`- Số lượng keys: ${providerKeys.length}`);
                providerKeys.forEach(key => {
                    console.log(`\n🔑 Key: ${key.key.substring(0, 10)}...`);
                    console.log(`- Số lượng models đã kết nối: ${key.models.length}`);
                    console.log("- Danh sách models:");
                    key.models.forEach(modelRelation => {
                        console.log(`  • ${modelRelation.model.label} (${modelRelation.model.value})`);
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