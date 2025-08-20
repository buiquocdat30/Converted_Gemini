console.log('Starting IndexedDB test script...');

// Mock Dexie to simulate IndexedDB operations in Node.js environment
const mockDb = {};
const mockTable = {
  data: [],
  put: async (item) => {
    mockTable.data.push(item);
    console.log(`Mock DB: Added item with ID ${item.id}`);
    return item.id;
  },
  bulkAdd: async (items) => {
    mockTable.data.push(...items);
    console.log(`Mock DB: Bulk added ${items.length} items`);
    return items.map(item => item.id);
  },
  where: (key) => ({
    equals: (value) => ({
      and: (filterFn) => ({
        sortBy: (sortKey) => {
          const filtered = mockTable.data.filter(item => item[key] === value && filterFn(item));
          return filtered.sort((a, b) => a[sortKey] - b[sortKey]);
        },
        first: () => {
          const filtered = mockTable.data.filter(item => item[key] === value && filterFn(item));
          return filtered[0];
        },
        delete: () => {
          mockTable.data = mockTable.data.filter(item => !(item[key] === value && filterFn(item)));
          console.log(`Mock DB: Deleted items for ${key}=${value} with filter`);
          return Promise.resolve(1);
        }
      }),
      first: () => {
        const filtered = mockTable.data.filter(item => item[key] === value);
        return filtered[0];
      },
      delete: () => {
        mockTable.data = mockTable.data.filter(item => item[key] !== value);
        console.log(`Mock DB: Deleted items for ${key}=${value}`);
        return Promise.resolve(1);
      }
    })
  }),
};

const Dexie = jest.fn(() => ({
  version: jest.fn().mockReturnThis(),
  stores: jest.fn().mockReturnThis(),
  chapters: mockTable, // Mock the chapters table
}));

// Mock the module directly
jest.mock('dexie', () => ({ default: Dexie }));

// Import actual service functions after mocking Dexie
const { addChapters, getChaptersByStoryIdAndRange, clearChapters } = require('../src/services/indexedDBService');

// --- Test Cases ---

async function runTests() {
  console.log('\n--- Running IndexedDB Service Tests ---');

  // Test 1: Add chapters and retrieve them
  console.log('\nTest 1: Adding and retrieving chapters...');
  const storyId1 = 'storyTest1';
  const chaptersToAdd1 = [
    { id: 'ch1', storyId: storyId1, chapterNumber: 1, rawText: 'Chapter 1 content', translatedContent: 'Translated Chapter 1' },
    { id: 'ch2', storyId: storyId1, chapterNumber: 2, rawText: 'Chapter 2 content' },
  ];
  await addChapters(chaptersToAdd1);
  let retrievedChapter1 = await getChaptersByStoryIdAndRange(storyId1, 1, 1);
  console.log('Retrieved Chapter 1:', retrievedChapter1);
  if (retrievedChapter1.length > 0 && retrievedChapter1[0].id === 'ch1') {
    console.log('✅ Test 1.1: Add and retrieve single chapter PASS');
  } else {
    console.error('❌ Test 1.1: Add and retrieve single chapter FAIL');
  }

  let retrievedChapters1_range = await getChaptersByStoryIdAndRange(storyId1, 1, 2);
  console.log('Retrieved Chapters 1 (range):', retrievedChapters1_range);
  if (retrievedChapters1_range.length === 2 && retrievedChapters1_range[0].id === 'ch1' && retrievedChapters1_range[1].id === 'ch2') {
    console.log('✅ Test 1.2: Add and retrieve chapter range PASS');
  } else {
    console.error('❌ Test 1.2: Add and retrieve chapter range FAIL');
  }

  // Test 2: Clear chapters for a specific story
  console.log('\nTest 2: Clearing chapters for a story...');
  await clearChapters(storyId1);
  let remainingChapters1 = await getChaptersByStoryIdAndRange(storyId1, 1, 100); // Try to get all
  if (remainingChapters1.length === 0) {
    console.log('✅ Test 2.1: Clear all chapters for story PASS');
  } else {
    console.error('❌ Test 2.1: Clear all chapters for story FAIL', remainingChapters1);
  }

  // Test 3: Add new chapters and clear by range
  console.log('\nTest 3: Adding and clearing chapters by range...');
  const storyId2 = 'storyTest2';
  const chaptersToAdd2 = [
    { id: 'chA', storyId: storyId2, chapterNumber: 10, rawText: 'Chapter A content' },
    { id: 'chB', storyId: storyId2, chapterNumber: 11, rawText: 'Chapter B content' },
    { id: 'chC', storyId: storyId2, chapterNumber: 12, rawText: 'Chapter C content' },
  ];
  await addChapters(chaptersToAdd2);

  let initialChapters2 = await getChaptersByStoryIdAndRange(storyId2, 10, 12);
  if (initialChapters2.length === 3) {
    console.log('✅ Test 3.1: Initial add by range PASS');
  } else {
    console.error('❌ Test 3.1: Initial add by range FAIL', initialChapters2);
  }

  await clearChapters(storyId2, 10, 11); // Clear chapters 10 and 11
  let remainingChapters2 = await getChaptersByStoryIdAndRange(storyId2, 10, 12);
  console.log('Remaining chapters after range clear:', remainingChapters2);
  if (remainingChapters2.length === 1 && remainingChapters2[0].id === 'chC') {
    console.log('✅ Test 3.2: Clear by range PASS');
  } else {
    console.error('❌ Test 3.2: Clear by range FAIL', remainingChapters2);
  }

  console.log('\n--- All IndexedDB Service Tests Completed ---');
}

// Run the tests
runTests();
