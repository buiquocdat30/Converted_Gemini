const { isForeignLanguage, containsChineseChars, containsJapaneseChars, containsKoreanChars } = require('./services/glossaryService');

// Test cases cho việc lọc glossary
const testCases = [
  // Các trường hợp được chấp nhận (tiếng nước ngoài)
  { input: "李宇", expected: true, description: "Tên tiếng Trung" },
  { input: "M都", expected: true, description: "Tên tiếng Trung + Latin" },
  { input: "刘芳华", expected: true, description: "Tên tiếng Trung" },
  { input: "宇仔", expected: true, description: "Biệt danh tiếng Trung" },
  { input: "小韩", expected: true, description: "Tên tiếng Trung" },
  { input: "孙总", expected: true, description: "Tên tiếng Trung" },
  { input: "Haikura Shinku", expected: true, description: "Tên tiếng Nhật (Romaji)" },
  { input: "김민수", expected: true, description: "Tên tiếng Hàn" },
  { input: "John Smith", expected: true, description: "Tên tiếng Anh" },
  { input: "Tokyo", expected: true, description: "Địa danh tiếng Anh" },
  
  // Các trường hợp bị từ chối (tiếng Việt)
  { input: "Lý Vũ", expected: false, description: "Tên tiếng Việt" },
  { input: "Lưu Phương Hoa", expected: false, description: "Tên tiếng Việt" },
  { input: "Lý Hồng Viễn", expected: false, description: "Tên tiếng Việt" },
  { input: "Trương Vĩ", expected: false, description: "Tên tiếng Việt" },
  { input: "Hà Nội", expected: false, description: "Địa danh tiếng Việt" },
  { input: "Sài Gòn", expected: false, description: "Địa danh tiếng Việt" },
  { input: "Việt Nam", expected: false, description: "Tên nước tiếng Việt" },
];

console.log("🧪 Bắt đầu test logic lọc glossary...\n");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = isForeignLanguage(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log("");
  
  if (passed) passedTests++;
});

console.log(`📊 Kết quả: ${passedTests}/${totalTests} tests passed`);

// Test các hàm helper
console.log("\n🔍 Test các hàm helper:");
console.log(`containsChineseChars("李宇"): ${containsChineseChars("李宇")}`);
console.log(`containsJapaneseChars("ハイクラ"): ${containsJapaneseChars("ハイクラ")}`);
console.log(`containsKoreanChars("김민수"): ${containsKoreanChars("김민수")}`);
console.log(`isForeignLanguage("Lý Vũ"): ${isForeignLanguage("Lý Vũ")}`);
console.log(`isForeignLanguage("李宇"): ${isForeignLanguage("李宇")}`); 