import Dexie from 'dexie';

const db = new Dexie('StoryChapterDB');
db.version(1).stores({
  chapters: '++id, storyId, chapterNumber, &[storyId+chapterNumber]'
});

// Add a method to add chapters to the database
export async function addChapters(chapters) {
  try {
    await db.chapters.bulkAdd(chapters);
    return true;
  } catch (error) {
    console.error("Error adding chapters to IndexedDB:", error);
    return false;
  }
}

// Add a method to get chapters by storyId and chapterNumber
export async function getChapters(storyId, chapterNumber) {
  try {
    const chapter = await db.chapters.where({ storyId: storyId, chapterNumber: chapterNumber }).first();
    return chapter;
  } catch (error) {
    console.error("Error getting chapter from IndexedDB:", error);
    return null;
  }
}

// Add a method to get chapters by storyId and a range of chapterNumbers (for pagination)
export async function getChaptersByStoryIdAndRange(storyId, startChapterNumber, endChapterNumber) {
  try {
    const chapters = await db.chapters
      .where('storyId').equals(storyId)
      .and(chapter => chapter.chapterNumber >= startChapterNumber && chapter.chapterNumber <= endChapterNumber)
      .sortBy('chapterNumber');
    return chapters;
  } catch (error) {
    console.error("Error getting chapters by range from IndexedDB:", error);
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
      console.log(`[IndexedDB] Clearing chapters for storyId: ${storyId}, range: ${startChapterNumber}-${endChapterNumber}`);
    } else {
      console.log(`[IndexedDB] Clearing ALL chapters for storyId: ${storyId}`);
    }
    
    await collection.delete();
    return true;
  } catch (error) {
    console.error("Error clearing chapters from IndexedDB:", error);
    return false;
  }
}

export default db;
