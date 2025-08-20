import Dexie from 'dexie';
// Dynamically import the service functions later in beforeEach
let addChapters, getChapters, getChaptersByStoryIdAndRange, clearChapters;

// Globally declared Jest mocks for assertion purposes
// These are the actual mocks that indexedDBService.js will interact with.
const mockBulkAdd = jest.fn();
const mockWhere = jest.fn();
const mockEquals = jest.fn();
const mockAnd = jest.fn();
const mockFirst = jest.fn();
const mockSortBy = jest.fn();
const mockDelete = jest.fn();

jest.mock('dexie', () => {
  // These variables and helper functions are now fully encapsulated within the mock factory
  let mockChaptersData = [];

  // Helper function to get filtered and sorted data based on passed query state
  const getFilteredAndSortedDataInternal = (queryState) => {
    let filtered = [...mockChaptersData];

    // Apply .where() filter
    if (typeof queryState.queryKeyOrObject === 'object') {
      const objQuery = queryState.queryKeyOrObject;
      filtered = filtered.filter(item => {
        for (const prop in objQuery) {
          if (item[prop] !== objQuery[prop]) return false;
        }
        return true;
      });
    } else if (typeof queryState.queryKeyOrObject === 'string' && queryState.equalsValue !== undefined) {
      const key = queryState.queryKeyOrObject;
      const value = queryState.equalsValue;
      filtered = filtered.filter(item => item[key] === value);
    }

    // Apply .and() filter
    if (queryState.andFilterFn) {
      filtered = filtered.filter(queryState.andFilterFn);
    }

    // Apply .sortBy()
    if (queryState.sortKey) {
      const sortKey = queryState.sortKey;
      filtered.sort((a, b) => a[sortKey] - b[sortKey]);
    }

    return filtered;
  };

  // Helper function to add chapters to internal mock data
  const addMockChaptersInternal = async (items) => {
    const newItems = items.map(item => ({ ...item, id: Math.random().toString(36).substring(7) }));
    mockChaptersData.push(...newItems);
    return newItems;
  };

  // Helper function to delete chapters from internal mock data
  const deleteMockChaptersInternal = async (queryState) => {
    const itemsToDelete = getFilteredAndSortedDataInternal(queryState);
    mockChaptersData = mockChaptersData.filter(item => !itemsToDelete.includes(item));
    return itemsToDelete.length;
  };

  // The actual mock constructor returned by jest.mock
  const mockDbConstructor = jest.fn(() => {
    // --- RESET ALL INTERNAL MOCK STATE FOR EACH NEW DEXIE INSTANCE ---
    mockChaptersData = [];

    // --- Reset global Jest mock functions (clear calls and implementations) ---
    mockBulkAdd.mockReset();
    mockWhere.mockReset();
    mockEquals.mockReset();
    mockAnd.mockReset();
    mockFirst.mockReset();
    mockSortBy.mockReset();
    mockDelete.mockReset();

    // --- Re-apply Implementations for the GLOBAL mocks, using encapsulated state ---
    mockBulkAdd.mockImplementation(async (items) => addMockChaptersInternal(items));

    // The chainable methods will now carry their own state
    const createChainableMethods = (queryState) => {
      const chainable = {};

      // Mock the .equals() method
      chainable.equals = mockEquals.mockImplementation(function(value) {
        const newQueryState = { ...queryState, equalsValue: value };
        return createChainableMethods(newQueryState); // Return new chainable with updated state
      });

      // Mock the .and() method
      chainable.and = mockAnd.mockImplementation(function(filterFn) {
        const newQueryState = { ...queryState, andFilterFn: filterFn };
        return createChainableMethods(newQueryState); // Return new chainable with updated state
      });

      // Mock the .sortBy() method
      chainable.sortBy = mockSortBy.mockImplementation(async function(sortKey) {
        const newQueryState = { ...queryState, sortKey: sortKey };
        // sortBy now directly returns the sorted array (wrapped in a Promise)
        return getFilteredAndSortedDataInternal(newQueryState);
      });

      // Mock the .first() method
      chainable.first = mockFirst.mockImplementation(function() {
        const filtered = getFilteredAndSortedDataInternal(queryState);
        return filtered[0];
      });

      // Mock the .delete() method
      chainable.delete = mockDelete.mockImplementation(async function() {
        const deletedCount = await deleteMockChaptersInternal(queryState);
        return Promise.resolve(deletedCount);
      });

      return chainable;
    };

    // Mock the .where() method
    mockWhere.mockImplementation((queryKeyOrObject) => {
      const initialQueryState = { queryKeyOrObject: queryKeyOrObject };
      const chainable = createChainableMethods(initialQueryState);

      if (typeof queryKeyOrObject === 'string') {
        // .where('key') returns an object with .equals()
        return { equals: chainable.equals };
      } else if (typeof queryKeyOrObject === 'object') {
        // .where({ object }) directly exposes chainable methods
        return chainable;
      }
      return chainable; // Default case
    });

    return {
      version: jest.fn().mockReturnThis(),
      stores: jest.fn().mockReturnThis(),
      chapters: {
        bulkAdd: mockBulkAdd,
        where: mockWhere,
      },
    };
  });

  return {
    __esModule: true,
    default: mockDbConstructor,
  };
});

