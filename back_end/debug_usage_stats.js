const { prisma, toObjectId } = require("./config/prismaConfig");

async function debugUsageStats() {
  try {
    console.log("🔍 DEBUG USAGE STATS - Bắt đầu kiểm tra...\n");

    // 1. Kiểm tra dữ liệu hiện tại
    console.log("📊 1. Kiểm tra dữ liệu hiện tại");
    const allUserKeys = await prisma.userApiKey.findMany({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    console.log(`Tìm thấy ${allUserKeys.length} user keys`);

    if (allUserKeys.length === 0) {
      console.log("❌ Không có user keys nào");
      return;
    }

    // 2. Phân tích từng key
    console.log("\n📊 2. Phân tích từng key");
    allUserKeys.forEach((key, keyIndex) => {
      console.log(`\n🔑 Key ${keyIndex + 1}: ${key.key.substring(0, 10)}...`);
      console.log(`- Label: ${key.label}`);
      console.log(`- User ID: ${key.userId}`);
      console.log(`- Usage records: ${key.usage.length}`);

      if (key.usage.length === 0) {
        console.log("  ⚠️ Không có usage records");
        return;
      }

      key.usage.forEach((usage, usageIndex) => {
        console.log(`  📈 Usage ${usageIndex + 1}:`);
        console.log(`    - ID: ${usage.id}`);
        console.log(`    - Model: ${usage.model.label} (${usage.model.value})`);
        console.log(`    - Status: ${usage.status}`);
        console.log(`    - Usage Count: ${usage.usageCount}`);
        console.log(`    - Total Tokens: ${usage.totalTokens}`);
        console.log(`    - Last Used At: ${usage.lastUsedAt}`);
      });
    });

    // 3. Kiểm tra thống kê theo ngày
    console.log("\n📊 3. Kiểm tra thống kê theo ngày");
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log(`Thời gian filter: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    // Lấy tất cả usage records có lastUsedAt trong ngày hôm nay
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

    if (todayUsages.length > 0) {
      todayUsages.forEach((usage, index) => {
        console.log(`\n  📈 Usage ${index + 1}:`);
        console.log(`    - Key: ${usage.userApiKey.key.substring(0, 10)}...`);
        console.log(`    - Model: ${usage.model.label}`);
        console.log(`    - Usage Count: ${usage.usageCount}`);
        console.log(`    - Total Tokens: ${usage.totalTokens}`);
        console.log(`    - Last Used At: ${usage.lastUsedAt}`);
      });
    } else {
      console.log("  ❌ Không có usage records nào được sử dụng hôm nay");
    }

    // 4. Kiểm tra API endpoint logic
    console.log("\n📊 4. Test API endpoint logic");
    
    // Giả lập một user ID để test
    const testUserId = allUserKeys[0].userId;
    console.log(`Test với user ID: ${testUserId}`);

    // Logic giống như trong getTodayUsageStats
    const keysWithTodayUsage = await prisma.userApiKey.findMany({
      where: { userId: testUserId },
      select: {
        id: true,
        key: true,
        label: true,
        createdAt: true,
        updatedAt: true,
        usage: {
          select: {
            id: true,
            modelId: true,
            status: true,
            usageCount: true,
            promptTokens: true,
            completionTokens: true,
            totalTokens: true,
            lastUsedAt: true,
            model: {
              select: {
                id: true,
                value: true,
                label: true
              }
            }
          }
        }
      }
    });

    console.log(`Tìm thấy ${keysWithTodayUsage.length} keys cho user ${testUserId}`);

    const result = keysWithTodayUsage.map(key => {
      const todayUsage = key.usage.filter(u => {
        if (!u.lastUsedAt) return false;
        const lastUsedAt = new Date(u.lastUsedAt);
        return lastUsedAt >= startOfDay && lastUsedAt <= endOfDay;
      });

      console.log(`Key ${key.key.substring(0, 10)}... có ${todayUsage.length}/${key.usage.length} usage records hôm nay`);

      return {
        id: key.id,
        key: key.key,
        label: key.label,
        usage: todayUsage
      };
    });

    const keysWithUsage = result.filter(key => key.usage.length > 0);
    console.log(`\nKết quả API: ${keysWithUsage.length} keys có usage hôm nay`);

    // 5. Kiểm tra vấn đề có thể có
    console.log("\n📊 5. Phân tích vấn đề có thể có");

    // Kiểm tra xem có usage records nào có lastUsedAt null không
    const nullLastUsedAt = await prisma.userApiKeyUsage.findMany({
      where: {
        lastUsedAt: null
      },
      include: {
        userApiKey: true,
        model: true
      }
    });

    console.log(`Usage records có lastUsedAt null: ${nullLastUsedAt.length}`);
    if (nullLastUsedAt.length > 0) {
      console.log("  ⚠️ Có usage records chưa được sử dụng lần nào");
    }

    // Kiểm tra xem có usage records nào có usageCount > 0 nhưng lastUsedAt null không
    const inconsistentUsage = await prisma.userApiKeyUsage.findMany({
      where: {
        usageCount: { gt: 0 },
        lastUsedAt: null
      },
      include: {
        userApiKey: true,
        model: true
      }
    });

    console.log(`Usage records không nhất quán (usageCount > 0 nhưng lastUsedAt null): ${inconsistentUsage.length}`);
    if (inconsistentUsage.length > 0) {
      console.log("  ⚠️ Có dữ liệu không nhất quán");
    }

    // 6. Đề xuất giải pháp
    console.log("\n📊 6. Đề xuất giải pháp");
    
    if (todayUsages.length === 0) {
      console.log("🔧 Vấn đề: Không có usage records nào được cập nhật hôm nay");
      console.log("🔧 Giải pháp:");
      console.log("  1. Kiểm tra xem có sử dụng API translate không");
      console.log("  2. Kiểm tra xem updateUsageStats có được gọi không");
      console.log("  3. Kiểm tra xem usageId có được truyền đúng không");
    } else {
      console.log("✅ Có usage records được cập nhật hôm nay");
      console.log("🔧 Nếu frontend không hiển thị, có thể do:");
      console.log("  1. Logic hiển thị trong frontend có vấn đề");
      console.log("  2. API endpoint trả về sai format");
      console.log("  3. Caching trong frontend");
    }

    console.log("\n✅ Debug hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy debug
debugUsageStats();
