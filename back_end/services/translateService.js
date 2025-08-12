require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiKeyManager = require("./apiKeyManagers");
const publicModelService = require("./publicModelService");
const { extractAndSaveGlossary, getGlossaryByStoryId, formatGlossaryForAI } = require("./glossaryService");
const ErrorHandlerService = require("./errorHandlerService");

// Mặc định sử dụng Gemini Pro
const DEFAULT_MODEL = "gemini-2.0-flash";

// ⏳ Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Khởi tạo ErrorHandlerService
const errorHandler = new ErrorHandlerService();

const translateText = async (text, keyInfo, modelAI, type = "content", storyId = null) => {
  console.log("🔤 [TRANSLATE] ===== BẮT ĐẦU DỊCH =====");
  console.log("✍️ [TRANSLATE] Text đầu vào:", text?.slice(0, 50), "...");
  console.log("[TRANSLATE] 📋 Thông tin:", {
    type: type,
    model: modelAI?.name || modelAI,
    storyId: storyId,
    textLength: text?.length || 0
  });

  const { key, usageId, isUserKey } = keyInfo;

  // Kiểm tra nếu không có modelAI thì báo lỗi
  if (!modelAI) {
    console.log("[TRANSLATE] ❌ Lỗi: Thiếu thông tin modelAI");
    throw new Error("Thiếu thông tin modelAI.");
  }

  const currentModelAI = modelAI?.value || modelAI || DEFAULT_MODEL;

  if (!text) {
    console.log("[TRANSLATE] ❌ Lỗi: Thiếu nội dung cần dịch");
    throw new Error("Thiếu nội dung cần dịch.");
  }

  // Kiểm tra key
  if (!key) {
    console.log("[TRANSLATE] ❌ Lỗi: Không tìm thấy key khả dụng");
    throw new Error("Không tìm thấy key khả dụng.");
  }

  // Retry logic cho lỗi 503
  const maxRetries = 3;
  let lastError = null;
  let currentModel = currentModelAI;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
      const keyDisplay = typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown';
      console.log(`[TRANSLATE] 🔑 Dùng key: ${keyDisplay} (lần thử ${attempt}/${maxRetries})`);
      console.log(`[TRANSLATE] 🤖 Dùng model: ${currentModel}`);
      
    const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: currentModel });

    let prompt;
    if (type === "title") {
        console.log("[TRANSLATE] 📝 Tạo prompt cho tiêu đề");
      prompt = `Dịch chính xác tiêu đề truyện sau sang tiếng Việt, chỉ trả về bản dịch, không thêm bất kỳ chú thích, giải thích, hoặc ký tự nào khác.
      Lưu ý quan trọng: Khi dịch số chương, hãy sử dụng số Ả Rập (1, 2, 3...) thay vì số từ (một, hai, ba...). Ví dụ: "chương 1", "chương 2", "chương 3" thay vì "chương một", "chương hai", "chương ba".
      Tiêu đề: ${text}`;
    } else {
        console.log("[TRANSLATE] 📝 Tạo prompt cho nội dung");
      // Lấy glossary nếu có storyId
      let glossaryText = "";
      if (storyId) {
        try {
          const glossaryItems = await getGlossaryByStoryId(storyId);
          glossaryText = formatGlossaryForAI(glossaryItems);
            console.log(`[TRANSLATE] 📚 Đã tải ${glossaryItems.length} items từ glossary cho truyện ${storyId}`);
        } catch (error) {
            console.error("[TRANSLATE] ⚠️ Lỗi khi tải glossary:", error);
        }
      }

      // Cải thiện prompt để dịch hiệu quả hơn với glossary
    //   const promptContent = `Bạn là "Tên Gọi Chuyên Gia" – một công cụ AI chuyên dịch truyện từ tiếng Trung, Nhật, Hàn hoặc Anh sang tiếng Việt, và chuyển đổi chính xác toàn bộ tên gọi (nhân vật, địa danh, tổ chức, biệt danh, thực thể đặc biệt) theo quy tắc sau:
    //   ---

    //   🎯 MỤC TIÊU
    //   - Dịch toàn bộ văn bản truyện sang tiếng Việt.
    //   - Đồng thời xác định, phân loại và chuyển đổi đúng tên gọi theo quy tắc dưới đây, đảm bảo:
    //     - Dịch tên gọi đúng ngữ cảnh, thể loại
    //     - Giữ nhất quán trong toàn bộ văn bản
    //     - Không giữ nguyên tên nước ngoài một cách tuỳ tiện
    //     - KHÔNG ĐƯỢC BỎ SÓT bất kỳ từ tiếng nước ngoài nào

    //   ---

    //   📘 QUY TẮC CHUYỂN ĐỔI TÊN GỌI

    //   1. Đối tượng bắt buộc xử lý:
    //     - Nhân vật, địa danh, tổ chức, biệt danh, chiêu thức, công pháp, vật phẩm đặc biệt.
    //     - Không xử lý các từ chung (VD: "ma vương", "học viện", "giám đốc" nếu không kèm tên cụ thể).

    //   2. Tính nhất quán:
    //     - Mỗi tên gốc chỉ có một bản dịch duy nhất xuyên suốt văn bản.
    //     - Phát hiện biến thể và hợp nhất về cùng tên (VD: 灰倉真紅 = Haikura Shinku).
    //     - Xử lý tên viết tắt và tên đầy đủ đúng cách (VD: J. Smith = John Smith).

    //   3. Quy tắc chuyển đổi cụ thể:

    //   | Ngôn ngữ | Thể loại | Quy tắc |
    //   |---------|----------|--------|
    //   | Trung | Tiên Hiệp, Huyền Huyễn | Hán Việt, biệt danh dịch nghĩa |
    //   |          | Võng Du, Đô Thị, Khoa Huyễn | Hán Việt cho tên thật, giữ IGN nếu cần |
    //   | Nhật | Light Novel, Võng Du | Romaji chuẩn, biệt danh dịch nghĩa |
    //   | Hàn | Light Novel, Đô Thị | Romanized, biệt danh dịch nghĩa hoặc giữ nguyên nếu phổ biến |
    //   | Anh | Mọi thể loại | Giữ nguyên tên phương Tây, biệt danh dịch nghĩa |
    //   | Đa ngôn ngữ | Tất cả | Ưu tiên dạng phổ biến nhất trong ngữ cảnh |

    //   4. Lỗi và chuẩn hóa:
    //     - Sửa lỗi dính chữ: "HọcviệnOnmyou" → "Học viện Onmyou"
    //     - Chuẩn hóa chính tả: dấu cách, dấu thanh, hoa thường

    //   5. KIỂM TRA BẮT BUỘC:
    //     - Sau khi dịch xong, kiểm tra lại toàn bộ văn bản để đảm bảo KHÔNG CÒN từ tiếng nước ngoài nào chưa được dịch
    //     - Đặc biệt chú ý các ký tự tiếng Trung, Nhật, Hàn còn sót lại

    //   ---

    //   📚 THƯ VIỆN TỪ ĐÃ CÓ (BẮT BUỘC SỬ DỤNG):
    //   ${glossaryText ? glossaryText : "Chưa có thư viện từ nào."}

    //   ---

    //   📤 ĐẦU RA PHẢI LÀ:
    //   - Văn bản dịch hoàn chỉnh tiếng Việt, có áp dụng đúng chuyển đổi tên riêng theo quy tắc trên.
    //   - Không ghi chú tên riêng riêng biệt, không chèn metadata, không chú thích [loại] [ngôn ngữ].
    //   - Tên đã chuyển đổi cần tự nhiên, phù hợp thể loại và bối cảnh, không có các ký tự đặc biệt trước tên, trong tên và sau tên.
    //   - Khoảng cách giữa các tên riêng phải hợp lý, không để lại khoảng trắng ở giữa tên.
    //   - Khoảng cách giữa các tên riêng và từ tiếp theo phải hợp lý, không để lại khoảng trắng ở giữa tên và từ tiếp theo.
    //   - Chỉ sử dụng đại từ nhân xưng "ta" cho nhân vật, "ngươi" cho người đối thoại.

    //   ---

    //   🚫 CẤM (BẮT BUỘC TUÂN THỦ)
    //   - KHÔNG giữ nguyên tên gốc nước ngoài nếu không hợp quy tắc.
    //   - KHÔNG phiên âm sai quy tắc thể loại.
    //   - KHÔNG thêm giải thích, chú thích, hoặc in ra danh sách tên riêng.
    //   - KHÔNG dùng đại từ nhân xưng cho bản thân nhân vật. 
    //   - KHÔNG dịch sai nghĩa, sai chức năng của tên gọi (VD: nhầm chiêu thức là nhân vật).
    //   - KHÔNG ĐƯỢC BỎ SÓT bất kỳ từ tiếng nước ngoài nào trong văn bản.

    //   ---

    //   📥 Bắt đầu dịch đoạn truyện sau sang tiếng Việt:\n\n${text}, áp dụng đúng các quy tắc trên:

    //   ---

    //   Ở CUỐI CÙNG, BẮT BUỘC IN RA PHẦN SAU (KHÔNG ĐƯỢC THIẾU):

    //   THƯ VIỆN TỪ MỚI:
    //   - CHỈ in các dòng theo đúng định dạng: Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
    //   - KHÔNG giải thích, KHÔNG tiêu đề phụ, KHÔNG markdown/code block
    //   - Nếu KHÔNG có tên riêng mới, in CHÍNH XÁC: Không có từ mới
    //   - [Loại] PHẢI thuộc một trong: Nhân vật, Địa danh, Tổ chức, Vật phẩm, Chiêu thức, Công pháp
    //   - [Ngôn ngữ] PHẢI thuộc một trong: Trung, Nhật, Hàn, Anh (KHÔNG được ghi "Tiếng Việt")
    //   - KHÔNG dùng ngoặc vuông trong tên; KHÔNG thêm ký tự lạ quanh tên

    //   Nếu có tên riêng mới phát hiện, hãy liệt kê theo format:
    //   Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
      
    //   QUY TẮC LIỆT KÊ CHÍNH XÁC:
    //   1. CHỈ liệt kê các DANH TỪ RIÊNG (Proper Nouns):
    //      - Tên người: 张伟, 李美, Haikura Shinku
    //      - Tên địa danh: 北京, 东京, Seoul
    //      - Tên tổ chức: 清华大学, 东京大学
    //      - Tên vật phẩm đặc biệt: 轩辕剑, 屠龙刀
    //      - Tên chiêu thức: 降龙十八掌, 九阴真经
    //      - Tên công pháp: 易筋经, 洗髓经
      
    //   2. KHÔNG liệt kê:
    //      - Các từ chung: "ma vương", "học viện", "giám đốc" (trừ khi có tên cụ thể)
    //      - Các câu hoặc cụm từ dài: "第一章 距离末日还有180天" (đây là tên chương, không phải danh từ riêng)
    //      - Tên tiếng Việt: "Lý Vũ", "Trần Minh"
    //      - Tên đã có trong THƯ VIỆN TỪ ĐÃ CÓ ở trên
      
    //   3. CHỈ liệt kê những tên có gốc tiếng nước ngoài (Trung, Nhật, Hàn, Anh)
      
    //   4. MỖI TỪ RIÊNG PHẢI LÀ MỘT ĐƠN VỊ ĐỘC LẬP:
    //      - ĐÚNG: 张伟 = Trương Vĩ [Nhân vật] [Trung]
    //      - SAI: 张伟李美 = Trương Vĩ Lý Mỹ [Nhân vật] [Trung] (phải tách thành 2 từ)
      
    //   Ví dụ ĐÚNG:
    //   张伟 = Trương Vĩ [Nhân vật] [Trung]
    //   李美 = Lý Mỹ [Nhân vật] [Trung]
    //   M都 = M Đô [Địa danh] [Trung]
    //   Haikura Shinku = Haikura Shinku [Nhân vật] [Nhật]
    //   轩辕剑 = Hiên Viên Kiếm [Vật phẩm] [Trung]
      
    //   Ví dụ SAI (không được liệt kê):
    //   "第一章 距离末日还有180天" (tên chương dài)
    //   "ma vương" (từ chung)
    //   "Lý Vũ" (tên tiếng Việt)
      
    //   ⚠️ QUAN TRỌNG: Nếu không có tên riêng mới nào, PHẢI ghi "Không có từ mới"
    // `; //Cái này là cái cũ
    const promptContent = `Bạn là "Tên Gọi Chuyên Gia" – một công cụ AI chuyên dịch truyện từ tiếng Trung, Nhật, Hàn hoặc Anh sang tiếng Việt, và chuyển đổi chính xác toàn bộ tên gọi (nhân vật, địa danh, tổ chức, biệt danh, thực thể đặc biệt) theo quy tắc sau:
---

🎯 MỤC TIÊU
- Dịch toàn bộ văn bản truyện sang tiếng Việt.
- Đồng thời xác định, phân loại và chuyển đổi đúng tên gọi theo quy tắc dưới đây, đảm bảo:
  - Dịch tên gọi đúng ngữ cảnh, thể loại
  - Giữ nhất quán trong toàn bộ văn bản
  - Không giữ nguyên tên nước ngoài một cách tuỳ tiện
  - KHÔNG ĐƯỢC BỎ SÓT bất kỳ từ tiếng nước ngoài nào
- **Sau khi dịch, BẮT BUỘC tạo danh sách "THƯ VIỆN TỪ MỚI" nếu phát hiện bất kỳ danh từ riêng mới nào, nếu không có thì ghi "Không có từ mới".**

---

📘 QUY TẮC CHUYỂN ĐỔI TÊN GỌI
1. Đối tượng bắt buộc xử lý:
  - Nhân vật, địa danh, tổ chức, biệt danh, chiêu thức, công pháp, vật phẩm đặc biệt.
  - Không xử lý các từ chung (VD: "ma vương", "học viện", "giám đốc" nếu không kèm tên cụ thể).

2. Tính nhất quán:
  - Mỗi tên gốc chỉ có một bản dịch duy nhất xuyên suốt văn bản.
  - Phát hiện biến thể và hợp nhất về cùng tên (VD: 灰倉真紅 = Haikura Shinku).
  - Xử lý tên viết tắt và tên đầy đủ đúng cách (VD: J. Smith = John Smith).

3. Quy tắc chuyển đổi cụ thể:

| Ngôn ngữ | Thể loại | Quy tắc |
|---------|----------|--------|
| Trung | Tiên Hiệp, Huyền Huyễn | Hán Việt, biệt danh dịch nghĩa |
|        | Võng Du, Đô Thị, Khoa Huyễn | Hán Việt cho tên thật, giữ IGN nếu cần |
| Nhật | Light Novel, Võng Du | Romaji chuẩn, biệt danh dịch nghĩa |
| Hàn | Light Novel, Đô Thị | Romanized, biệt danh dịch nghĩa hoặc giữ nguyên nếu phổ biến |
| Anh | Mọi thể loại | Giữ nguyên tên phương Tây, biệt danh dịch nghĩa |
| Đa ngôn ngữ | Tất cả | Ưu tiên dạng phổ biến nhất trong ngữ cảnh |

4. Lỗi và chuẩn hóa:
  - Sửa lỗi dính chữ: "HọcviệnOnmyou" → "Học viện Onmyou"
  - Chuẩn hóa chính tả: dấu cách, dấu thanh, hoa thường

5. KIỂM TRA BẮT BUỘC:
  - Sau khi dịch xong, kiểm tra lại toàn bộ văn bản để đảm bảo KHÔNG CÒN từ tiếng nước ngoài nào chưa được dịch
  - Đặc biệt chú ý các ký tự tiếng Trung, Nhật, Hàn còn sót lại
  - **Luôn rà soát để tìm tên riêng mới cho THƯ VIỆN TỪ MỚI**

---

📚 THƯ VIỆN TỪ ĐÃ CÓ (BẮT BUỘC SỬ DỤNG):
${glossaryText ? glossaryText : "Chưa có thư viện từ nào."}

---

📤 ĐẦU RA PHẢI LÀ:
1. Văn bản dịch hoàn chỉnh tiếng Việt, áp dụng đúng chuyển đổi tên riêng theo quy tắc trên.
2. **Sau văn bản dịch, luôn in "THƯ VIỆN TỪ MỚI" theo format chuẩn.**
3. Format THƯ VIỆN TỪ MỚI:
  - Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
  - Nếu không có, in chính xác: Không có từ mới
  - [Loại] ∈ {Nhân vật, Địa danh, Tổ chức, Vật phẩm, Chiêu thức, Công pháp}
  - [Ngôn ngữ] ∈ {Trung, Nhật, Hàn, Anh}
  - Nếu không chắc chắn về [Loại] hoặc [Ngôn ngữ], hãy chọn khả năng hợp lý nhất.

---

📥 Dịch đoạn truyện sau sang tiếng Việt, áp dụng đầy đủ quy tắc và yêu cầu trên:
${text}

---
THƯ VIỆN TỪ MỚI:
- CHỈ liệt kê danh từ riêng gốc ngoại ngữ, mỗi tên là một đơn vị độc lập.
- Không liệt kê từ chung, tên tiếng Việt, tên đã có trong thư viện.
- Nếu không phát hiện tên mới, ghi "Không có từ mới".
`;

      prompt = promptContent;
    }

    console.log("📝 [TRANSLATE] Prompt gửi đi:", prompt.substring(0, 100) + "...");

    console.log("[TRANSLATE] 🔄 Gọi API Gemini...");
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    let translated = response.text();
    const duration = parseFloat(((Date.now() - startTime) / 1000).toFixed(2)); // Chuyển thành number

    console.log("📤 [TRANSLATE] Response từ API:", translated.substring(0, 100) + "...");
    console.log("📏 [TRANSLATE] Độ dài text gốc:", text.length);
    console.log("📏 [TRANSLATE] Độ dài text dịch:", translated.length);
    console.log("⏱️ [TRANSLATE] Thời gian dịch:", duration + "s");
    console.log("📚 [TRANSLATE] Response từ API:", translated);
    const isUnchanged = translated.trim() === text.trim();

    if (isUnchanged) {
      const keyDisplay = typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown';
      console.warn(
        `⚠️ [TRANSLATE] Bản dịch không thay đổi cho key ${keyDisplay}`
      );
      console.warn("🔍 [TRANSLATE] Text gốc:", text.substring(0, 100));
      console.warn("🔍 [TRANSLATE] Text dịch:", translated.substring(0, 100));
    }

    // Cập nhật thống kê sử dụng key nếu có usageId
    if (response.usageMetadata && usageId) {
      console.log("[TRANSLATE] 📊 Cập nhật thống kê sử dụng key...");
      const apiKeyManager = new ApiKeyManager();
      await apiKeyManager.updateUsageStats(
        usageId,
        response.usageMetadata,
        isUserKey
      );
    }

    // Lưu glossary nếu có storyId và không phải dịch title
    if (storyId && type !== "title") {
      try {
        console.log("[TRANSLATE] 📚 Xử lý glossary...");
        // Tìm và trích xuất glossary từ response (hỗ trợ có/không emoji, CRLF)
        const glossaryMatch = translated.match(/(?:📚\s*)?THƯ VIỆN TỪ MỚI:\s*[\r\n]+([\s\S]*?)(?=(?:\r?\n)---|$)/i);
        if (glossaryMatch) {
          const glossaryText = glossaryMatch[1].trim();
          const glossaryLines = glossaryText.split('\n').filter(l => l.trim());
          console.log(`[TRANSLATE] 🔎 Glossary block được phát hiện: ${glossaryLines.length} dòng`);
          console.log(`[TRANSLATE] 🧩 Glossary preview:`, glossaryLines.slice(0, 5));
          
          // Kiểm tra xem có từ mới thực sự không (không phải "Không có từ mới")
          if (glossaryText && glossaryText !== "Không có từ mới" && !glossaryText.includes("Không có từ mới")) {
            await extractAndSaveGlossary(storyId, glossaryText);
            console.log(`[TRANSLATE] 📚 Đã lưu ${glossaryText.split('\n').filter(line => line.trim() && line.includes('=')).length} từ mới vào glossary`);
          } else {
            console.log("[TRANSLATE] 📚 Không có từ mới để lưu vào glossary");
          }
          
          // Loại bỏ phần glossary khỏi text dịch cuối cùng (hỗ trợ có/không emoji, CRLF)
          translated = translated.replace(/(?:📚\s*)?THƯ VIỆN TỪ MỚI:\s*[\r\n]+[\s\S]*?(?=(?:\r?\n)---|$)/i, '').trim();
          console.log('[TRANSLATE] 🧼 Đã loại bỏ block THƯ VIỆN TỪ MỚI khỏi nội dung dịch trả về');
        } else {
          console.warn("[TRANSLATE] ⚠️ Không tìm thấy phần 'THƯ VIỆN TỪ MỚI' trong response");
          const hasKeyword = /THƯ VIỆN TỪ MỚI/i.test(translated);
          const hasEmoji = /📚/.test(translated);
          console.log(`[TRANSLATE] 🔍 Chẩn đoán: hasKeyword=${hasKeyword}, hasEmoji=${hasEmoji}, length=${translated.length}`);
          console.log('[TRANSLATE] 🔍 200 ký tự đầu của response:', translated.substring(0, 200).replace(/\n/g, ' \\n '));

          // Fallback: thử trích các dòng glossary theo format dù không có header
          try {
            // Loại bỏ code fences nếu có
            const cleanedForScan = translated.replace(/```[\s\S]*?```/g, '');
            const lineRegex = /^\s*(.+?)\s*=\s*(.+?)\s*\[(.+?)\]\s*\[(.+?)\]\s*$/gim;
            const matches = [];
            let m;
            while ((m = lineRegex.exec(cleanedForScan)) !== null) {
              const line = `${m[1].trim()} = ${m[2].trim()} [${m[3].trim()}] [${m[4].trim()}]`;
              matches.push(line);
            }
            console.log(`[TRANSLATE] 🔎 Fallback scan tìm thấy ${matches.length} dòng glossary dạng "a = b [type] [lang]"`);
            if (matches.length > 0) {
              const glossaryText = matches.join('\n');
              await extractAndSaveGlossary(storyId, glossaryText);
              console.log(`[TRANSLATE] 📚 Fallback đã lưu ${matches.length} dòng glossary`);
              // Loại bỏ các dòng đã match khỏi nội dung dịch để tránh lẫn vào bản dịch
              matches.forEach(line => {
                const esc = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                translated = translated.replace(new RegExp(`^.*${esc}.*$`, 'gim'), '').trim();
              });
            }
          } catch (fallbackErr) {
            console.error('[TRANSLATE] ⚠️ Lỗi fallback scan glossary:', fallbackErr);
          }
        }
      } catch (error) {
        console.error("[TRANSLATE] ⚠️ Lỗi khi lưu glossary:", error);
      }
    }

    console.log(
      `✅ [TRANSLATE] Dịch thành công sau ${duration}s với key ${typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown'}`
    );

    // Đảm bảo luôn trả về đúng format
    const resultObj = {
      translated: translated || text, // Fallback về text gốc nếu translated rỗng
      usage: response.usageMetadata || null,
      isUnchanged: isUnchanged,
      duration: duration, // Thêm duration vào result
      hasError: false,
      error: null
    };

    console.log("📋 [TRANSLATE] Kết quả trả về:", {
      hasTranslated: !!resultObj.translated,
      translatedLength: resultObj.translated?.length || 0,
      isUnchanged: resultObj.isUnchanged,
      duration: resultObj.duration,
      translatedPreview: resultObj.translated?.substring(0, 50) + "...",
    });

    console.log("🔤 [TRANSLATE] ===== HOÀN THÀNH DỊCH =====");
    return resultObj;
  } catch (error) {
    lastError = error;
    console.log(`❌ [TRANSLATE] ===== LỖI DỊCH (LẦN ${attempt}/${maxRetries}) =====`);
    
    // Sử dụng ErrorHandlerService để phân tích lỗi
    const errorInfo = errorHandler.logError(error, {
      model: currentModelAI,
      key: typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown',
      type: type,
      storyId: storyId,
      textLength: text?.length || 0
    });

    console.error("⚠️ [TRANSLATE] Lỗi dịch chi tiết:", errorHandler.createDeveloperMessage(errorInfo));

    // Nếu là lỗi 503 và còn retry, thử lại
    if (errorInfo.code === '503' && attempt < maxRetries) {
      const delay = attempt * 2000; // Tăng delay theo số lần retry
      console.log(`⏳ [TRANSLATE] Chờ ${delay}ms trước khi thử lại lần ${attempt + 1}...`);
      
      // Thử fallback model nếu đang dùng gemini-2.0-flash-lite
      if (currentModel === 'gemini-2.0-flash-lite' && attempt === 2) {
        currentModel = 'gemini-1.5-flash';
        console.log(`🔄 [TRANSLATE] Chuyển sang fallback model: ${currentModel}`);
      } else if (currentModel === 'gemini-1.5-flash' && attempt === 3) {
        currentModel = 'gemini-1.5-pro';
        console.log(`🔄 [TRANSLATE] Chuyển sang fallback model cuối: ${currentModel}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    // Nếu hết retry hoặc không phải lỗi 503, trả về lỗi
    console.log("🔄 [TRANSLATE] Trả về thông tin lỗi do dịch thất bại");
    return {
      translated: null, // Không có bản dịch
      usage: null,
      isUnchanged: false, // Không phải không thay đổi mà là lỗi
      error: errorInfo.userMessage, // Thông báo lỗi thân thiện với user
      errorDetails: errorHandler.createDeveloperMessage(errorInfo), // Chi tiết lỗi cho developer
      hasError: true, // Flag để controller biết có lỗi
      retryable: errorInfo.retryable, // Có thể retry hay không
      errorType: errorInfo.type, // Loại lỗi
      solution: errorInfo.solution, // Giải pháp cho user
      duration: 0 // Thời gian dịch = 0 vì lỗi
    };
  }
  }

  // Nếu hết tất cả retry, trả về lỗi cuối cùng
  console.log("🔄 [TRANSLATE] Hết tất cả retry, trả về lỗi cuối cùng");
  const finalErrorInfo = errorHandler.logError(lastError, {
    model: currentModelAI,
    key: typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown',
    type: type,
    storyId: storyId,
    textLength: text?.length || 0
  });

  return {
    translated: null,
    usage: null,
    isUnchanged: false,
    error: finalErrorInfo.userMessage,
    errorDetails: errorHandler.createDeveloperMessage(finalErrorInfo),
    hasError: true,
    retryable: false, // Hết retry rồi
    errorType: finalErrorInfo.type,
    solution: finalErrorInfo.solution,
    duration: 0 // Thời gian dịch = 0 vì lỗi
  };
};

module.exports = {
  translateText,
};