describe('IndexedDB Service', () => {
  let db; // This will hold the mocked Dexie instance for test assertions

  beforeEach(async () => {
    jest.resetModules(); // Ensure fresh import of indexedDBService.js
    ({ addChapters, getChapters, getChaptersByStoryIdAndRange, clearChapters } = await import('../indexedDBService'));
    db = new Dexie('TestDB'); // Get a fresh mock instance
  });

  test('should add chapters to the database', async () => {
    const chapters = [
      { storyId: 's1', chapterNumber: 1, rawText: 'Chapter 1' },
      { storyId: 's1', chapterNumber: 2, rawText: 'Chapter 2' },
    ];
    const result = await addChapters(chapters);
    expect(result).toBe(true);
    expect(mockBulkAdd).toHaveBeenCalledWith(chapters);
    const addedChapter = await getChapters('s1', 1);
    expect(addedChapter).toBeDefined();
    expect(addedChapter.rawText).toBe('Chapter 1');
  });

  test('should retrieve a single chapter by storyId and chapterNumber', async () => {
    const chapter1 = { storyId: 's2', chapterNumber: 1, rawText: 'Chapter A' };
    const chapter2 = { storyId: 's2', chapterNumber: 2, rawText: 'Chapter B' };
    await addChapters([chapter1, chapter2]);

    const retrieved = await getChapters('s2', 1);
    expect(retrieved).toBeDefined();
    expect(retrieved.rawText).toBe('Chapter A');
    expect(mockWhere).toHaveBeenCalledWith({ storyId: 's2', chapterNumber: 1 });
    expect(mockFirst).toHaveBeenCalledTimes(1);
  });

  test('should retrieve chapters by storyId and range', async () => {
    const chapters = [
      { storyId: 's3', chapterNumber: 10, rawText: 'Ch 10' },
      { storyId: 's3', chapterNumber: 11, rawText: 'Ch 11' },
      { storyId: 's3', chapterNumber: 12, rawText: 'Ch 12' },
      { storyId: 's4', chapterNumber: 1, rawText: 'Another story' },
    ];
    await addChapters(chapters);

    const retrievedRange = await getChaptersByStoryIdAndRange('s3', 10, 11);
    expect(retrievedRange.length).toBe(2);
    expect(retrievedRange[0].rawText).toBe('Ch 10');
    expect(retrievedRange[1].rawText).toBe('Ch 11');
    expect(retrievedRange[0].chapterNumber).toBe(10);
    expect(retrievedRange[1].chapterNumber).toBe(11);
    expect(mockWhere).toHaveBeenCalledWith('storyId');
    expect(mockEquals).toHaveBeenCalledWith('s3');
    expect(mockAnd).toHaveBeenCalledTimes(1);
    expect(mockSortBy).toHaveBeenCalledTimes(1);
  });

  test('should clear all chapters for a specific story', async () => {
    const chapters = [
      { storyId: 's5', chapterNumber: 1, rawText: 'Ch 1' },
      { storyId: 's5', chapterNumber: 2, rawText: 'Ch 2' },
      { storyId: 's6', chapterNumber: 1, rawText: 'Ch 1 of s6' },
    ];
    await addChapters(chapters);

    const result = await clearChapters('s5');
    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);

    const remainingChapters = await getChaptersByStoryIdAndRange('s5', 1, 100); 
    expect(remainingChapters.length).toBe(0);

    const s6Chapter = await getChaptersByStoryIdAndRange('s6', 1, 1);
    expect(s6Chapter.length).toBe(1);
    expect(s6Chapter[0].storyId).toBe('s6');

    expect(mockWhere).toHaveBeenCalledWith('storyId');
    expect(mockEquals).toHaveBeenCalledWith('s5');
  });

  test('should clear chapters for a specific story and range', async () => {
    const chapters = [
      { storyId: 's7', chapterNumber: 1, rawText: 'Ch 1' },
      { storyId: 's7', chapterNumber: 2, rawText: 'Ch 2' },
      { storyId: 's7', chapterNumber: 3, rawText: 'Ch 3' },
    ];
    await addChapters(chapters);

    const result = await clearChapters('s7', 1, 2);
    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);

    const remainingChapters = await getChaptersByStoryIdAndRange('s7', 1, 3);
    expect(remainingChapters.length).toBe(1);
    expect(remainingChapters[0].chapterNumber).toBe(3);

    expect(mockWhere).toHaveBeenCalledWith('storyId');
    expect(mockEquals).toHaveBeenCalledWith('s7');
    expect(mockAnd).toHaveBeenCalledTimes(2);
  });

  test('should handle errors when adding chapters', async () => {
    mockBulkAdd.mockImplementationOnce(() => Promise.reject(new Error('Add error')));
    
    const chapters = [{ storyId: 's8', chapterNumber: 1, rawText: 'Ch 1' }];
    const result = await addChapters(chapters);
    expect(result).toBe(false);
    expect(mockBulkAdd).toHaveBeenCalledTimes(1);
  });

  test('should handle errors when retrieving chapters', async () => {
    await addChapters([{ storyId: 's9', chapterNumber: 1, rawText: 'Chapter 1' }]);

    mockFirst.mockImplementationOnce(() => Promise.reject(new Error('Retrieve error')));

    const retrieved = await getChapters('s9', 1);
    expect(retrieved).toBeNull();
    expect(mockWhere).toHaveBeenCalledWith({ storyId: 's9', chapterNumber: 1 });
    expect(mockFirst).toHaveBeenCalledTimes(1);
  });

  test('should handle errors when clearing chapters', async () => {
    const chapters = [{ storyId: 's10', chapterNumber: 1, rawText: 'Ch 1' }];
    await addChapters(chapters);

    mockDelete.mockImplementationOnce(() => Promise.reject(new Error('Clear error')));

    const result = await clearChapters('s10');
    expect(result).toBe(false);
    expect(mockWhere).toHaveBeenCalledWith('storyId');
    expect(mockEquals).toHaveBeenCalledWith('s10');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

