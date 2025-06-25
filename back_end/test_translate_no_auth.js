const axios = require('axios');

// Test API translate không cần auth
async function testTranslateAPINoAuth() {
  try {
    console.log('🧪 Bắt đầu test API translate (không auth)...');
    
    const testData = {
      chapters: [
        {
          chapterNumber: 1,
          title: "Chapter 1: The Beginning",
          content: "This is the first chapter of the story. It introduces the main character."
        },
        {
          chapterNumber: 2,
          title: "Chapter 2: The Journey",
          content: "The journey begins. Our hero faces many challenges."
        }
      ],
      model: "gemini-2.0-flash"
    };

    console.log('📤 Gửi request với dữ liệu:', JSON.stringify(testData, null, 2));

    const response = await axios.post('http://localhost:8000/translate/test', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 giây timeout
    });

    console.log('✅ Response thành công:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Data length:', JSON.stringify(response.data).length);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Kiểm tra cấu trúc response
    if (response.data.chapters && Array.isArray(response.data.chapters)) {
      console.log('✅ Cấu trúc chapters đúng, số lượng:', response.data.chapters.length);
      response.data.chapters.forEach((chapter, index) => {
        console.log(`\n📖 Chương ${index + 1}:`);
        console.log(`  - Chapter Number: ${chapter.chapterNumber}`);
        console.log(`  - Original title: ${chapter.title}`);
        console.log(`  - Translated title: ${chapter.translatedTitle}`);
        console.log(`  - Status: ${chapter.status}`);
        console.log(`  - Translation time: ${chapter.timeTranslation}s`);
        console.log(`  - Has translated content: ${!!chapter.translatedContent}`);
        if (chapter.translationError) {
          console.log(`  - Error: ${chapter.translationError}`);
        }
      });
    } else {
      console.log('❌ Cấu trúc chapters không đúng');
      console.log('Response data:', response.data);
    }

    if (response.data.stats) {
      console.log('\n📊 Thống kê:', response.data.stats);
    }

    if (response.data.keyStatus) {
      console.log('\n🔑 Key Status:', response.data.keyStatus);
    }

  } catch (error) {
    console.error('❌ Lỗi test API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request error:', error.request);
    }
  }
}

// Chạy test
testTranslateAPINoAuth(); 