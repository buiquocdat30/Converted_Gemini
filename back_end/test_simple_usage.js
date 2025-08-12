const { prisma, toObjectId } = require("./config/prismaConfig");

async function testSimpleUsage() {
  try {
    console.log("🔍 Test đơn giản usage stats...\n");

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

    // Kiểm tra từng key
    allKeys.forEach((key, index) => {
      console.log(`\n🔑 Key ${index + 1}: ${key.key.substring(0, 10)}...`);
      console.log(`- Label: ${key.label}`);
      console.log(`- Usage records: ${key.usage.length}`);
      
      if (key.usage.length === 0) {
        console.log(`  ⚠️ Không có usage records`);
        return;
      }

      key.usage.forEach((usage, uIndex) => {
        console.log(`  📈 Usage ${uIndex + 1}:`);
        console.log(`    - Model: ${usage.model.label} (${usage.model.value})`);
        console.log(`    - Status: ${usage.status}`);
        console.log(`    - Usage Count: ${usage.usageCount}`);
        console.log(`    - Total Tokens: ${usage.totalTokens}`);
        console.log(`    - Last Used At: ${usage.lastUsedAt}`);
        
        // Kiểm tra xem có sử dụng hôm nay không
        if (usage.lastUsedAt) {
          const lastUsedAt = new Date(usage.lastUsedAt);
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          
          const isUsedToday = lastUsedAt >= startOfDay && lastUsedAt <= endOfDay;
          console.log(`    - Sử dụng hôm nay: ${isUsedToday ? '✅ Có' : '❌ Không'}`);
        } else {
          console.log(`    - Sử dụng hôm nay: ❌ Chưa sử dụng`);
        }
      });
    });

    // Test API endpoint
    console.log("\n🌐 Test API endpoint /user/keys/usage/today");
    console.log("Hãy chạy server và gọi API này để xem kết quả");

  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy test
testSimpleUsage();
