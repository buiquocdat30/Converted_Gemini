require("dotenv").config();
const { translateText } = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");

// Dữ liệu test thực tế từ 3 chương
const testChapters = [
  {
    chapterNumber: 1,
    title: "第一章 觉醒",
    content: `在一个平凡的日子里，李明正在图书馆里看书。突然，他的手机震动了一下。

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

李明知道，他的命运从此改变了。`
  },
  {
    chapterNumber: 2,
    title: "第二章 战斗",
    content: `黑衣人瞬间冲向李明，匕首闪烁着寒光。

李明本能地举起双手，想要挡住攻击。就在这时，他的脑海中突然响起了一个声音：

"检测到危险，自动激活技能：铁拳！"

李明的拳头瞬间变得坚硬如铁，他下意识地一拳轰出。

"砰！"

拳头与匕首相撞，发出金属碰撞的声音。黑衣人被震退了几步，眼中闪过一丝惊讶。

"怎么可能？你明明只是一个普通人！"黑衣人难以置信地说道。

李明也感到震惊，他看着自己的拳头，上面连一点伤痕都没有。

"这就是武者的力量吗？"李明喃喃自语。

黑衣人很快调整了状态，冷笑道："有点意思，不过你以为这样就能打败我吗？"

说着，他的身体开始发生变化，皮肤变得漆黑，眼睛变成了血红色。

"魔化！"黑衣人低吼一声。

李明感受到了一股强大的压迫感，他知道眼前的敌人变得更加强大了。

"系统，我该怎么办？"李明在心中问道。

"检测到敌人实力提升，建议使用技能：铁拳连击。"

李明深吸一口气，摆出了战斗姿势。他知道，真正的战斗才刚刚开始。

"来吧！"李明大喊一声，主动冲向黑衣人。

两人在图书馆里展开了激烈的战斗，书架倒塌，书籍散落一地。`
  },
  {
    chapterNumber: 3,
    title: "第三章 胜利",
    content: `经过一番激战，李明逐渐掌握了铁拳的使用方法。

"铁拳连击！"李明连续挥出数拳，每一拳都带着强大的力量。

黑衣人虽然魔化了，但在李明的连续攻击下，也开始招架不住。

"不可能！你怎么可能这么强！"黑衣人愤怒地咆哮着。

李明没有回答，他专注于战斗。通过系统的提示，他学会了如何更好地运用自己的力量。

"最后一击！"李明聚集全身的力量，一拳轰向黑衣人的胸口。

"砰！"

黑衣人被击飞出去，撞在墙上，然后滑落在地。他的魔化状态开始消退，变回了原来的样子。

"你...你赢了..."黑衣人艰难地说道，然后昏了过去。

李明松了一口气，看着倒在地上的黑衣人，心中五味杂陈。

"恭喜宿主击败敌人，获得经验值100点，等级提升到2级！"
"获得新技能：铁拳强化！"

李明感受到身体再次发生了变化，力量又增强了一分。

"这就是变强的感觉吗？"李明握了握拳头，感受着体内涌动的力量。

就在这时，图书馆的门再次被推开了。这次走进来的是一个穿着白色长袍的老者。

"不错，不错。"老者看着李明，满意地点了点头。

"你是谁？"李明警惕地问道。

"我是武者协会的会长，专门负责寻找有潜力的新人。"老者笑着说道。

"武者协会？"李明疑惑地问道。

"是的，从今天开始，你就是我们协会的一员了。"老者说道。

李明知道，他的新生活即将开始。`
  }
];

