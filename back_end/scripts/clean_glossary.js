const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanGlossary() {
  console.log('🧹 Bắt đầu dọn dẹp glossary...');
  
  try {
    // Lấy tất cả glossary items
    const allItems = await prisma.glossaryItem.findMany();
    console.log(`📊 Tổng số items: ${allItems.length}`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const item of allItems) {
      let shouldDelete = false;
      let reason = '';
      
      // Kiểm tra tên chương dài
      if (item.original.includes('章') || item.original.includes('第') || 
          item.original.includes('chapter') || item.original.includes('Chapter') || 
          item.original.length > 20) {
        shouldDelete = true;
        reason = 'Tên chương dài';
      }
      
      // Kiểm tra câu/cụm từ dài
      else if (item.original.split('').length > 15 || item.original.includes(' ') || 
               item.original.includes('：') || item.original.includes(':')) {
        shouldDelete = true;
        reason = 'Câu/cụm từ dài';
      }
      
      // Kiểm tra từ chung
      else {
        const commonWords = ['ma', 'vương', 'học', 'viện', 'giám', 'đốc', 'công', 'ty', 'trường', 'đại', 'học'];
        const isCommonWord = commonWords.some(word => 
          item.original.toLowerCase().includes(word) || item.translated.toLowerCase().includes(word)
        );
        if (isCommonWord) {
          shouldDelete = true;
          reason = 'Từ chung';
        }
      }
      
      if (shouldDelete) {
        console.log(`🗑️ Xóa: "${item.original}" = "${item.translated}" (${reason})`);
        await prisma.glossaryItem.delete({
          where: { id: item.id }
        });
        deletedCount++;
      } else {
        console.log(`✅ Giữ: "${item.original}" = "${item.translated}"`);
        keptCount++;
      }
    }
    
    console.log(`\n📊 Kết quả dọn dẹp:`);
    console.log(`✅ Giữ lại: ${keptCount} items`);
    console.log(`🗑️ Đã xóa: ${deletedCount} items`);
    console.log(`📊 Tổng còn lại: ${keptCount} items`);
    
  } catch (error) {
    console.error('❌ Lỗi khi dọn dẹp glossary:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
cleanGlossary(); 