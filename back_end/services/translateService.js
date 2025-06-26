require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiKeyManager = require("./apiKeyManagers");
const publicModelService = require("./publicModelService");

// Mặc định sử dụng Gemini Pro
const DEFAULT_MODEL = "gemini-2.0-flash";

// ⏳ Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translateText = async (text, keyInfo, modelAI) => {
  console.log("✍️ Text đầu vào:", text?.slice(0, 50), "...");

  const { key, usageId, isUserKey } = keyInfo;

  // Kiểm tra nếu không có modelAI thì báo lỗi
  if (!modelAI) {
    throw new Error("Thiếu thông tin modelAI.");
  }

  const currentModelAI = modelAI || DEFAULT_MODEL;

  if (!text) throw new Error("Thiếu nội dung cần dịch.");

  // Kiểm tra key
  if (!key) {
    throw new Error("Không tìm thấy key khả dụng.");
  }

  try {
    console.log("🔑 Dùng key:", key.substring(0, 8) + "...");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: currentModelAI });

    // Cải thiện prompt để dịch hiệu quả hơn
    const prompt = `
    I. VAI TRÒ & MỤC TIÊU
Bạn là "Tên Gọi Chuyên Gia", một công cụ AI chuyên phân tích và chuyển đổi tên gọi (nhân vật, địa danh, tổ chức, biệt danh, thực thể đặc biệt) từ văn bản gốc (tiếng Trung, Anh, Nhật, Hàn) sang tiếng Việt, phục vụ dịch thuật các thể loại: Võng Du, Tiên Hiệp, Huyền Huyễn, Khoa Huyễn, Đô Thị, và Light Novel.  
Mục tiêu: Xác định, phân loại, và chuyển đổi tất cả tên gọi trong văn bản, đảm bảo nhất quán, phù hợp bối cảnh, và thân thiện với độc giả Việt Nam.

Triết lý: Áp dụng "TAM TỰ":
- Tự nhiên: Tên dịch dễ đọc, thuần Việt hoặc giữ nguyên nếu phù hợp.
- Tinh tế: Chuyển đổi chính xác, giữ sắc thái văn hóa và ngữ cảnh.
- Đặc sắc: Phù hợp với thể loại truyện (VD: Võng Du giữ IGN, Tiên Hiệp dùng Hán Việt).

II. QUY TẮC PHÂN TÍCH & CHUYỂN ĐỔI
1. **Xác định & Phân loại**:
   - Tìm TẤT CẢ tên gọi: Nhân vật, địa danh, tổ chức, biệt danh, thực thể đặc biệt (chiêu thức, vật phẩm, công pháp, v.v.).
   - Phân loại theo: Loại (nhân vật, địa danh, v.v.), ngôn ngữ gốc (Trung, Anh, Nhật, Hàn), và thể loại truyện (Võng Du, Tiên Hiệp, v.v.).
   - Loại bỏ từ chung không phải tên riêng (VD: "ma vương" không liệt kê trừ khi là tên riêng như Ma Vương Aros).

2. **Tính nhất quán**:
   - Một tên gốc chỉ có một tên dịch duy nhất, lưu trong bảng chú giải (glossary) ảo, tái sử dụng ở mọi lần xuất hiện.
   - Phát hiện và thống nhất biến thể (VD: シンク và 灰倉真紅 đều là Haikura Shinku).
   - Với tên viết tắt, truy ngược tên đầy đủ (VD: J. Smith → John Smith).

3. **Chuyển đổi theo ngôn ngữ & thể loại**:
   | Ngôn ngữ | Thể loại | Quy tắc chuyển đổi |
   |----------|----------|--------------------|
   | **Tiếng Trung** | Tiên Hiệp, Huyền Huyễn | Ưu tiên Hán Việt (VD: 闾丘文月 → Lư Khâu Văn Nguyệt). Nếu không phù hợp, dùng Pinyin (VD: 张伟 → Zhang Wei). Biệt danh: Dịch nghĩa (VD: 飞龙 → Phi Long). |
   | | Võng Du, Đô Thị, Khoa Huyễn | Hán Việt cho tên nhân vật (VD: 李白 → Lý Bạch). Giữ IGN hoặc dịch nghĩa cho biệt danh (VD: 火龙 → Hỏa Long). |
   | **Tiếng Nhật** | Light Novel, Võng Du | Ưu tiên Romaji chuẩn Hepburn (VD: 山田太郎 → Yamada Tarou). Biệt danh: Dịch nghĩa (VD: スピードスター → Speedster). Giữ nguyên nếu mang tính biểu tượng (VD: 鬼滅 → Kimetsu). Hán Việt cho tên cổ điển (VD: 舜 → Thuấn). |
   | **Tiếng Hàn** | Light Novel, Đô Thị | Phiên âm Romanized (VD: 김민수 → Kim Min-su). Biệt danh: Dịch nghĩa (VD: 바람의아들 → Con Trai Gió). Giữ nguyên nếu phổ biến (VD: 태양 → Taeyang). |
   | **Tiếng Anh** | Light Novel, Võng Du, Khoa Huyễn | Giữ nguyên tên gốc (VD: John Smith → John Smith). Biệt danh: Dịch nghĩa (VD: The Black Knight → Hiệp Sĩ Đen). Anh hóa tên phương Tây khác (VD: François → Francis). |
   | **Đa ngôn ngữ** | Tất cả | Ưu tiên dạng phổ biến nhất trong ngữ cảnh (VD: ジョン・スミス → John Smith, không phải Jon Sumisu). |

4. **Xử lý lỗi & trường hợp đặc biệt**:
   - **Lỗi dính chữ**: Tự động sửa (VD: HọcviệnOnmyou → Học viện Onmyou; LãnhđạoguildHermes → Lãnh đạo guild Hermes).
   - **Lỗi chính tả**: Chuẩn hóa dấu thanh, dấu cách, chữ hoa (VD: AnhấylàEliteWarrior → Anh ấy là Elite Warrior).
   - **Thuật ngữ đặc trưng**: Giữ nguyên nếu phổ biến (VD: tsundere, chaebol, guild) hoặc Việt hóa nhẹ (VD: 魔法陣 → Pháp Trận).
   - **Tên đa nghĩa**: Xác định theo ngữ cảnh và thể loại (VD: "Hỏa Long" là biệt danh nhân vật hay chiêu thức?).
   - **Tên hỗn hợp**: Ưu tiên ngôn ngữ chính của văn bản (VD: nhân vật Nhật có tên Anh như John Smith giữ nguyên).

5. **Thể loại cụ thể**:
   - **Võng Du**: Giữ IGN (VD: EliteWarrior → Elite Warrior), Hán Việt cho tên đời thực (VD: 王浩 → Vương Hạo).
   - **Tiên Hiệp/Huyền Huyễn**: Hán Việt cho nhân vật, địa danh, công pháp (VD: 青莲剑 → Thanh Liên Kiếm).
   - **Khoa Huyễn**: Giữ tên công nghệ tiếng Anh (VD: Starship → Starship) hoặc hiện đại hóa (VD: 光脑 → Trí Não Quang Tử).
   - **Đô Thị**: Tên hiện đại (VD: Jack Trần) hoặc Hán Việt nhẹ (VD: 李星 → Lý Tinh).
   - **Light Novel**: Linh hoạt theo ngôn ngữ (VD: Kirito giữ nguyên, 桐ヶ谷和人 → Kirigaya Kazuto).

III. ĐỊNH DẠNG TRẢ VỀ
- Trả về: [Tên gốc] = [Tên đã chuyển đổi] [Loại] [Ngôn ngữ].
- Mỗi tên trên một dòng, sắp xếp theo thứ tự xuất hiện trong văn bản.
- Chỉ liệt kê tên gốc duy nhất một lần.
- Ví dụ:
  - 舜 = Thuấn [Nhân vật] [Nhật]
  - 江南 = Giang Nam [Địa danh] [Trung]
  - 闾丘文月 = Lư Khâu Văn Nguyệt [Nhân vật] [Trung]
  - John Smith = John Smith [Nhân vật] [Anh]
  - 山田太郎 = Yamada Tarou [Nhân vật] [Nhật]
  - スピードスター = Speedster [Biệt danh] [Nhật]
  - ヴィクトリアス = Victorias [Tổ chức] [Nhật]
  - 魔法陣 = Pháp Trận [Thực thể] [Nhật]
  - The Black Order = Hắc Đoàn [Tổ chức] [Anh]
  - 김민수 = Kim Min-su [Nhân vật] [Hàn]
  - 서울 = Seoul [Địa danh] [Hàn]

IV. YÊU CẦU CẤM
- KHÔNG giải thích, ghi chú, hoặc thêm văn bản ngoài danh sách tên.
- KHÔNG bỏ sót bất kỳ tên gọi nào thuộc các loại trên.
- KHÔNG thay đổi quy tắc ưu tiên trừ khi có chỉ thị rõ ràng.
- KHÔNG giữ Hán tự/Pinyin/Romaji trong [Tên đã chuyển đổi] trừ trường hợp được chỉ định (VD: Zhang Wei, Kirito).
- Bắt đầu dịch truyện từ đoạn sau:\n\n${text}`;

    console.log("📝 Prompt gửi đi:", prompt.substring(0, 100) + "...");

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translated = response.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("📤 Response từ API:", translated.substring(0, 100) + "...");
    console.log("📏 Độ dài text gốc:", text.length);
    console.log("📏 Độ dài text dịch:", translated.length);

    const isUnchanged = translated.trim() === text.trim();

    if (isUnchanged) {
      console.warn(
        `⚠️ Bản dịch không thay đổi cho key ${key.substring(0, 8)}...`
      );
      console.warn("🔍 Text gốc:", text.substring(0, 100));
      console.warn("🔍 Text dịch:", translated.substring(0, 100));
    }

    // Cập nhật thống kê sử dụng key nếu có usageId
    if (response.usageMetadata && usageId) {
      const apiKeyManager = new ApiKeyManager();
      await apiKeyManager.updateUsageStats(
        usageId,
        response.usageMetadata,
        isUserKey
      );
    }

    console.log(
      `✅ Dịch thành công sau ${duration}s với key ${key.substring(0, 8)}...`
    );

    // Đảm bảo luôn trả về đúng format
    const resultObj = {
      translated: translated || text, // Fallback về text gốc nếu translated rỗng
      usage: response.usageMetadata || null,
      isUnchanged: isUnchanged,
    };

    console.log("📋 Kết quả trả về:", {
      hasTranslated: !!resultObj.translated,
      translatedLength: resultObj.translated?.length || 0,
      isUnchanged: resultObj.isUnchanged,
      translatedPreview: resultObj.translated?.substring(0, 50) + "...",
    });

    return resultObj;
  } catch (error) {
    const errorMessage = error.message || error.toString();
    console.error("⚠️ Lỗi dịch:", errorMessage);

    // Trả về text gốc nếu có lỗi nhưng không throw error
    console.log("🔄 Trả về text gốc do lỗi dịch");
    return {
      translated: text, // Trả về text gốc
      usage: null,
      isUnchanged: true,
      error: errorMessage, // Thêm thông tin lỗi
    };
  }
};

module.exports = {
  translateText,
};
