const { translateText } = require('./services/translateService');
const ApiKeyManager = require('./services/apiKeyManagers');

async function testTranslateService() {
  try {
    console.log('🧪 Test translateService...');
    
    // Tạo key manager để lấy key
    const keyManager = new ApiKeyManager();
    
    // Lấy key khả dụng
    const keyInfo = await keyManager.getKeyToUse(null, null, 'gemini-2.0-flash');
    console.log('🔑 Key info:', {
      hasKey: !!keyInfo.key,
      keyPreview: keyInfo.key?.substring(0, 10) + '...',
      isUserKey: keyInfo.isUserKey
    });
    
    // Test dịch tiêu đề
    console.log('\n📝 Test dịch tiêu đề:');
    const titleText = '第一章 距离末日还有180天';
    const titleResult = await translateText(titleText, keyInfo, 'gemini-2.0-flash');
    console.log('Tiêu đề gốc:', titleText);
    console.log('Tiêu đề dịch:', titleResult.translated);
    console.log('Có thay đổi:', !titleResult.isUnchanged);
    
    // Test dịch nội dung ngắn
    console.log('\n📝 Test dịch nội dung ngắn:');
    const shortContent = '在一个遥远的星球，星光闪耀，一颗流星坠入。李宇从睡梦中惊醒，习惯性的握紧放在胸口的短刀。';
    const shortResult = await translateText(shortContent, keyInfo, 'gemini-2.0-flash');
    console.log('Nội dung gốc:', shortContent);
    console.log('Nội dung dịch:', shortResult.translated);
    console.log('Có thay đổi:', !shortResult.isUnchanged);
    
    // Test dịch nội dung dài hơn
    console.log('\n📝 Test dịch nội dung dài:');
    const longContent = `在一个遥远的星球，星光闪耀，一颗流星坠入

..........

李宇从睡梦中惊醒，习惯性的握紧放在胸口的短刀。

但发现手中拿着的却是iPad，上面正播放着电影。

"砰！"的一声枪声让李宇瞬间从沙发上弹跳起来，有些神经质地环顾四周，听枪声的来源。`;
    
    const longResult = await translateText(longContent, keyInfo, 'gemini-2.0-flash');
    console.log('Nội dung gốc (50 ký tự đầu):', longContent.substring(0, 50) + '...');
    console.log('Nội dung dịch (50 ký tự đầu):', longResult.translated.substring(0, 50) + '...');
    console.log('Có thay đổi:', !longResult.isUnchanged);
    console.log('Độ dài gốc:', longContent.length);
    console.log('Độ dài dịch:', longResult.translated.length);
    
  } catch (error) {
    console.error('❌ Lỗi test:', error.message);
  }
}

testTranslateService(); 