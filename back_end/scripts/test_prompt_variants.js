/**
 * Script thử nghiệm các biến thể prompt để kiểm tra khả năng sinh "THƯ VIỆN TỪ MỚI"
 * Cách chạy (PowerShell/Windows):
 *   cd back_end
 *   $env:GEMINI_API_KEY="<YOUR_KEY>"; node scripts/test_prompt_variants.js
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const key_tam='AIzaSyDf_nWzPG9-ibLH-w4CQV60l-VPmy0v8V4'
const API_KEY = process.env.GEMINI_API_KEY|| key_tam;
const MODEL = process.env.TEST_MODEL || 'gemini-2.0-flash-lite';

if (!API_KEY) {
  console.error('❌ Thiếu GEMINI_API_KEY trong environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL });

// Test cases khác nhau để debug
const testCases = [
  {
    name: 'CASE1-Đơn giản',
    desc: 'Chỉ có tên Trung đơn giản',
    text: `张伟 là nhân vật chính trong truyện.`
  },
  {
    name: 'CASE2-Nhiều tên',
    desc: 'Nhiều tên riêng đa ngôn ngữ',
    text: `张伟 ở M都, học với Haikura Shinku và John Smith.`
  },
  {
    name: 'CASE3-Tên địa danh',
    desc: 'Tên địa danh và tổ chức',
    text: `Trường Đại học Bắc Kinh và tổ chức Black Lotus.`
  },
  {
    name: 'CASE4-Tên tiếng Việt',
    desc: 'Chỉ có tên tiếng Việt (không nên sinh glossary)',
    text: `Lý Vũ và Trần Minh đi đến Hà Nội.`
  },
  {
    name: 'CASE5-Hỗn hợp',
    desc: 'Hỗn hợp tên nước ngoài và tiếng Việt',
    text: `张伟 gặp Lý Vũ ở Tokyo, sau đó đến Seoul với John Smith.`
  }
];

const variantPrompts = [
  {
    name: 'V1-Đơn giản',
    desc: 'Prompt đơn giản, yêu cầu rõ ràng',
    prompt: (text) => `Dịch đoạn sau sang tiếng Việt:

${text}

Sau khi dịch xong, ở CUỐI CÙNG phải in ra:

THƯ VIỆN TỪ MỚI:
- Nếu có tên riêng nước ngoài mới: Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
- Nếu không có: Không có từ mới

Lưu ý: Chỉ liệt kê tên có gốc nước ngoài (Trung, Nhật, Hàn, Anh), không liệt kê tên tiếng Việt.`
  },
  {
    name: 'V2-Bắt buộc',
    desc: 'Prompt bắt buộc phải có section',
    prompt: (text) => `BẠN LÀ CÔNG CỤ DỊCH TRUYỆN.

YÊU CẦU:
1. Dịch đoạn văn sang tiếng Việt
2. BẮT BUỘC phải có phần "THƯ VIỆN TỪ MỚI" ở cuối

ĐOẠN VĂN:
${text}

ĐẦU RA:
[Bản dịch tiếng Việt]

THƯ VIỆN TỪ MỚI:
[Liệt kê tên riêng nước ngoài theo format: Tên gốc = Tên dịch [Loại] [Ngôn ngữ]]
[Nếu không có: Không có từ mới]`
  },
  {
    name: 'V3-Chỉ trích xuất',
    desc: 'Không dịch, chỉ trích xuất tên riêng',
    prompt: (text) => `CHỈ TRÍCH XUẤT tên riêng nước ngoài từ đoạn văn sau.

YÊU CẦU:
- Chỉ in danh sách tên riêng
- Format: Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
- Nếu không có tên nước ngoài: in "Không có từ mới"
- KHÔNG dịch, KHÔNG giải thích

ĐOẠN VĂN:
${text}

DANH SÁCH TÊN RIÊNG:`
  },
  {
    name: 'V4-Prompt hiện tại',
    desc: 'Sử dụng prompt hiện tại trong code',
    prompt: (text) => `Bạn là "Tên Gọi Chuyên Gia" – một công cụ AI chuyên dịch truyện từ tiếng Trung, Nhật, Hàn hoặc Anh sang tiếng Việt, và chuyển đổi chính xác toàn bộ tên gọi (nhân vật, địa danh, tổ chức, biệt danh, thực thể đặc biệt) theo quy tắc sau:

🎯 MỤC TIÊU
- Dịch toàn bộ văn bản truyện sang tiếng Việt.
- Đồng thời xác định, phân loại và chuyển đổi đúng tên gọi theo quy tắc dưới đây, đảm bảo:
  - Dịch tên gọi đúng ngữ cảnh, thể loại
  - Giữ nhất quán trong toàn bộ văn bản
  - Không giữ nguyên tên nước ngoài một cách tuỳ tiện
  - KHÔNG ĐƯỢC BỎ SÓT bất kỳ từ tiếng nước ngoài nào
- **Sau khi dịch, BẮT BUỘC tạo danh sách "THƯ VIỆN TỪ MỚI" nếu phát hiện bất kỳ danh từ riêng mới nào, nếu không có thì ghi "Không có từ mới".**

📤 ĐẦU RA PHẢI LÀ:
1. Văn bản dịch hoàn chỉnh tiếng Việt, áp dụng đúng chuyển đổi tên riêng theo quy tắc trên.
2. **Sau văn bản dịch, luôn in "THƯ VIỆN TỪ MỚI" theo format chuẩn.**
3. Format THƯ VIỆN TỪ MỚI:
   - Tên gốc = Tên dịch [Loại] [Ngôn ngữ]
   - Nếu không có, in chính xác: Không có từ mới
   - [Loại] ∈ {Nhân vật, Địa danh, Tổ chức, Vật phẩm, Chiêu thức, Công pháp}
   - [Ngôn ngữ] ∈ {Trung, Nhật, Hàn, Anh}

📥 Dịch đoạn truyện sau sang tiếng Việt, áp dụng đầy đủ quy tắc và yêu cầu trên:
${text}

---
THƯ VIỆN TỪ MỚI:
- CHỈ liệt kê danh từ riêng gốc ngoại ngữ, mỗi tên là một đơn vị độc lập.
- Không liệt kê từ chung, tên tiếng Việt, tên đã có trong thư viện.
- Nếu không phát hiện tên mới, ghi "Không có từ mới".`
  }
];

function analyze(text) {
  console.log('\n🔍 PHÂN TÍCH CHI TIẾT:');
  console.log('📏 Độ dài response:', text.length);
  
  // Kiểm tra có header không
  const hasHeader = /THƯ VIỆN TỪ MỚI/i.test(text) || /📚/.test(text);
  console.log('📋 Có header "THƯ VIỆN TỪ MỚI":', hasHeader);
  
  // Kiểm tra có "Không có từ mới" không
  const hasNoWords = /không có từ mới/i.test(text);
  console.log('❌ Có "Không có từ mới":', hasNoWords);
  
  // Tìm các dòng có format glossary
  const lines = text.split(/\r?\n/);
  const valid = [];
  const pat = /^(.+?)\s*=\s*(.+?)\s*\[(.+?)\]\s*\[(.+?)\]$/;
  
  console.log('\n📝 Các dòng có format glossary:');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(pat);
    if (m) {
      valid.push(line);
      console.log(`  ✅ Dòng ${i+1}: "${line}"`);
    } else if (line.includes('=') && line.includes('[')) {
      console.log(`  ⚠️ Dòng ${i+1} có = và [ nhưng không match: "${line}"`);
    }
  }
  
  // Tìm các từ nước ngoài trong text gốc
  const foreignWords = [];
  const chineseRegex = /[\u4e00-\u9fff]+/g;
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]+/g;
  const koreanRegex = /[\uac00-\ud7af]+/g;
  const englishRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  
  return { 
    hasHeader, 
    hasNoWords,
    validCount: valid.length, 
    validPreview: valid.slice(0, 10),
    foreignWords
  };
}

async function run() {
  console.log('=== TEST PROMPT VARIANTS - DEBUG MODE ===');
  console.log('Model:', MODEL);
  console.log('API Key:', API_KEY.substring(0, 8) + '...');
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST CASE: ${testCase.name}`);
    console.log(`📄 Mô tả: ${testCase.desc}`);
    console.log(`📝 Text gốc: "${testCase.text}"`);
    
    // Phân tích text gốc
    const chineseWords = testCase.text.match(/[\u4e00-\u9fff]+/g) || [];
    const japaneseWords = testCase.text.match(/[\u3040-\u309f\u30a0-\u30ff]+/g) || [];
    const koreanWords = testCase.text.match(/[\uac00-\ud7af]+/g) || [];
    const englishWords = testCase.text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
    
    console.log('\n🔍 TỪ NƯỚC NGOÀI TRONG TEXT GỐC:');
    console.log('  🇨🇳 Tiếng Trung:', chineseWords);
    console.log('  🇯🇵 Tiếng Nhật:', japaneseWords);
    console.log('  🇰🇷 Tiếng Hàn:', koreanWords);
    console.log('  🇺🇸 Tiếng Anh:', englishWords);
    
    for (const variant of variantPrompts) {
      console.log(`\n${'-'.repeat(50)}`);
      console.log(`🔄 ${variant.name}: ${variant.desc}`);
      
      try {
        const start = Date.now();
        const result = await model.generateContent(variant.prompt(testCase.text));
        const out = await result.response.text();
        const ms = Date.now() - start;
        
        console.log(`⏱️ Thời gian: ${ms}ms`);
        console.log(`📤 Response (${out.length} ký tự):`);
        console.log('─'.repeat(40));
        console.log(out);
        console.log('─'.repeat(40));
        
        const info = analyze(out);
        console.log(`\n📊 KẾT QUẢ: hasHeader=${info.hasHeader}, hasNoWords=${info.hasNoWords}, validCount=${info.validCount}`);
        
        if (info.validCount > 0) {
          console.log('✅ Tìm thấy glossary items:', info.validPreview);
        } else if (info.hasNoWords) {
          console.log('❌ Model báo "Không có từ mới"');
        } else {
          console.log('⚠️ Không tìm thấy glossary format');
        }
        
      } catch (error) {
        console.error(`❌ Lỗi với ${variant.name}:`, error.message);
      }
      
      // Delay giữa các request
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

run().catch(err => {
  console.error('❌ Lỗi khi chạy test variants:', err);
  process.exit(1);
});


