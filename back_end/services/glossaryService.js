const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Kiểm tra xem text có chứa ký tự tiếng Việt hay không
 */
function containsVietnameseChars(text) {
  // Regex để kiểm tra ký tự tiếng Việt (có dấu)
  const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return vietnameseRegex.test(text);
}

/**
 * Kiểm tra xem text có chứa ký tự tiếng Trung hay không
 */
function containsChineseChars(text) {
  // Regex để kiểm tra ký tự tiếng Trung (Unicode range)
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

/**
 * Kiểm tra xem text có chứa ký tự tiếng Nhật hay không
 */
function containsJapaneseChars(text) {
  // Regex để kiểm tra ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/;
  return japaneseRegex.test(text);
}

/**
 * Kiểm tra xem text có chứa ký tự tiếng Hàn hay không
 */
function containsKoreanChars(text) {
  // Regex để kiểm tra ký tự tiếng Hàn (Hangul)
  const koreanRegex = /[\uac00-\ud7af]/;
  return koreanRegex.test(text);
}

/**
 * Kiểm tra xem text có phải là tiếng nước ngoài hay không
 * Loại bỏ các từ tiếng Việt có dấu
 */
function isForeignLanguage(text) {
  // Nếu có ký tự tiếng Việt có dấu, thì không phải tiếng nước ngoài
  if (containsVietnameseChars(text)) {
    return false;
  }
  
  // Kiểm tra các ký tự tiếng nước ngoài
  return containsChineseChars(text) || 
         containsJapaneseChars(text) || 
         containsKoreanChars(text) ||
         // Chỉ chấp nhận ký tự Latin nếu không có dấu tiếng Việt
         (/[a-zA-Z]/.test(text) && !containsVietnameseChars(text));
}

/**
 * Trích và lưu glossary từ văn bản định dạng:
 * "张伟 = Trương Vĩ [Nhân vật] [Trung]"
 * Chỉ lưu những từ có gốc tiếng nước ngoài
 */
async function extractAndSaveGlossary(storyId, glossaryText) {
  if (!glossaryText || !storyId) {
    console.log("⚠️ Không có glossary text hoặc storyId để lưu");
    return;
  }

  const lines = glossaryText.trim().split("\n");
  let savedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    // Regex để match format: "张伟 = Trương Vĩ [Nhân vật] [Trung]"
    const match = line.match(/^(.+?) = (.+?) \[(.+?)\] \[(.+?)\]$/);
    if (match) {
      const [, original, translated, type, lang] = match;
      const originalTrim = original.trim();
      const translatedTrim = translated.trim();
      
      // Kiểm tra xem original có phải là tiếng nước ngoài không
      if (!isForeignLanguage(originalTrim)) {
        console.log(`⚠️ Bỏ qua từ tiếng Việt: "${originalTrim}"`);
        skippedCount++;
        continue;
      }

      // Kiểm tra xem có phải là từ trùng lặp không (original = translated)
      if (originalTrim === translatedTrim) {
        console.log(`⚠️ Bỏ qua từ trùng lặp: "${originalTrim}"`);
        skippedCount++;
        continue;
      }
      
      try {
        // Kiểm tra xem đã tồn tại chưa
        const exists = await prisma.glossaryItem.findFirst({
          where: { 
            storyId, 
            original: originalTrim 
          }
        });

        if (!exists) {
          // Tạo mới
          await prisma.glossaryItem.create({
            data: { 
              storyId, 
              original: originalTrim, 
              translated: translatedTrim, 
              type: type.trim(), 
              lang: lang.trim() 
            }
          });
          savedCount++;
          console.log(`✅ Đã lưu: "${originalTrim}" = "${translatedTrim}"`);
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
          console.log(`🔄 Đã cập nhật: "${originalTrim}"`);
        }
      } catch (error) {
        console.error("❌ Lỗi khi lưu glossary item:", error);
      }
    }
  }

  console.log(`📚 Kết quả lưu glossary: ${savedCount} mới, ${updatedCount} cập nhật, ${skippedCount} bỏ qua`);
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
  searchGlossaryItems,
  isForeignLanguage,
  containsChineseChars,
  containsJapaneseChars,
  containsKoreanChars
}; 