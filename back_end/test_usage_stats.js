const { prisma, toObjectId } = require("./config/prismaConfig");

async function testUsageStats() {
  try {
    console.log("🔍 Bắt đầu test usage stats...\n");

    // Test 1: Lấy tất cả user keys và usage
    console.log("📊 Test 1: Lấy tất cả user keys và usage");
    const allKeys = await prisma.userApiKey.findMany({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    console.log(`Tìm thấy ${allKeys.length} user keys`);
    allKeys.forEach((key, index) => {
      console.log(`\nKey ${index + 1}: ${key.key.substring(0, 10)}...`);
      console.log(`- Label: ${key.label}`);
      console.log(`- Usage records: ${key.usage.length}`);
      key.usage.forEach((usage, uIndex) => {
        console.log(`  Usage ${uIndex + 1}:`);
        console.log(`    - Model: ${usage.model.label} (${usage.model.value})`);
        console.log(`    - Status: ${usage.status}`);
        console.log(`    - Usage Count: ${usage.usageCount}`);
        console.log(`    - Total Tokens: ${usage.totalTokens}`);
        console.log(`    - Last Used At: ${usage.lastUsedAt}`);
      });
    });

    // Test 2: Lấy thống kê theo ngày hôm nay (logic hiện tại)
    console.log("\n📊 Test 2: Thống kê theo ngày hôm nay (logic hiện tại)");
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log(`Thời gian filter: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    const todayKeys = await prisma.userApiKey.findMany({
      where: {
        usage: {
          some: {
            lastUsedAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }
      },
      include: {
        usage: {
          where: {
            lastUsedAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          include: {
            model: true
          }
        }
      }
    });

    console.log(`Tìm thấy ${todayKeys.length} keys có sử dụng hôm nay`);
    todayKeys.forEach((key, index) => {
      console.log(`\nKey ${index + 1}: ${key.key.substring(0, 10)}...`);
      console.log(`- Usage records hôm nay: ${key.usage.length}`);
      key.usage.forEach((usage, uIndex) => {
        console.log(`  Usage ${uIndex + 1}:`);
        console.log(`    - Model: ${usage.model.label}`);
        console.log(`    - Usage Count: ${usage.usageCount}`);
        console.log(`    - Last Used At: ${usage.lastUsedAt}`);
      });
    });

    // Test 3: Lấy tất cả usage records có lastUsedAt trong ngày hôm nay
    console.log("\n📊 Test 3: Tất cả usage records có lastUsedAt hôm nay");
    const todayUsages = await prisma.userApiKeyUsage.findMany({
      where: {
        lastUsedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        userApiKey: true,
        model: true
      }
    });

    console.log(`Tìm thấy ${todayUsages.length} usage records có lastUsedAt hôm nay`);
    todayUsages.forEach((usage, index) => {
      console.log(`\nUsage ${index + 1}:`);
      console.log(`- Key: ${usage.userApiKey.key.substring(0, 10)}...`);
      console.log(`- Model: ${usage.model.label}`);
      console.log(`- Usage Count: ${usage.usageCount}`);
      console.log(`- Last Used At: ${usage.lastUsedAt}`);
    });

    // Test 4: Kiểm tra logic tính toán thống kê theo ngày
    console.log("\n📊 Test 4: Logic tính toán thống kê theo ngày");
    const allUsages = await prisma.userApiKeyUsage.findMany({
      include: {
        userApiKey: true,
        model: true
      }
    });

    console.log(`Tổng số usage records: ${allUsages.length}`);
    
    // Phân tích từng usage record
    allUsages.forEach((usage, index) => {
      const lastUsedAt = usage.lastUsedAt;
      const isUsedToday = lastUsedAt && lastUsedAt >= startOfDay && lastUsedAt <= endOfDay;
      const isUsedYesterday = lastUsedAt && lastUsedAt >= new Date(startOfDay.getTime() - 24*60*60*1000) && lastUsedAt < startOfDay;
      
      console.log(`\nUsage ${index + 1}:`);
      console.log(`- Key: ${usage.userApiKey.key.substring(0, 10)}...`);
      console.log(`- Model: ${usage.model.label}`);
      console.log(`- Usage Count: ${usage.usageCount}`);
      console.log(`- Last Used At: ${lastUsedAt}`);
      console.log(`- Is Used Today: ${isUsedToday}`);
      console.log(`- Is Used Yesterday: ${isUsedYesterday}`);
      
      if (isUsedToday) {
        console.log(`  ✅ Được tính là sử dụng hôm nay`);
      }
    });

    // Test 5: Tạo dữ liệu test mới
    console.log("\n📊 Test 5: Tạo dữ liệu test mới");
    
    // Tìm một user key để test
    const testKey = await prisma.userApiKey.findFirst({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    if (testKey && testKey.usage.length > 0) {
      const testUsage = testKey.usage[0];
      console.log(`Test với key: ${testKey.key.substring(0, 10)}...`);
      console.log(`Model: ${testUsage.model.label}`);
      console.log(`Usage Count hiện tại: ${testUsage.usageCount}`);
      
      // Cập nhật lastUsedAt thành hôm nay
      const updatedUsage = await prisma.userApiKeyUsage.update({
        where: { id: testUsage.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 5 }
        }
      });
      
      console.log(`✅ Đã cập nhật usage record:`);
      console.log(`- Usage Count mới: ${updatedUsage.usageCount}`);
      console.log(`- Last Used At mới: ${updatedUsage.lastUsedAt}`);
    }

    console.log("\n✅ Test hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi trong test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy test
testUsageStats();
