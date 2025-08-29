export function parseCommand(input) {
  const text = input.toLowerCase().trim();

  // Lệnh dịch
  if (text.startsWith('dịch')) {
    const content = text.replace('dịch', '').trim();
    if (!content) {
      return { type: 'translate', payload: null, error: 'Vui lòng nhập nội dung cần dịch' };
    }
    return { type: 'translate', payload: content };
  }

  // Lệnh thêm truyện
  if (text.startsWith('thêm truyện')) {
    const storyName = text.replace('thêm truyện', '').trim();
    if (!storyName) {
      return { type: 'addStory', payload: null, error: 'Vui lòng nhập tên truyện' };
    }
    return { type: 'addStory', payload: storyName };
  }

  // Lệnh thêm chương
  if (text.startsWith('thêm chương')) {
    const chapterName = text.replace('thêm chương', '').trim();
    if (!chapterName) {
      return { type: 'addChapter', payload: null, error: 'Vui lòng nhập tên chương' };
    }
    return { type: 'addChapter', payload: chapterName };
  }

  // Lệnh thêm key
  if (text.startsWith('thêm key')) {
    const apiKey = text.replace('thêm key', '').trim();
    if (!apiKey) {
      return { type: 'addKey', payload: null, error: 'Vui lòng nhập API key' };
    }
    return { type: 'addKey', payload: apiKey };
  }

  // Lệnh trợ giúp
  if (text.includes('giúp') || text.includes('help') || text === '?') {
    return { type: 'help', payload: null };
  }

  // Lệnh xóa lịch sử chat
  if (text.includes('xóa') || text.includes('clear')) {
    return { type: 'clear', payload: null };
  }

  // Lệnh không hiểu
  return { 
    type: 'unknown', 
    payload: text,
    error: `Tôi không hiểu lệnh "${text}". Hãy gõ "giúp" để xem các lệnh hỗ trợ.`
  };
}
