// Test prompt translation
const testCases = [
  {
    name: "Test tên nhân vật Trung Quốc",
    input: "张伟走进房间，看到李美正在看书。",
    expected: "Trương Vĩ bước vào phòng, thấy Lý Mỹ đang đọc sách."
  },
  {
    name: "Test tên nhân vật Nhật",
    input: "灰倉真紅は学校に行きました。",
    expected: "Haikura Shinku đã đến trường."
  },
  {
    name: "Test tên nhân vật Hàn",
    input: "김철수는 학교에 갔습니다.",
    expected: "Kim Cheol-su đã đến trường."
  },
  {
    name: "Test tên nhân vật Anh",
    input: "John Smith went to the school.",
    expected: "John Smith đã đến trường."
  }
];

console.log("🧪 Test Cases cho Prompt Translation:");
testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`Input: ${testCase.input}`);
  console.log(`Expected: ${testCase.expected}`);
});

console.log("\n📝 Để test thực tế:");
console.log("1. Mở http://localhost:5175/");
console.log("2. Upload file truyện có tên nhân vật nước ngoài");
console.log("3. Dịch 1 chương và kiểm tra kết quả");
console.log("4. Kiểm tra glossary được tạo");

console.log("\n🔍 Kiểm tra log backend:");
console.log("- 📚 Đã tải X items từ glossary");
console.log("- 📝 Prompt gửi đi: Bạn là chuyên gia dịch truyện...");
console.log("- 📤 Response từ API: [kết quả dịch]");
console.log("- ✅ Dịch thành công sau Xs");

console.log("\n🎯 Kết quả mong đợi:");
console.log("- Tên nhân vật được dịch đúng quy tắc");
console.log("- Giữ nhất quán trong toàn bộ văn bản");
console.log("- Không có tên gốc nước ngoài không cần thiết");
console.log("- Glossary được tạo và lưu đúng format"); 