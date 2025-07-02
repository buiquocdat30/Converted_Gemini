const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Trích và lưu glossary từ văn bản định dạng:
 * "张伟 = Trương Vĩ [Nhân vật] [Trung]"
 */
async function extractAndSaveGlossary(storyId, glossaryText) {
  if (!glossaryText || !storyId) {
    console.log("⚠️ Không có glossary text hoặc storyId để lưu");
    return;
  }

  const lines = glossaryText.trim().split("\n");
  let savedCount = 0;
  let updatedCount = 0;

  for (const line of lines) {
    // Regex để match format: "张伟 = Trương Vĩ [Nhân vật] [Trung]"
    const match = line.match(/^(.+?) = (.+?) \[(.+?)\] \[(.+?)\]$/);
    if (match) {
      const [, original, translated, type, lang] = match;
      
      try {
        // Kiểm tra xem đã tồn tại chưa
        const exists = await prisma.glossaryItem.findFirst({
          where: { 
            storyId, 
            original: original.trim() 
          }
        });

        if (!exists) {
          // Tạo mới
          await prisma.glossaryItem.create({
            data: { 
              storyId, 
              original: original.trim(), 
              translated: translated.trim(), 
              type: type.trim(), 
              lang: lang.trim() 
            }
          });
          savedCount++;
        } else {
          // Cập nhật frequency nếu đã tồn tại
          await prisma.glossaryItem.update({
            where: { id: exists.id },
            data: { 
              frequency: exists.frequency + 1,
              updatedAt: new Date()
            }
          });
          updatedCount++;
        }
      } catch (error) {
        console.error("❌ Lỗi khi lưu glossary item:", error);
      }
    }
  }

  console.log(`📚 Đã lưu ${savedCount} item mới, cập nhật ${updatedCount} item trong glossary`);
}

/**
 * Lấy tất cả glossary items của một truyện
 */
async function getGlossaryByStoryId(storyId) {
  try {
    const items = await prisma.glossaryItem.findMany({
      where: { storyId },
      orderBy: [
        { frequency: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return items;
  } catch (error) {
    console.error("❌ Lỗi khi lấy glossary:", error);
    return [];
  }
}

/**
 * Chuyển đổi glossary items thành text format để gửi cho AI
 */
function formatGlossaryForAI(glossaryItems) {
  if (!glossaryItems || glossaryItems.length === 0) {
    return "";
  }

  const formattedItems = glossaryItems.map(item => 
    `${item.original} = ${item.translated} [${item.type}] [${item.lang}]`
  ).join("\n");

  return formattedItems;
}

/**
 * Xóa một glossary item
 */
async function deleteGlossaryItem(itemId) {
  try {
    await prisma.glossaryItem.delete({
      where: { id: itemId }
    });
    return true;
  } catch (error) {
    console.error("❌ Lỗi khi xóa glossary item:", error);
    return false;
  }
}

/**
 * Cập nhật một glossary item
 */
async function updateGlossaryItem(itemId, data) {
  try {
    const updated = await prisma.glossaryItem.update({
      where: { id: itemId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    return updated;
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật glossary item:", error);
    return null;
  }
}

/**
 * Tìm kiếm glossary items theo từ khóa
 */
async function searchGlossaryItems(storyId, keyword) {
  try {
    const items = await prisma.glossaryItem.findMany({
      where: {
        storyId,
        OR: [
          { original: { contains: keyword, mode: 'insensitive' } },
          { translated: { contains: keyword, mode: 'insensitive' } },
          { type: { contains: keyword, mode: 'insensitive' } }
        ]
      },
      orderBy: [
        { frequency: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return items;
  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm glossary:", error);
    return [];
  }
}

module.exports = {
  extractAndSaveGlossary,
  getGlossaryByStoryId,
  formatGlossaryForAI,
  deleteGlossaryItem,
  updateGlossaryItem,
  searchGlossaryItems
}; 