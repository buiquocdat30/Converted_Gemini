const { prisma, toObjectId } = require("./config/prismaConfig");

async function testKeyManagement() {
  try {
    console.log("🔍 Test Key Management - Bắt đầu kiểm tra...\n");

    // 1. Kiểm tra dữ liệu user keys
    console.log("📊 1. Kiểm tra user keys");
    const userKeys = await prisma.userApiKey.findMany({
      include: {
        usage: {
          include: {
            model: true
          }
        }
      }
    });

    console.log(`Tìm thấy ${userKeys.length} user keys`);

    if (userKeys.length === 0) {
      console.log("❌ Không có user keys nào để test");
      return;
    }

    // 2. Phân tích từng key
    console.log("\n📊 2. Phân tích từng key");
    userKeys.forEach((key, index) => {
      console.log(`\n🔑 Key ${index + 1}: ${key.key.substring(0, 10)}...`);
      console.log(`- Label: ${key.label}`);
      console.log(`- Usage records: ${key.usage.length}`);
      
      if (key.usage.length > 0) {
        // Tính tổng usage hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayUsage = key.usage.filter(u => {
          if (!u.lastUsedAt) return false;
          const lastUsedAt = new Date(u.lastUsedAt);
          return lastUsedAt >= today;
        });

        console.log(`- Usage hôm nay: ${todayUsage.length}/${key.usage.length} models`);
        
        todayUsage.forEach((usage, uIndex) => {
          console.log(`  Model ${uIndex + 1}: ${usage.model?.label || usage.modelId}`);
          console.log(`    - Status: ${usage.status}`);
          console.log(`    - Usage count: ${usage.usageCount}`);
          console.log(`    - Total tokens: ${usage.totalTokens}`);
          console.log(`    - Last used: ${usage.lastUsedAt ? new Date(usage.lastUsedAt).toLocaleString('vi-VN') : 'Chưa sử dụng'}`);
        });
      }
    });

    // 3. Test API endpoint getTodayUsageStats
    console.log("\n📊 3. Test API endpoint getTodayUsageStats");
    const userId = userKeys[0].userId; // Lấy userId của key đầu tiên
    
    // Lấy mốc thời gian đầu và cuối ngày hôm nay
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log(`Thời gian hôm nay: ${startOfDay.toISOString()} đến ${endOfDay.toISOString()}`);

    // Lấy tất cả key của user với tất cả usage records
    const keysWithUsage = await prisma.userApiKey.findMany({
      where: { userId },
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

    console.log(`Tìm thấy ${keysWithUsage.length} keys cho user ${userId}`);

    // Format lại cho FE: mỗi key có mảng usage theo model trong ngày
    const result = keysWithUsage.map(key => {
      // Lọc usage records có lastUsedAt trong ngày hôm nay
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
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        usage: todayUsage.map(u => ({
          id: u.id,
          modelId: u.modelId,
          model: u.model,
          status: u.status,
          usageCount: u.usageCount,
          promptTokens: u.promptTokens,
          completionTokens: u.completionTokens,
          totalTokens: u.totalTokens,
          lastUsedAt: u.lastUsedAt
        }))
      };
    });

    console.log(`✅ Trả về ${result.length} keys có usage hôm nay`);
    
    // 4. Hiển thị kết quả cuối cùng
    console.log("\n📊 4. Kết quả cuối cùng");
    result.forEach((key, index) => {
      console.log(`\n🔑 Key ${index + 1}: ${key.key.substring(0, 10)}...`);
      console.log(`- Label: ${key.label}`);
      console.log(`- Usage records hôm nay: ${key.usage.length}`);
      
      if (key.usage.length > 0) {
        const totalUsage = key.usage.reduce((total, u) => total + (u.usageCount || 0), 0);
        const totalTokens = key.usage.reduce((total, u) => total + (u.totalTokens || 0), 0);
        
        console.log(`- Tổng usage: ${totalUsage} lần`);
        console.log(`- Tổng tokens: ${totalTokens}`);
        
        key.usage.forEach((usage, uIndex) => {
          console.log(`  Model ${uIndex + 1}: ${usage.model?.label || usage.modelId}`);
          console.log(`    - Status: ${usage.status}`);
          console.log(`    - Usage: ${usage.usageCount} lần, ${usage.totalTokens} tokens`);
        });
      }
    });

    console.log("\n✅ Test hoàn thành!");

  } catch (error) {
    console.error("❌ Lỗi trong test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testKeyManagement();
