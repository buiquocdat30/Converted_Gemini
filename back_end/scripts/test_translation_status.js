require("dotenv").config();
const axios = require("axios");

// Cấu hình API
const API_BASE_URL = "http://localhost:3001";
const API_ENDPOINT = "/api/translate";

// Dữ liệu test 3 chương (bạn có thể thay đổi cho phù hợp)
const testChapters = [
  {
    chapterNumber: 1,
    title: "Còn 180 ngày nữa đến ngày tận thế",
    content: `Trên một hành tinh xa xôi, ánh sao lấp lánh, một thiên thạch rơi xuống...\n\nLý Vũ giật mình tỉnh giấc... (rút gọn cho ví dụ)`
  },
  {
    chapterNumber: 2,
    title: "Trúng giải 30 triệu",
    content: `Khoảng 179 ngày nữa là đến ngày tận thế. Gần đây trời liên tục mưa phùn... (rút gọn cho ví dụ)`
  },
  {
    chapterNumber: 3,
    title: "Xây dựng căn cứ",
    content: `Chiều nay Lý Dật không đi đâu, hôm qua ngồi tàu cả đêm, Lý Dật nằm nhà nghỉ ngơi... (rút gọn cho ví dụ)`
  }
];

async function testTranslationStatus() {
  console.log("🚀 Bắt đầu test trạng thái dịch batch 3 chương...");
  console.log(`📡 API: ${API_BASE_URL}${API_ENDPOINT}`);

  const requestData = {
    chapters: testChapters,
    model: "gemini-2.0-flash",
    storyId: "test-story-status-001"
  };

  try {
    const response = await axios.post(
      `${API_BASE_URL}${API_ENDPOINT}`,
      requestData,
      { headers: { 'Content-Type': 'application/json' }, timeout: 300000 }
    );
    const result = response.data;

    console.log("\n📊 KẾT QUẢ TỔNG QUAN:");
    console.log("=".repeat(60));
    console.log(`Tổng số chương: ${result.chapters.length}`);
    console.log(`Thành công: ${result.stats?.success || 0}`);
    console.log(`Thất bại: ${result.stats?.failed || 0}`);

    // Chi tiết từng chương
    result.chapters.forEach((ch, idx) => {
      console.log(`\n📖 Chương ${ch.chapterNumber}: ${ch.translatedTitle}`);
      console.log(`  - Trạng thái: ${ch.status}`);
      console.log(`  - Glossary: \n${ch.glossary}`);
      console.log(`  - Nội dung dịch: ${(ch.translatedContent||'').slice(0, 100)}...`);
      if (ch.translationError) {
        console.log(`  ❌ Lỗi: ${ch.translationError}`);
      }
    });

    // Phân tích glossary
    console.log("\n🔍 PHÂN TÍCH GLOSSARY:");
    result.chapters.forEach((ch, idx) => {
      if (!ch.glossary) {
        console.log(`❌ Chương ${ch.chapterNumber} không có glossary!`);
      } else if (ch.glossary === "Không có từ mới") {
        console.log(`ℹ️ Chương ${ch.chapterNumber}: Không có từ mới.`);
      } else {
        const lines = ch.glossary.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          if (!/^.+? = .+? \[.+?\] \[.+?\]$/.test(line)) {
            console.log(`⚠️ Chương ${ch.chapterNumber} glossary format lạ: ${line}`);
          }
        });
      }
    });

    // Tổng kết
    console.log("\n🏁 Test trạng thái dịch hoàn thành!");
  } catch (error) {
    console.error("❌ Lỗi khi gọi API:", error.message);
    if (error.response) {
      console.error("📊 Response error:", error.response.data);
    }
  }
}

if (require.main === module) {
  testTranslationStatus();
}

module.exports = { testTranslationStatus }; 