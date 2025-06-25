const axios = require('axios');

// Test API translate với dữ liệu tiếng Trung
async function testChineseTranslate() {
  try {
    console.log('🧪 Bắt đầu test API translate với dữ liệu tiếng Trung...');
    
    const testData = {
      chapters: [
        {
          chapterNumber: 1,
          title: "第一章 距离末日还有180天",
          content: "在一个遥远的星球，星光闪耀，一颗流星坠入\n\n..........\n\n李宇从睡梦中惊醒，习惯性的握紧放在胸口的短刀。\n\n但发现手中拿着的却是iPad，上面正播放着电影。\n\n砰的一声枪声让李宇瞬间从沙发上弹跳起来，有些神经质地环顾四周，听枪声的来源。"
        }
      ],
      model: "gemini-2.0-flash"
    };

    console.log('📤 Gửi request với dữ liệu tiếng Trung...');

    const response = await axios.post('http://localhost:8000/translate/test', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 giây timeout
    });

    console.log('✅ Response thành công:');
    console.log('Status:', response.status);
    
    // Kiểm tra cấu trúc response
    if (response.data.chapters && Array.isArray(response.data.chapters)) {
      console.log('✅ Cấu trúc chapters đúng, số lượng:', response.data.chapters.length);
      response.data.chapters.forEach((chapter, index) => {
        console.log(`\n📖 Chương ${index + 1}:`);
        console.log(`  - Chapter Number: ${chapter.chapterNumber}`);
        console.log(`  - Original title: ${chapter.title}`);
        console.log(`  - Translated title: ${chapter.translatedTitle}`);
        console.log(`  - Title changed: ${chapter.title !== chapter.translatedTitle}`);
        console.log(`  - Status: ${chapter.status}`);
        console.log(`  - Translation time: ${chapter.timeTranslation}s`);
        console.log(`  - Original content length: ${chapter.content?.length || 0}`);
        console.log(`  - Translated content length: ${chapter.translatedContent?.length || 0}`);
        console.log(`  - Content changed: ${chapter.content !== chapter.translatedContent}`);
        console.log(`  - Original content (50 chars): ${chapter.content?.substring(0, 50)}...`);
        console.log(`  - Translated content (50 chars): ${chapter.translatedContent?.substring(0, 50)}...`);
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

  } catch (error) {
    console.error('❌ Lỗi test API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('Request error - Server có thể không chạy');
    }
  }
}

// Chạy test
testChineseTranslate(); 