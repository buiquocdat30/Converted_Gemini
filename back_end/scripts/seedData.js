const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedData() {
    try {
        console.log("🌱 Bắt đầu thêm dữ liệu OpenAI...");

        // Kiểm tra xem provider OpenAI đã tồn tại chưa
        const existingOpenAI = await prisma.provider.findFirst({
            where: { name: "OpenAI" }
        });

        if (existingOpenAI) {
            console.log("⚠️ Provider OpenAI đã tồn tại, bỏ qua...");
            return;
        }

        // Tạo provider OpenAI
        console.log("📦 Tạo provider OpenAI...");
        const openaiProvider = await prisma.provider.create({
            data: {
                name: "OpenAI",
                models: {
                    create: [
                        {
                            value: "gpt-4-turbo",
                            label: "GPT-4 Turbo",
                            description: "Model mạnh nhất của OpenAI, hỗ trợ đa ngôn ngữ và xử lý văn bản phức tạp",
                            rpm: 50,
                            tpm: 800000,
                            rpd: 800
                        },
                        {
                            value: "gpt-4-vision",
                            label: "GPT-4 Vision",
                            description: "Model GPT-4 với khả năng xử lý hình ảnh",
                            rpm: 40,
                            tpm: 600000,
                            rpd: 600
                        },
                        {
                            value: "gpt-3.5-turbo",
                            label: "GPT-3.5 Turbo",
                            description: "Model nhanh và hiệu quả, phù hợp cho các tác vụ thông thường",
                            rpm: 100,
                            tpm: 1800000,
                            rpd: 1800
                        },
                        {
                            value: "claude-3-opus",
                            label: "Claude 3 Opus",
                            description: "Model mạnh nhất của Anthropic, tích hợp với OpenAI",
                            rpm: 45,
                            tpm: 700000,
                            rpd: 700
                        }
                    ]
                }
            }
        });

        // Tạo default keys cho OpenAI models
        console.log("🔑 Tạo default keys cho OpenAI models...");
        const openaiModels = await prisma.model.findMany({
            where: { providerId: openaiProvider.id }
        });

        for (const model of openaiModels) {
            await prisma.defaultKey.create({
                data: {
                    key: `OPENAI_DEFAULT_KEY_${model.value.toUpperCase()}`,
                    value: model.value,
                    modelId: model.id
                }
            });
        }

        console.log("✅ Thêm dữ liệu OpenAI thành công!");
        console.log("\n📊 Thống kê:");
        console.log(`- Providers: ${await prisma.provider.count()}`);
        console.log(`- Models: ${await prisma.model.count()}`);
        console.log(`- Default Keys: ${await prisma.defaultKey.count()}`);

    } catch (error) {
        console.error("❌ Lỗi khi thêm dữ liệu OpenAI:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Chạy seed
seedData(); 