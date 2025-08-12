const { prisma, toObjectId } = require("./config/prismaConfig");
const ApiKeyManager = require('./services/apiKeyManagers');

async function testTranslateUsage() {
  try {
    console.log("🔍 Test cập nhật usage trong quá trình translate...\n");

    // Test 1: Kiểm tra cấu trúc usageMetadata
    console.log("📊 Test 1: Kiểm tra cấu trúc usageMetadata");
    const mockUsageMetadata = {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150
    };

    console.log("Mock usageMetadata:", mockUsageMetadata);

    // Test 2: Tìm user key và usage record để test
    console.log("\n📊 Test 2: Tìm user key và usage record");
    const userKeys = await prisma.userApiKey.findMany({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      },
      take: 1
    });

    if (userKeys.length === 0) {
      console.log("❌ Không có user keys nào để test");
      return;
    }

    const testKey = userKeys[0];
    console.log(`🔑 Test với key: ${testKey.key.substring(0, 10)}...`);

    if (testKey.usage.length === 0) {
      console.log("❌ Key này không có usage records");
      return;
    }

    const testUsage = testKey.usage[0];
    console.log(`📈 Usage record: ${testUsage.id}`);
    console.log(`- Model: ${testUsage.model.label}`);
    console.log(`- Status: ${testUsage.status}`);
    console.log(`- Usage Count: ${testUsage.usageCount}`);
    console.log(`- Total Tokens: ${testUsage.totalTokens}`);
    console.log(`- Last Used At: ${testUsage.lastUsedAt}`);

    // Test 3: Test hàm updateUsageStats
    console.log("\n📊 Test 3: Test hàm updateUsageStats");
    const keyManager = new ApiKeyManager();
    
    console.log("Trước khi cập nhật:");
    console.log(`- Usage Count: ${testUsage.usageCount}`);
    console.log(`- Total Tokens: ${testUsage.totalTokens}`);
    console.log(`- Last Used At: ${testUsage.lastUsedAt}`);

    // Gọi hàm updateUsageStats
    await keyManager.updateUsageStats(testUsage.id, mockUsageMetadata, true);

    // Kiểm tra kết quả sau khi cập nhật
    const updatedUsage = await prisma.userApiKeyUsage.findUnique({
      where: { id: testUsage.id }
    });

    console.log("\nSau khi cập nhật:");
    console.log(`- Usage Count: ${updatedUsage.usageCount}`);
    console.log(`- Total Tokens: ${updatedUsage.totalTokens}`);
    console.log(`- Last Used At: ${updatedUsage.lastUsedAt}`);

    // Test 4: Kiểm tra xem có được tính là sử dụng hôm nay không
    console.log("\n📊 Test 4: Kiểm tra thống kê theo ngày");
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const isUsedToday = updatedUsage.lastUsedAt && 
      updatedUsage.lastUsedAt >= startOfDay && 
      updatedUsage.lastUsedAt <= endOfDay;

    console.log(`- Sử dụng hôm nay: ${isUsedToday ? '✅ Có' : '❌ Không'}`);
    console.log(`- Thời gian filter: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
    console.log(`- Last Used At: ${updatedUsage.lastUsedAt}`);

    // Test 5: Test API endpoint logic
    console.log("\n📊 Test 5: Test API endpoint logic");
    const todayUsage = await prisma.userApiKeyUsage.findMany({
      where: {
        userApiKeyId: testKey.id,
        lastUsedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        model: true
      }
    });

    console.log(`- Tổng usage records của key: ${testKey.usage.length}`);
    console.log(`- Usage records hôm nay: ${todayUsage.length}`);

    if (todayUsage.length > 0) {
      console.log("\n✅ Usage records hôm nay:");
      todayUsage.forEach((usage, index) => {
        console.log(`  ${index + 1}. ${usage.model.label}: ${usage.usageCount} lần, ${usage.totalTokens} tokens`);
      });
    } else {
      console.log("\n❌ Không có usage records hôm nay");
    }

    // Test 6: Test getKeyToUse
    console.log("\n📊 Test 6: Test getKeyToUse");
    const keyResult = await keyManager.getKeyToUse(
      testKey.userId, 
      [testKey.key], 
      testUsage.model.value
    );

    console.log("Kết quả getKeyToUse:");
    console.log(`- Key: ${keyResult.key.substring(0, 10)}...`);
    console.log(`- UsageId: ${keyResult.usageId}`);
    console.log(`- IsUserKey: ${keyResult.isUserKey}`);

    console.log("\n✅ Test hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy test
testTranslateUsage();
