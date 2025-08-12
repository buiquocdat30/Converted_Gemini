const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RE_HIRAGANA = /[\u3040-\u309f]/;
const RE_KATAKANA = /[\u30a0-\u30ff]/;
const RE_CJK = /[\u4e00-\u9fff]/;
const RE_HANGUL = /[\uac00-\ud7af]/;
const RE_VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// cải tiến: xác định ngôn ngữ từ chuỗi
function guessLanguage(original) {
  if (RE_HIRAGANA.test(original) || RE_KATAKANA.test(original)) return 'Nhật';
  if (RE_HANGUL.test(original)) return 'Hàn';
  if (RE_CJK.test(original)) return 'Trung';
  // Latin-only (ko dấu) -> Anh (Romanized)
  if (/^[A-Za-z0-9'’\-\s]+$/.test(original)) return 'Anh';
  return 'Anh';
}

function containsVietnameseChars(text) {
  return RE_VIETNAMESE.test(text);
}
function containsChineseChars(text) {
  return RE_CJK.test(text);
}
function containsJapaneseChars(text) {
  // chỉ coi là Nhật nếu có kana (Hiragana/Katakana) — tránh nhầm với Kanji
  return RE_HIRAGANA.test(text) || RE_KATAKANA.test(text);
}
function containsKoreanChars(text) {
  return RE_HANGUL.test(text);
}
function isForeignLanguage(text) {
  if (!text) return false;
  if (containsVietnameseChars(text)) return false;
  return containsChineseChars(text) || containsJapaneseChars(text) || containsKoreanChars(text) || /[A-Za-z]/.test(text);
}

// helper lưu / cập nhật 1 dòng
async function saveGlossaryItem(storyId, original, translated, type, lang) {
  original = original.trim();
  translated = translated.trim();
  type = (type || 'Nhân vật').trim();
  lang = (lang || guessLanguage(original)).trim();

  // clean quotes
  original = original.replace(/^["'""'']+|["'""'']+$/g, '').trim();
  translated = translated.replace(/^["'""'']+|["'""'']+$/g, '').trim();

  if (!isForeignLanguage(original)) {
    console.log(`⚠️ Bỏ qua vì không phải ngôn ngữ nước ngoài: "${original}"`);
    return { skipped: 1, saved: 0, updated: 0 };
  }

  // loại những cụm quá dài
  const wordCount = original.split(/\s+/).filter(Boolean).length;
  if (original.length > 80 || wordCount > 6 || original.includes('：')) { // cho ngưỡng mềm hơn
    console.log(`⚠️ Bỏ qua cụm quá dài: "${original}" (len=${original.length}, words=${wordCount})`);
    return { skipped: 1, saved: 0, updated: 0 };
  }

  // kiểm tra tồn tại (so sánh chính xác)
  const exists = await prisma.glossaryItem.findFirst({
    where: { storyId, original }
  });

  if (!exists) {
    await prisma.glossaryItem.create({
      data: {
        storyId,
        original,
        translated,
        type,
        lang
      }
    });
    console.log(`✅ Đã lưu: ${original} = ${translated} [${type}] [${lang}]`);
    return { skipped: 0, saved: 1, updated: 0 };
  } else {
    await prisma.glossaryItem.update({
      where: { id: exists.id },
      data: {
        frequency: (exists.frequency || 0) + 1,
        updatedAt: new Date()
      }
    });
    console.log(`🔄 Đã cập nhật: "${original}"`);
    return { skipped: 0, saved: 0, updated: 1 };
  }
}

// hàm chính (refactor)
async function extractAndSaveGlossary(storyId, glossaryText) {
  if (!glossaryText || !storyId) {
    console.log("⚠️ Không có glossary text hoặc storyId để lưu");
    return;
  }

  const lines = glossaryText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let savedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const fullRe = /^(.+?)\s*=\s*(.+?)\s*\[(.+?)\]\s*\[(.+?)\]\s*$/;
  const simpleRe = /^\s*["'""'']?(.+?)["'""'']?\s*=\s*["'""'']?(.*?)["'""'']?\s*$/;

  for (const raw of lines) {
    console.log(`[GLOSSARY] 🔎 Xử lý: "${raw}"`);
    // remove bullet/number prefix
    const line = raw.replace(/^[\-\*\•\d\.\)\s]+/, '').trim();

    let m = line.match(fullRe);
    if (m) {
      const [, original, translated, type, lang] = m;
      const r = await saveGlossaryItem(storyId, original, translated, type, lang);
      savedCount += r.saved; updatedCount += r.updated; skippedCount += r.skipped;
        continue;
      }

    m = line.match(simpleRe);
    if (m) {
      const [, original, translated] = m;
      // tự suy đoán type/lang; không skip chỉ vì thiếu [] []
      const guessedLang = guessLanguage(original);
      const guessedType = 'Nhân vật';
      const r = await saveGlossaryItem(storyId, original, translated, guessedType, guessedLang);
      savedCount += r.saved; updatedCount += r.updated; skippedCount += r.skipped;
        continue;
      }

    // nếu không khớp 2 định dạng trên, thử parse với bracket tách rời vd: "张伟 = Trương Vĩ [Nhân vật] [Trung]" style with extra spaces
    const bracketRe = /^(.+?)\s*=\s*(.+?)\s*\[(.+?)\]\s*\[(.+?)\]/;
    m = line.match(bracketRe);
    if (m) {
      const [, original, translated, type, lang] = m;
      const r = await saveGlossaryItem(storyId, original, translated, type, lang);
      savedCount += r.saved; updatedCount += r.updated; skippedCount += r.skipped;
        continue;
      }

    console.log(`⚠️ Không parse được dòng glossary: "${line}" — bỏ qua`);
        skippedCount++;
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