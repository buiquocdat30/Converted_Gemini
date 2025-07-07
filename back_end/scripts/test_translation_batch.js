require("dotenv").config();
const { translateText } = require("../services/translateService");
const ApiKeyManager = require("../services/apiKeyManagers");

// Dữ liệu test 3 chương
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

async function testTranslationBatch() {
  console.log("🚀 Bắt đầu test dịch batch 3 chương...");
  
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
  
  for (let i = 0; i < testChapters.length; i++) {
    const chapter = testChapters[i];
    console.log(`\n📖 Đang dịch chương ${chapter.chapterNumber}: ${chapter.title}`);
    
    try {
      // Dịch tiêu đề
      console.log("🔤 Dịch tiêu đề...");
      const titleResult = await translateText(
        chapter.title, 
        keyData, 
        "gemini-2.0-flash", 
        "title"
      );
      
      console.log("📋 Kết quả dịch tiêu đề:", {
        original: chapter.title,
        translated: titleResult.translated,
        isUnchanged: titleResult.isUnchanged,
        hasError: !!titleResult.error,
        error: titleResult.error
      });
      
      // Dịch nội dung
      console.log("📝 Dịch nội dung...");
      const contentResult = await translateText(
        chapter.content, 
        keyData, 
        "gemini-2.0-flash", 
        "content"
      );
      
      console.log("📋 Kết quả dịch nội dung:", {
        originalLength: chapter.content.length,
        translatedLength: contentResult.translated?.length || 0,
        isUnchanged: contentResult.isUnchanged,
        hasError: !!contentResult.error,
        error: contentResult.error,
        translatedPreview: contentResult.translated?.substring(0, 100) + "..."
      });
      
      // Kiểm tra kết quả
      const isTitleSuccess = titleResult.translated && !titleResult.isUnchanged;
      const isContentSuccess = contentResult.translated && !contentResult.isUnchanged;
      
      results.push({
        chapterNumber: chapter.chapterNumber,
        title: {
          original: chapter.title,
          translated: titleResult.translated,
          success: isTitleSuccess,
          error: titleResult.error
        },
        content: {
          originalLength: chapter.content.length,
          translated: contentResult.translated,
          success: isContentSuccess,
          error: contentResult.error
        },
        overallSuccess: isTitleSuccess && isContentSuccess
      });
      
      console.log(`✅ Chương ${chapter.chapterNumber} - Tiêu đề: ${isTitleSuccess ? '✅' : '❌'}, Nội dung: ${isContentSuccess ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`❌ Lỗi dịch chương ${chapter.chapterNumber}:`, error.message);
      results.push({
        chapterNumber: chapter.chapterNumber,
        error: error.message,
        overallSuccess: false
      });
    }
  }
  
  // Tổng kết kết quả
  console.log("\n📊 TỔNG KẾT KẾT QUẢ:");
  console.log("=".repeat(50));
  
  const successCount = results.filter(r => r.overallSuccess).length;
  const failedCount = results.length - successCount;
  
  console.log(`Tổng số chương: ${results.length}`);
  console.log(`Thành công: ${successCount}`);
  console.log(`Thất bại: ${failedCount}`);
  
  console.log("\n📋 Chi tiết từng chương:");
  results.forEach(result => {
    if (result.error) {
      console.log(`Chương ${result.chapterNumber}: ❌ Lỗi - ${result.error}`);
    } else {
      console.log(`Chương ${result.chapterNumber}:`);
      console.log(`  Tiêu đề: ${result.title.success ? '✅' : '❌'} "${result.title.original}" → "${result.title.translated}"`);
      console.log(`  Nội dung: ${result.content.success ? '✅' : '❌'} (${result.content.originalLength} ký tự → ${result.content.translated?.length || 0} ký tự)`);
      if (result.title.error) console.log(`    Lỗi tiêu đề: ${result.title.error}`);
      if (result.content.error) console.log(`    Lỗi nội dung: ${result.content.error}`);
    }
  });
  
  // Phân tích vấn đề
  console.log("\n🔍 PHÂN TÍCH VẤN ĐỀ:");
  console.log("=".repeat(50));
  
  const titleFailures = results.filter(r => !r.error && !r.title.success);
  const contentFailures = results.filter(r => !r.error && !r.content.success);
  
  if (titleFailures.length > 0) {
    console.log(`❌ ${titleFailures.length} chương có vấn đề với tiêu đề:`);
    titleFailures.forEach(r => {
      console.log(`  - Chương ${r.chapterNumber}: ${r.title.error || 'Không thay đổi'}`);
    });
  }
  
  if (contentFailures.length > 0) {
    console.log(`❌ ${contentFailures.length} chương có vấn đề với nội dung:`);
    contentFailures.forEach(r => {
      console.log(`  - Chương ${r.chapterNumber}: ${r.content.error || 'Không thay đổi'}`);
    });
  }
  
  if (titleFailures.length === 0 && contentFailures.length === 0 && failedCount === 0) {
    console.log("✅ Tất cả chương đều dịch thành công!");
  }
}

// Chạy test
if (require.main === module) {
  testTranslationBatch()
    .then(() => {
      console.log("\n🏁 Test hoàn thành!");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Lỗi trong quá trình test:", error);
      process.exit(1);
    });
}

module.exports = { testTranslationBatch }; 