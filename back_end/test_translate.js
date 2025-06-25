const axios = require('axios');

// Test API translate
async function testTranslateAPI() {
  try {
    console.log('🧪 Bắt đầu test API translate...');
    
    const testData = {
      chapters: [
        {
          chapterNumber: 1,
          title: "Chapter 1: The Beginning",
          content: "This is the first chapter of the story. It introduces the main character."
        }
      ],
      model: "gemini-2.0-flash"
    };

    console.log('📤 Gửi request với dữ liệu:', JSON.stringify(testData, null, 2));

    const response = await axios.post('http://localhost:8000/translate', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Có thể cần token thật
      },
      timeout: 30000 // 30 giây timeout
    });

    console.log('✅ Response thành công:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Kiểm tra cấu trúc response
    if (response.data.chapters && Array.isArray(response.data.chapters)) {
      console.log('✅ Cấu trúc chapters đúng');
      response.data.chapters.forEach((chapter, index) => {
        console.log(`Chương ${index + 1}:`);
        console.log(`  - Original title: ${chapter.title}`);
        console.log(`  - Translated title: ${chapter.translatedTitle}`);
        console.log(`  - Status: ${chapter.status}`);
        console.log(`  - Translation time: ${chapter.timeTranslation}s`);
      });
    } else {
      console.log('❌ Cấu trúc chapters không đúng');
    }

    if (response.data.stats) {
      console.log('✅ Có thống kê:', response.data.stats);
    }

  } catch (error) {
    console.error('❌ Lỗi test API:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    }
  }
}

// Chạy test
testTranslateAPI(); 