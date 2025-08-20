let mockChaptersData = [];
let _currentQueryKeyOrObject; // Stores what was passed to .where()
let _currentEqualsValue;      // Stores what was passed to .equals()
let _currentAndFilterFn;      // Stores what was passed to .and()
let _currentSortKey;          // Stores what was passed to .sortBy()

export const resetMockData = () => {
  mockChaptersData = [];
  _currentQueryKeyOrObject = undefined;
  _currentEqualsValue = undefined;
  _currentAndFilterFn = undefined;
  _currentSortKey = undefined;
};

// Sets the initial query for .where()
export const setWhereQuery = (queryKeyOrObject) => {
  _currentQueryKeyOrObject = queryKeyOrObject;
  // Reset subsequent parts of the query chain
  _currentEqualsValue = undefined;
  _currentAndFilterFn = undefined;
  _currentSortKey = undefined;
};

// Sets the value for .equals()
export const setEqualsValue = (value) => {
  _currentEqualsValue = value;
  // Reset subsequent parts of the query chain
  _currentAndFilterFn = undefined;
  _currentSortKey = undefined;
};

// Sets the filter for .and()
export const setAndFilter = (filterFn) => {
  _currentAndFilterFn = filterFn;
  // Reset subsequent parts of the query chain
  _currentSortKey = undefined;
};

// Sets the sort key for .sortBy()
export const setSortKey = (sortKey) => {
  _currentSortKey = sortKey;
};

export const getFilteredAndSortedData = () => {
  let filtered = [...mockChaptersData];

  // Apply .where() filter
  if (typeof _currentQueryKeyOrObject === 'object') {
    const objQuery = _currentQueryKeyOrObject;
    filtered = filtered.filter(item => {
      for (const prop in objQuery) {
        if (item[prop] !== objQuery[prop]) return false;
      }
      return true;
    });
  } else if (typeof _currentQueryKeyOrObject === 'string' && _currentEqualsValue !== undefined) {
    const key = _currentQueryKeyOrObject;
    const value = _currentEqualsValue;
    filtered = filtered.filter(item => item[key] === value);
  }

  // Apply .and() filter
  if (_currentAndFilterFn) {
    filtered = filtered.filter(_currentAndFilterFn);
  }

  // Apply .sortBy()
  if (_currentSortKey) {
    const sortKey = _currentSortKey;
    filtered.sort((a, b) => a[sortKey] - b[b][sortKey]); // Fix: was b[b][sortKey]
  }

  return filtered;
};

export const addMockChapters = async (items) => {
  const newItems = items.map(item => ({ ...item, id: Math.random().toString(36).substring(7) }));
  mockChaptersData.push(...newItems);
  return newItems;
};

export const deleteMockChapters = async () => {
  const itemsToDelete = getFilteredAndSortedData(); // Delete based on current filter
  mockChaptersData = mockChaptersData.filter(item => !itemsToDelete.includes(item));
  return itemsToDelete.length;
};
