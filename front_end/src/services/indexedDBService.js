import Dexie from 'dexie';

const db = new Dexie('StoryChapterDB');
db.version(1).stores({
  chapters: '++id, storyId, chapterNumber, &[storyId+chapterNumber]'
});

// Add a method to add chapters to the database
export async function addChapters(chapters) {
  console.log(`[IndexedDB] ➕ Đang thêm ${chapters.length} chương vào IndexedDB. Dữ liệu:`, chapters);
  try {
    await db.chapters.bulkPut(chapters);
    console.log(`[IndexedDB] ✅ Thêm ${chapters.length} chương thành công.`);
    return true;
  } catch (error) {
    console.error("❌ Lỗi khi thêm chương vào IndexedDB:", error);
    return false;
  }
}

// Add a method to get chapters by storyId and chapterNumber
export async function getChapters(storyId, chapterNumber) {
  console.log(`[IndexedDB] 🔍 Đang tìm chương: storyId=${storyId}, chapterNumber=${chapterNumber}`);
  try {
    const chapter = await db.chapters.where({ storyId: storyId, chapterNumber: chapterNumber }).first();
    if (chapter) {
      console.log(`[IndexedDB] ✅ Tìm thấy chương ${chapterNumber} cho story ${storyId}.`);
    } else {
      console.log(`[IndexedDB] ⚠️ Không tìm thấy chương ${chapterNumber} cho story ${storyId}.`);
    }
    return chapter;
  } catch (error) {
    console.error("❌ Lỗi khi lấy chương từ IndexedDB:", error);
    return null;
  }
}

// Add a method to get chapters by storyId and a range of chapterNumbers (for pagination)
export async function getChaptersByStoryIdAndRange(storyId, startChapterNumber, endChapterNumber) {
  console.log(`[IndexedDB] 🔍 Đang tìm các chương theo phạm vi: storyId=${storyId}, từ ${startChapterNumber} đến ${endChapterNumber}.`);
  try {
    const chapters = await db.chapters
      .where('storyId').equals(storyId)
      .and(chapter => Number( chapter.chapterNumber) >= Number(startChapterNumber) && Number(chapter.chapterNumber) <= Number(endChapterNumber))
      .sortBy('chapterNumber');
    console.log(`[IndexedDB] ✅ Tìm thấy ${chapters.length} chương trong phạm vi đã yêu cầu.`);
    return chapters;
  } catch (error) {
    console.error("❌ Lỗi khi lấy các chương theo phạm vi từ IndexedDB:", error);
    return [];
  }
}

// Add a method to clear chapters for a specific story
export async function clearChapters(storyId, startChapterNumber, endChapterNumber) {
  try {
    let collection = db.chapters.where('storyId').equals(storyId);

    if (startChapterNumber !== undefined && endChapterNumber !== undefined) {
      collection = collection.and(chapter => 
        chapter.chapterNumber >= startChapterNumber && 
        chapter.chapterNumber <= endChapterNumber
      );
      console.log(`[IndexedDB] 🗑️ Đang xóa các chương: storyId=${storyId}, phạm vi: ${startChapterNumber}-${endChapterNumber}`);
    } else {
      console.log(`[IndexedDB] 🗑️ Đang xóa TẤT CẢ chương cho storyId: ${storyId}`);
    }
    
    await collection.delete();
    console.log(`[IndexedDB] ✅ Xóa chương thành công.`);
    return true;
  } catch (error) {
    console.error("❌ Lỗi khi xóa chương từ IndexedDB:", error);
    return false;
  }
}

export default db;
