// back_end/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Tạo provider Google
  const googleProvider = await prisma.provider.create({
    data: {
      name: "google",
      models: {
        create: [
          {
            value: "gemini-1.5-pro",
            label: "Gemini 1.5 Pro",
            description: "Giới hạn miễn phí: 2 lần/phút, 50 lần một ngày.",
            rpm: 2,
            rpd: 50,
            tpm: 32000
          },
          {
            value: "gemini-1.5-flash",
            label: "Gemini 1.5 Flash", 
            description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
            rpm: 15,
            rpd: 1500,
            tpm: 1000000
          },
          {
            value: "gemini-1.5-flash-8b",
            label: "Gemini 1.5 Flash-8B",
            description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
            rpm: 15,
            rpd: 1500,
            tpm: 1000000
          },
          {
            value: "gemini-2.0-flash-lite",
            label: "Gemini 2.0 Flash-Lite",
            description: "Giới hạn miễn phí: 30 lần/phút, 1500 lần một ngày.",
            rpm: 30,
            rpd: 1500,
            tpm: 1000000
          },
          {
            value: "gemini-2.0-flash",
            label: "Gemini 2.0 Flash",
            description: "Giới hạn miễn phí: 15 lần/phút, 1500 lần một ngày.",
            rpm: 15,
            rpd: 1500,
            tpm: 1000000
          }
        ]
      }
    }
  });

  console.log('✅ Đã tạo dữ liệu mẫu thành công');

  // Thêm default keys từ biến môi trường
  const defaultKeys = process.env.DEFAULT_GEMINI_API_KEYS
    ? process.env.DEFAULT_GEMINI_API_KEYS.split(',')
    : [];

  if (defaultKeys.length > 0) {
    // Lấy model gemini-2.0-flash làm model mặc định
    const defaultModel = await prisma.model.findFirst({
      where: { value: 'gemini-2.0-flash' }
    });

    if (defaultModel) {
      // Xóa các default keys cũ
      await prisma.defaultKey.deleteMany({
        where: { modelId: defaultModel.id }
      });

      // Thêm các default keys mới
      for (const key of defaultKeys) {
        await prisma.defaultKey.create({
          data: {
            key: key.trim(),
            modelId: defaultModel.id
          }
        });
      }
      console.log(`✅ Đã thêm ${defaultKeys.length} default keys`);
    }
  } else {
    console.log('⚠️ Không có default keys trong biến môi trường');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