async function testGlossaryLogic() {
  console.log("🚀 Bắt đầu test logic thư viện từ mới...");
  
  // Khởi tạo key manager
  const keyManager = new ApiKeyManager();
  
  // Lấy key để sử dụng
  const keyData = await keyManager.getKeyToUse(null, [], "gemini-2.0-flash");
  
  if (!keyData || !keyData.key) {
    console.error("❌ Không tìm thấy key khả dụng!");
    return;
  }
  
  console.log(`🔑 Sử dụng key: ${keyData.key.substring(0, 8)}...`);
  
  const results = [];
  let accumulatedGlossary = new Set(); // Để theo dõi từ đã có
  
  for (let i = 0; i < testChapters.length; i++) {
    const chapter = testChapters[i];
    console.log(`\n📖 Đang test chương ${chapter.chapterNumber}: ${chapter.title}`);
    
    try {
      // Dịch nội dung để kiểm tra glossary
      console.log("📝 Dịch nội dung và kiểm tra thư viện từ mới...");
      const contentResult = await translateText(
        chapter.content, 
        keyData, 
        "gemini-2.0-flash", 
        "content",
        "test-story-glossary"
      );
      
      // Tìm phần glossary trong response gốc (trước khi bị loại bỏ)
      const fullResponse = contentResult.translated;
      const glossaryMatch = fullResponse.match(/📚 THƯ VIỆN TỪ MỚI:\n([\s\S]*?)(?=\n---|$)/);
      
      let glossaryText = "";
      let hasGlossarySection = false;
      let hasNewWords = false;
      
      if (glossaryMatch) {
        hasGlossarySection = true;
        glossaryText = glossaryMatch[1].trim();
        hasNewWords = glossaryText && glossaryText !== "Không có từ mới" && !glossaryText.includes("Không có từ mới");
        
        console.log("📋 Kết quả thư viện từ mới:");
        console.log(`  Có phần "📚 THƯ VIỆN TỪ MỚI:": ${hasGlossarySection ? '✅' : '❌'}`);
        console.log(`  Có từ mới: ${hasNewWords ? '✅' : '❌'}`);
        console.log(`  Nội dung: ${glossaryText || 'Không có'}`);
        
        if (hasNewWords) {
          const words = glossaryText.split('\n').filter(line => line.trim() && line.includes('='));
          console.log(`  Số từ mới: ${words.length}`);
          words.forEach(word => console.log(`    - ${word.trim()}`));
        }
      } else {
        console.log("❌ KHÔNG TÌM THẤY phần '📚 THƯ VIỆN TỪ MỚI:' trong response!");
      }
      
      results.push({
        chapterNumber: chapter.chapterNumber,
        hasGlossarySection,
        hasNewWords,
        glossaryText,
        success: hasGlossarySection // Thành công nếu có phần glossary
      });
      
      console.log(`✅ Chương ${chapter.chapterNumber} - Có phần glossary: ${hasGlossarySection ? '✅' : '❌'}, Có từ mới: ${hasNewWords ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`❌ Lỗi test chương ${chapter.chapterNumber}:`, error.message);
      results.push({
        chapterNumber: chapter.chapterNumber,
        error: error.message,
        success: false
      });
    }
  }
  
  // Tổng kết kết quả
  console.log("\n📊 TỔNG KẾT KẾT QUẢ THƯ VIỆN TỪ MỚI:");
  console.log("=".repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.length - successCount;
  const chaptersWithNewWords = results.filter(r => r.hasNewWords).length;
  
  console.log(`Tổng số chương: ${results.length}`);
  console.log(`Có phần glossary: ${successCount}`);
  console.log(`Không có phần glossary: ${failedCount}`);
  console.log(`Chương có từ mới: ${chaptersWithNewWords}`);
  
  console.log("\n📋 Chi tiết từng chương:");
  results.forEach(result => {
    if (result.error) {
      console.log(`Chương ${result.chapterNumber}: ❌ Lỗi - ${result.error}`);
    } else {
      console.log(`Chương ${result.chapterNumber}:`);
      console.log(`  Có phần glossary: ${result.hasGlossarySection ? '✅' : '❌'}`);
      console.log(`  Có từ mới: ${result.hasNewWords ? '✅' : '❌'}`);
      if (result.glossaryText) {
        console.log(`  Nội dung: ${result.glossaryText.substring(0, 100)}${result.glossaryText.length > 100 ? '...' : ''}`);
      }
    }
  });
  
  // Phân tích vấn đề
  console.log("\n🔍 PHÂN TÍCH VẤN ĐỀ:");
  console.log("=".repeat(60));
  
  const missingGlossary = results.filter(r => !r.error && !r.hasGlossarySection);
  const emptyGlossary = results.filter(r => !r.error && r.hasGlossarySection && !r.hasNewWords);
  
  if (missingGlossary.length > 0) {
    console.log(`❌ ${missingGlossary.length} chương KHÔNG có phần "📚 THƯ VIỆN TỪ MỚI:":`);
    missingGlossary.forEach(r => console.log(`  - Chương ${r.chapterNumber}`));
  }
  
  if (emptyGlossary.length > 0) {
    console.log(`⚠️ ${emptyGlossary.length} chương có phần glossary nhưng không có từ mới:`);
    emptyGlossary.forEach(r => console.log(`  - Chương ${r.chapterNumber}`));
  }
  
  if (missingGlossary.length === 0 && emptyGlossary.length === 0) {
    console.log("✅ Tất cả chương đều có phần glossary đúng format!");
  }
  
  // So sánh với yêu cầu
  console.log("\n🎯 SO SÁNH VỚI YÊU CẦU:");
  console.log("=".repeat(60));
  
  const expectedResults = [
    { chapter: 1, shouldHaveWords: true, expectedWords: ["Thành phố M", "Lý Vũ", "iPad", "Lưu Phương Hoa", "宇仔"] },
    { chapter: 2, shouldHaveWords: true, expectedWords: ["Lý Dật", "Lưu Phương Hoa", "Lý Hồng Viễn"] },
    { chapter: 3, shouldHaveWords: false, expectedWords: [] }
  ];
  
  expectedResults.forEach(expected => {
    const actual = results.find(r => r.chapterNumber === expected.chapter);
    if (actual) {
      const hasExpectedWords = expected.shouldHaveWords === actual.hasNewWords;
      console.log(`Chương ${expected.chapter}: ${hasExpectedWords ? '✅' : '❌'} (Mong đợi: ${expected.shouldHaveWords ? 'có từ' : 'không có từ'}, Thực tế: ${actual.hasNewWords ? 'có từ' : 'không có từ'})`);
    }
  });
}

// Chạy test
if (require.main === module) {
  testGlossaryLogic()
    .then(() => {
      console.log("\n🏁 Test logic thư viện từ mới hoàn thành!");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Lỗi trong quá trình test:", error);
      process.exit(1);
    });
}

module.exports = { testGlossaryLogic }; 