const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDefaultKeys() {
    try {
        console.log("🌱 Bắt đầu thêm default keys...");

        // Lấy tất cả providers và models
        const providers = await prisma.provider.findMany({
            include: {
                models: true
            }
        });

        console.log(`📦 Tìm thấy ${providers.length} providers`);

        // Default keys cho từng provider (nhiều key phân cách bằng dấu cách)
        const defaultKeys = {
            // Google provider
            "Google": {
                keys: (process.env.GOOGLE_API_KEY || "AIzaSyDEFAULT_KEY_GOOGLE").split(' ').filter(key => key.trim()),
                models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-pro"]
            },
            // OpenAI provider
            "OpenAI": {
                keys: (process.env.OPENAI_API_KEY || "sk-DEFAULT_KEY_OPENAI").split(' ').filter(key => key.trim()),
                models: ["gpt-4-turbo", "gpt-4-vision", "gpt-3.5-turbo", "claude-3-opus"]
            }
        };

        // Thêm default keys cho từng provider
        for (const provider of providers) {
            const providerKeys = defaultKeys[provider.name];
            if (!providerKeys) {
                console.log(`⚠️ Không tìm thấy default keys cho provider ${provider.name}`);
                continue;
            }

            // Lấy các models của provider cần thêm key
            const modelsToAdd = provider.models.filter(model => 
                providerKeys.models.includes(model.value)
            );

            console.log(`\n📝 Provider ${provider.name}:`);
            console.log(`- Số lượng keys: ${providerKeys.keys.length}`);
            console.log(`- Số lượng models cần thêm: ${modelsToAdd.length}`);

            // Thêm từng key cho từng model
            for (const key of providerKeys.keys) {
                console.log(`\n🔑 Đang xử lý key: ${key.substring(0, 10)}...`);

                for (const model of modelsToAdd) {
                    // Kiểm tra xem default key đã tồn tại chưa
                    const existingKey = await prisma.defaultKey.findFirst({
                        where: {
                            modelId: model.id,
                            key: key
                        }
                    });

                    if (existingKey) {
                        console.log(`⏭️ Key ${key.substring(0, 10)}... đã tồn tại cho model ${model.value}`);
                        continue;
                    }

                    // Tạo default key mới
                    await prisma.defaultKey.create({
                        data: {
                            key: key,
                            modelId: model.id,
                            value: model.value
                        }
                    });

                    console.log(`✅ Đã thêm key ${key.substring(0, 10)}... cho model ${model.value}`);
                }
            }
        }

        // Thống kê
        const totalKeys = await prisma.defaultKey.count();
        console.log("\n📊 Thống kê:");
        console.log(`- Tổng số default keys: ${totalKeys}`);

        // Liệt kê chi tiết theo provider
        for (const provider of providers) {
            const providerKeys = await prisma.defaultKey.findMany({
                where: {
                    model: {
                        providerId: provider.id
                    }
                },
                include: {
                    model: true
                },
                distinct: ['key']
            });

            if (providerKeys.length > 0) {
                console.log(`\n📌 Provider ${provider.name}:`);
                providerKeys.forEach(key => {
                    console.log(`\n🔑 Key: ${key.key.substring(0, 10)}...`);
                    console.log(`- Models:`);
                    const models = provider.models.filter(m => 
                        m.value === key.value
                    );
                    models.forEach(model => {
                        console.log(`  • ${model.label} (${model.value})`);
                    });
                });
            }
        }

    } catch (error) {
        console.error("❌ Lỗi khi thêm default keys:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Chạy seed
seedDefaultKeys(); 