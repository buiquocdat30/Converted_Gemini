require("dotenv").config();

console.log("🚀 Bắt đầu chạy các test dịch...");
console.log("=".repeat(60));

async function runAllTests() {
  try {
    // Test 1: Test trực tiếp translateService
    console.log("\n📋 TEST 1: Test trực tiếp translateService");
    console.log("-".repeat(40));
    
    const { testTranslationBatch } = require("./test_translation_batch");
    await testTranslationBatch();
    
    console.log("\n" + "=".repeat(60));
    
    // Test 2: Test API endpoint (nếu server đang chạy)
    console.log("\n📋 TEST 2: Test API endpoint");
    console.log("-".repeat(40));
    console.log("⚠️ Lưu ý: Đảm bảo server đang chạy trên port 3001");
    console.log("   Nếu server chạy trên port khác, hãy sửa trong file test_api_endpoint.js");
    
    const { testApiEndpoint } = require("./test_api_endpoint");
    await testApiEndpoint();
    
    console.log("\n" + "=".repeat(60));
    console.log("🏁 Tất cả test đã hoàn thành!");
    
  } catch (error) {
    console.error("❌ Lỗi trong quá trình chạy test:", error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log("\n💡 Gợi ý:");
      console.log("1. Đảm bảo server backend đang chạy: npm start");
      console.log("2. Kiểm tra port trong file test_api_endpoint.js");
      console.log("3. Chạy lại test sau khi server đã khởi động");
    }
  }
}

// Chạy test
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log("\n✅ Hoàn thành tất cả test!");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Lỗi:", error);
      process.exit(1);
    });
}

module.exports = { runAllTests }; 