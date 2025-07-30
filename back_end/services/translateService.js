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

  const currentModelAI = modelAI || DEFAULT_MODEL;

  if (!text) {
    console.log("[TRANSLATE] ❌ Lỗi: Thiếu nội dung cần dịch");
    throw new Error("Thiếu nội dung cần dịch.");
  }

  // Kiểm tra key
  if (!key) {
    console.log("[TRANSLATE] ❌ Lỗi: Không tìm thấy key khả dụng");
    throw new Error("Không tìm thấy key khả dụng.");
  }

  try {
    const keyDisplay = typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown';
    console.log(`[TRANSLATE] 🔑 Dùng key: ${keyDisplay}`);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: currentModelAI });

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
      const promptContent = `Bạn là "Tên Gọi Chuyên Gia" – một công cụ AI chuyên dịch truyện từ tiếng Trung, Nhật, Hàn hoặc Anh sang tiếng Việt, và chuyển đổi chính xác toàn bộ tên gọi (nhân vật, địa danh, tổ chức, biệt danh, thực thể đặc biệt) theo quy tắc sau:
      ---

      🎯 MỤC TIÊU
      - Dịch toàn bộ văn bản truyện sang tiếng Việt.
      - Đồng thời xác định, phân loại và chuyển đổi đúng tên gọi theo quy tắc dưới đây, đảm bảo:
        - Dịch tên gọi đúng ngữ cảnh, thể loại
        - Giữ nhất quán trong toàn bộ văn bản
        - Không giữ nguyên tên nước ngoài một cách tuỳ tiện
        - KHÔNG ĐƯỢC BỎ SÓT bất kỳ từ tiếng nước ngoài nào

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
      |          | Võng Du, Đô Thị, Khoa Huyễn | Hán Việt cho tên thật, giữ IGN nếu cần |
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

      ---

      📚 THƯ VIỆN TỪ ĐÃ CÓ (BẮT BUỘC SỬ DỤNG):
      ${glossaryText ? glossaryText : "Chưa có thư viện từ nào."}

      ---

      📤 ĐẦU RA PHẢI LÀ:
      - Văn bản dịch hoàn chỉnh tiếng Việt, có áp dụng đúng chuyển đổi tên riêng theo quy tắc trên.
      - Không ghi chú tên riêng riêng biệt, không chèn metadata, không chú thích [loại] [ngôn ngữ].
      - Tên đã chuyển đổi cần tự nhiên, phù hợp thể loại và bối cảnh, không có các ký tự đặc biệt trước tên, trong tên và sau tên.
      - Khoảng cách giữa các tên riêng phải hợp lý, không để lại khoảng trắng ở giữa tên.
      - Khoảng cách giữa các tên riêng và từ tiếp theo phải hợp lý, không để lại khoảng trắng ở giữa tên và từ tiếp theo.
      - Chỉ sử dụng đại từ nhân xưng "ta" cho nhân vật, "ngươi" cho người đối thoại.

      ---

      🚫 CẤM (BẮT BUỘC TUÂN THỦ)
      - KHÔNG giữ nguyên tên gốc nước ngoài nếu không hợp quy tắc.
      - KHÔNG phiên âm sai quy tắc thể loại.
      - KHÔNG thêm giải thích, chú thích, hoặc in ra danh sách tên riêng.
      - KHÔNG dùng đại từ nhân xưng cho bản thân nhân vật. 
      - KHÔNG dịch sai nghĩa, sai chức năng của tên gọi (VD: nhầm chiêu thức là nhân vật).
      - KHÔNG ĐƯỢC BỎ SÓT bất kỳ từ tiếng nước ngoài nào trong văn bản.

      ---

      📥 Bắt đầu dịch đoạn truyện sau sang tiếng Việt:\n\n${text}, áp dụng đúng các quy tắc trên:

      ---

      📚 THƯ VIỆN TỪ MỚI:
      ⚠️ LƯU Ý: Phần "THƯ VIỆN TỪ MỚI" này chỉ dùng để tạo thư viện từ mới, KHÔNG được xuất ra file cuối cùng.
      
      BẮT BUỘC: Sau khi dịch xong, PHẢI luôn có phần này, phần này nằm sau cùng của nội dung dịch, ngay cả khi không có từ mới.
      
      Nếu có tên riêng mới phát hiện trong đoạn văn này, hãy liệt kê theo format:
      Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
      
      Nếu KHÔNG có tên riêng mới nào, hãy ghi: "Không có từ mới"
      
      QUY TẮC LIỆT KÊ:
      1. Chỉ liệt kê các DANH TỪ RIÊNG: Nhân vật, địa danh, tổ chức, biệt danh, chiêu thức, công pháp, vật phẩm đặc biệt
      2. KHÔNG liệt kê các từ chung như "ma vương", "học viện", "giám đốc" (trừ khi có tên cụ thể)
      3. Chỉ liệt kê những tên có gốc tiếng nước ngoài (Trung, Nhật, Hàn, Anh), KHÔNG liệt kê tên tiếng Việt
      4. KHÔNG liệt kê những tên đã có trong THƯ VIỆN TỪ ĐÃ CÓ ở trên
      
      Ví dụ:
      张伟 = Trương Vĩ [Nhân vật] [Trung]
      M都 = M Đô [Địa danh] [Trung]
      Haikura Shinku = Haikura Shinku [Nhân vật] [Nhật]
      
      ⚠️ QUAN TRỌNG: Nếu không có tên riêng mới nào, PHẢI ghi "Không có từ mới"
    `;
      prompt = promptContent;
    }

    console.log("📝 [TRANSLATE] Prompt gửi đi:", prompt.substring(0, 100) + "...");

    console.log("[TRANSLATE] 🔄 Gọi API Gemini...");
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translated = response.text();
    const duration = parseFloat(((Date.now() - startTime) / 1000).toFixed(2)); // Chuyển thành number

    console.log("📤 [TRANSLATE] Response từ API:", translated.substring(0, 100) + "...");
    console.log("📏 [TRANSLATE] Độ dài text gốc:", text.length);
    console.log("📏 [TRANSLATE] Độ dài text dịch:", translated.length);
    console.log("⏱️ [TRANSLATE] Thời gian dịch:", duration + "s");

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
        // Tìm và trích xuất glossary từ response
        const glossaryMatch = translated.match(/📚 THƯ VIỆN TỪ MỚI:\n([\s\S]*?)(?=\n---|$)/);
        if (glossaryMatch) {
          const glossaryText = glossaryMatch[1].trim();
          
          // Kiểm tra xem có từ mới thực sự không (không phải "Không có từ mới")
          if (glossaryText && glossaryText !== "Không có từ mới" && !glossaryText.includes("Không có từ mới")) {
            await extractAndSaveGlossary(storyId, glossaryText);
            console.log(`[TRANSLATE] 📚 Đã lưu ${glossaryText.split('\n').filter(line => line.trim() && line.includes('=')).length} từ mới vào glossary`);
          } else {
            console.log("[TRANSLATE] 📚 Không có từ mới để lưu vào glossary");
          }
          
          // Loại bỏ phần glossary khỏi text dịch cuối cùng
          translated = translated.replace(/📚 THƯ VIỆN TỪ MỚI:\n[\s\S]*?(?=\n---|$)/, '').trim();
        } else {
          console.warn("[TRANSLATE] ⚠️ Không tìm thấy phần '📚 THƯ VIỆN TỪ MỚI:' trong response");
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
    console.log("❌ [TRANSLATE] ===== LỖI DỊCH =====");
    // Sử dụng ErrorHandlerService để phân tích lỗi
    const errorInfo = errorHandler.logError(error, {
      model: currentModelAI,
      key: typeof key === 'string' ? key.substring(0, 8) + '...' : 'unknown',
      type: type,
      storyId: storyId,
      textLength: text?.length || 0
    });

    console.error("⚠️ [TRANSLATE] Lỗi dịch chi tiết:", errorHandler.createDeveloperMessage(errorInfo));

    // Trả về thông tin lỗi rõ ràng thay vì giả vờ thành công
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
      solution: errorInfo.solution // Giải pháp cho user
    };
  }
};

module.exports = {
  translateText,
};
