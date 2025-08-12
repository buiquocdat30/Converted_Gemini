const { prisma, toObjectId } = require("./config/prismaConfig");

async function testUpdateUsage() {
  try {
    console.log("🔍 Test cập nhật usage và thống kê...\n");

    // Lấy tất cả user keys
    const allKeys = await prisma.userApiKey.findMany({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    console.log(`📊 Tìm thấy ${allKeys.length} user keys`);

    if (allKeys.length === 0) {
      console.log("❌ Không có user keys nào để test");
      return;
    }

    // Chọn key đầu tiên để test
    const testKey = allKeys[0];
    console.log(`\n🔑 Test với key: ${testKey.key.substring(0, 10)}...`);

    if (testKey.usage.length === 0) {
      console.log("❌ Key này không có usage records");
      return;
    }

    // Cập nhật usage record đầu tiên
    const testUsage = testKey.usage[0];
    console.log(`📈 Cập nhật usage cho model: ${testUsage.model.label}`);

    // Cập nhật lastUsedAt thành hôm nay và tăng usage count
    const updatedUsage = await prisma.userApiKeyUsage.update({
      where: { id: testUsage.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 10 },
        promptTokens: { increment: 1000 },
        completionTokens: { increment: 500 },
        totalTokens: { increment: 1500 }
      }
    });

    console.log(`✅ Đã cập nhật usage record:`);
    console.log(`- Usage Count: ${testUsage.usageCount} → ${updatedUsage.usageCount}`);
    console.log(`- Total Tokens: ${testUsage.totalTokens} → ${updatedUsage.totalTokens}`);
    console.log(`- Last Used At: ${testUsage.lastUsedAt} → ${updatedUsage.lastUsedAt}`);

    // Test lại thống kê
    console.log("\n📊 Test lại thống kê sau khi cập nhật...");
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Lấy lại key đã cập nhật
    const updatedKey = await prisma.userApiKey.findFirst({
      where: { id: testKey.id },
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    console.log(`\n🔍 Kiểm tra key sau khi cập nhật:`);
    updatedKey.usage.forEach((usage, index) => {
      console.log(`\nUsage ${index + 1}:`);
      console.log(`- Model: ${usage.model.label}`);
      console.log(`- Status: ${usage.status}`);
      console.log(`- Usage Count: ${usage.usageCount}`);
      console.log(`- Total Tokens: ${usage.totalTokens}`);
      console.log(`- Last Used At: ${usage.lastUsedAt}`);
      
      if (usage.lastUsedAt) {
        const lastUsedAt = new Date(usage.lastUsedAt);
        const isUsedToday = lastUsedAt >= startOfDay && lastUsedAt <= endOfDay;
        console.log(`- Sử dụng hôm nay: ${isUsedToday ? '✅ Có' : '❌ Không'}`);
      }
    });

    // Test API endpoint logic
    console.log("\n🌐 Test logic API endpoint:");
    const todayUsage = updatedKey.usage.filter(u => {
      if (!u.lastUsedAt) return false;
      const lastUsedAt = new Date(u.lastUsedAt);
      return lastUsedAt >= startOfDay && lastUsedAt <= endOfDay;
    });

    console.log(`- Tổng usage records: ${updatedKey.usage.length}`);
    console.log(`- Usage records hôm nay: ${todayUsage.length}`);
    
    if (todayUsage.length > 0) {
      console.log("\n✅ Usage records hôm nay:");
      todayUsage.forEach((usage, index) => {
        console.log(`  ${index + 1}. ${usage.model.label}: ${usage.usageCount} lần, ${usage.totalTokens} tokens`);
      });
    } else {
      console.log("\n❌ Không có usage records hôm nay");
    }

    console.log("\n✅ Test hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy test
testUpdateUsage();
