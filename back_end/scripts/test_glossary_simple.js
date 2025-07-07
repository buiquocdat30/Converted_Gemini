require("dotenv").config();
const { translateText } = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");

async function testGlossarySimple() {
  console.log("🚀 Test logic thư viện từ mới...");
  
  // Khởi tạo key manager
  const keyManager = new ApiKeyManager();
  
  // Lấy key để sử dụng
  const keyData = await keyManager.getKeyToUse(null, [], "gemini-2.0-flash");
  
  if (!keyData || !keyData.key) {
    console.error("❌ Không tìm thấy key khả dụng!");
    return;
  }
  
  console.log(`🔑 Sử dụng key: ${keyData.key.substring(0, 8)}...`);
  
  // Test với nội dung có tên riêng
  const testContent = `在一个平凡的日子里，李明正在图书馆里看书。突然，他的手机震动了一下。

"这是什么？"李明疑惑地看着手机屏幕上的奇怪应用。

应用的名字叫做"命运转换器"，图标是一个神秘的漩涡。

"看起来很有趣的样子。"李明点击了安装按钮。

安装完成后，应用自动打开了。屏幕上出现了一行字：

"欢迎来到命运转换器，检测到您有成为强者的潜质。"

李明瞪大了眼睛："这是什么意思？"

"请选择您的初始职业："
"1. 武者"
"2. 法师" 
"3. 召唤师"

李明思考了一下，选择了武者。

"恭喜！您已成为武者，获得基础技能：铁拳。"

李明感觉身体里涌起一股暖流，仿佛有什么东西觉醒了。

"这...这是真的吗？"李明握了握拳头，感觉力量确实增强了。

就在这时，图书馆的门被推开了。一个穿着黑色衣服的人走了进来，他的眼神阴冷，身上散发着危险的气息。

"终于找到了。"黑衣人盯着李明说道。

李明心中一紧："你是谁？"

"我是来取你性命的人。"黑衣人说着，手中出现了一把黑色的匕首。

李明知道，他的命运从此改变了。`;
  
  try {
    console.log("📝 Dịch nội dung với storyId để kiểm tra glossary...");
    const result = await translateText(
      testContent, 
      keyData, 
      "gemini-2.0-flash", 
      "content",
      "test-story-123" // Có storyId để kích hoạt logic glossary
    );
    
    console.log("📋 Kết quả dịch:");
    console.log(`  Có translated: ${!!result.translated}`);
    console.log(`  Độ dài: ${result.translated?.length || 0}`);
    console.log(`  Có lỗi: ${!!result.error}`);
    
    if (result.translated) {
      // Tìm phần glossary trong response
      const glossaryMatch = result.translated.match(/📚 THƯ VIỆN TỪ MỚI:\n([\s\S]*?)(?=\n---|$)/);
      
      if (glossaryMatch) {
        const glossaryText = glossaryMatch[1].trim();
        console.log("✅ Tìm thấy phần '📚 THƯ VIỆN TỪ MỚI:'");
        console.log("📚 Nội dung glossary:");
        console.log(glossaryText);
        
        if (glossaryText === "Không có từ mới") {
          console.log("ℹ️ Không có từ mới trong nội dung này");
        } else {
          const words = glossaryText.split('\n').filter(line => line.trim() && line.includes('='));
          console.log(`📊 Số từ mới: ${words.length}`);
          words.forEach(word => console.log(`  - ${word.trim()}`));
        }
      } else {
        console.log("❌ KHÔNG TÌM THẤY phần '📚 THƯ VIỆN TỪ MỚI:' trong response");
        console.log("📄 Response preview:");
        console.log(result.translated.substring(0, 500) + "...");
      }
    }
    
  } catch (error) {
    console.error("❌ Lỗi test:", error.message);
  }
}

// Chạy test
if (require.main === module) {
  testGlossarySimple()
    .then(() => {
      console.log("\n🏁 Test hoàn thành!");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Lỗi:", error);
      process.exit(1);
    });
}

module.exports = { testGlossarySimple }; 