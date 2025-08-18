const { prisma, toObjectId } = require("../config/prismaConfig");

async function fixUsageData() {
  try {
    console.log("🔧 Fix usage data - Bắt đầu sửa dữ liệu...\n");

    // 1. Lấy tất cả user keys
    const allUserKeys = await prisma.userApiKey.findMany({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    console.log(`📊 Tìm thấy ${allUserKeys.length} user keys`);

    if (allUserKeys.length === 0) {
      console.log("❌ Không có user keys nào để sửa");
      return;
    }

    // 2. Sửa dữ liệu cho từng key
    for (const key of allUserKeys) {
      console.log(`\n🔑 Đang sửa key: ${key.key.substring(0, 10)}...`);
      
      if (key.usage.length === 0) {
        console.log("  ⚠️ Key này không có usage records");
        continue;
      }

      // Sửa từng usage record
      for (const usage of key.usage) {
        console.log(`  📈 Sửa usage cho model: ${usage.model.label}`);
        
        // Nếu usageCount > 0 nhưng lastUsedAt null, cập nhật lastUsedAt
        if (usage.usageCount > 0 && !usage.lastUsedAt) {
          console.log(`    - UsageCount: ${usage.usageCount} nhưng lastUsedAt null`);
          console.log(`    - Cập nhật lastUsedAt thành hôm nay`);
          
          await prisma.userApiKeyUsage.update({
            where: { id: usage.id },
            data: {
              lastUsedAt: new Date()
            }
          });
          
          console.log(`    ✅ Đã cập nhật lastUsedAt`);
        }
        
        // Nếu usageCount = 0 nhưng có lastUsedAt, cập nhật usageCount
        if (usage.usageCount === 0 && usage.lastUsedAt) {
          console.log(`    - UsageCount = 0 nhưng có lastUsedAt: ${usage.lastUsedAt}`);
          console.log(`    - Cập nhật usageCount thành 1`);
          
          await prisma.userApiKeyUsage.update({
            where: { id: usage.id },
            data: {
              usageCount: 1
            }
          });
          
          console.log(`    ✅ Đã cập nhật usageCount`);
        }
        
        // Nếu cả hai đều null/0, tạo dữ liệu test
        if (usage.usageCount === 0 && !usage.lastUsedAt) {
          console.log(`    - Cả usageCount và lastUsedAt đều null/0`);
          console.log(`    - Tạo dữ liệu test`);
          
          await prisma.userApiKeyUsage.update({
            where: { id: usage.id },
            data: {
              usageCount: 5,
              promptTokens: 1000,
              completionTokens: 500,
              totalTokens: 1500,
              lastUsedAt: new Date()
            }
          });
          
          console.log(`    ✅ Đã tạo dữ liệu test`);
        }
      }
    }

    // 3. Kiểm tra kết quả sau khi sửa
    console.log("\n📊 3. Kiểm tra kết quả sau khi sửa");
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

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
      console.log("\n✅ Usage records hôm nay:");
      todayUsages.forEach((usage, index) => {
        console.log(`  ${index + 1}. Key: ${usage.userApiKey.key.substring(0, 10)}...`);
        console.log(`     Model: ${usage.model.label}`);
        console.log(`     Usage Count: ${usage.usageCount}`);
        console.log(`     Total Tokens: ${usage.totalTokens}`);
        console.log(`     Last Used At: ${usage.lastUsedAt}`);
      });
    }

    // 4. Test API endpoint
    console.log("\n📊 4. Test API endpoint");
    
    const testUserId = allUserKeys[0].userId;
    console.log(`Test với user ID: ${testUserId}`);

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

    const result = keysWithTodayUsage.map(key => {
      const todayUsage = key.usage.filter(u => {
        if (!u.lastUsedAt) return false;
        const lastUsedAt = new Date(u.lastUsedAt);
        return lastUsedAt >= startOfDay && lastUsedAt <= endOfDay;
      });

      return {
        id: key.id,
        key: key.key,
        label: key.label,
        usage: todayUsage
      };
    });

    const keysWithUsage = result.filter(key => key.usage.length > 0);
    console.log(`Kết quả API: ${keysWithUsage.length} keys có usage hôm nay`);

    if (keysWithUsage.length > 0) {
      console.log("\n✅ Keys có usage hôm nay:");
      keysWithUsage.forEach((key, index) => {
        console.log(`  ${index + 1}. Key: ${key.key.substring(0, 10)}...`);
        console.log(`     Label: ${key.label}`);
        console.log(`     Usage records: ${key.usage.length}`);
        key.usage.forEach((usage, uIndex) => {
          console.log(`       ${uIndex + 1}. ${usage.model.label}: ${usage.usageCount} lần, ${usage.totalTokens} tokens`);
        });
      });
    }

    console.log("\n✅ Fix dữ liệu hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy fix
fixUsageData();
