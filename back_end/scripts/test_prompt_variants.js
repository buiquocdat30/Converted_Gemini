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

// Văn bản test có đủ tên riêng đa ngôn ngữ
const testText = `张伟 ở M都, học Học viện Onmyou với Haikura Shinku và John Smith.
Sau đó, anh sáng lập tổ chức Black Lotus, phát triển chiêu thức Heavenly Dragon Fist.
Trận chiến ở Tokyo, Haikura Shinku dùng kỹ thuật Kage Bunshin no Jutsu.
Nhân vật khác: Lee Min Ho; tổ chức White Tiger.`;

const variantPrompts = [
  {
    name: 'V1-current-like',
    desc: 'Gần giống prompt hiện tại, yêu cầu phần THƯ VIỆN TỪ MỚI ở cuối',
    prompt: `Bạn là "Tên Gọi Chuyên Gia" – hãy dịch đoạn sau sang tiếng Việt, và ở CUỐI CÙNG in ra phần:\n\n📚 THƯ VIỆN TỪ MỚI:\n(Chỉ các dòng theo định dạng: Tên gốc = Tên dịch [Loại] [Ngôn ngữ])\nNếu không có, in đúng: Không có từ mới\n\nĐoạn văn:\n${testText}`
  },
  {
    name: 'V2-hard-require',
    desc: 'Bắt buộc luôn có section THƯ VIỆN TỪ MỚI, nêu rõ định dạng',
    prompt: `Dịch đoạn sau sang tiếng Việt. Ở CUỐI CÙNG, BẮT BUỘC phải in ra:\n\nTHƯ VIỆN TỪ MỚI:\nChỉ các dòng đúng định dạng: Original = Translated [Loại] [Ngôn ngữ]\nKhông giải thích, không tiêu đề khác, không markdown.\nNếu không có danh từ riêng, in đúng: Không có từ mới\n\nĐoạn văn:\n${testText}`
  },
  {
    name: 'V3-extract-only',
    desc: 'Không dịch, chỉ trích xuất danh từ riêng theo format yêu cầu',
    prompt: `Chỉ trích xuất danh từ riêng có trong đoạn sau. CHỈ in danh sách, mỗi dòng:\nOriginal = Translated [Loại] [Ngôn ngữ]\nNếu không có, in: Không có từ mới\n\nĐoạn văn:\n${testText}`
  }
];

function analyze(text) {
  const hasHeader = /THƯ VIỆN TỪ MỚI/i.test(text) || /📚/.test(text);
  const lines = text.split(/\r?\n/);
  const valid = [];
  const pat = /^(.+?)\s*=\s*(.+?)\s*\[(.+?)\]\s*\[(.+?)\]$/;
  for (const line of lines) {
    const m = line.trim().match(pat);
    if (m) valid.push(line.trim());
  }
  return { hasHeader, validCount: valid.length, validPreview: valid.slice(0, 10) };
}

async function run() {
  console.log('=== TEST PROMPT VARIANTS ===');
  console.log('Model:', MODEL);
  for (const v of variantPrompts) {
    console.log(`\n--- ${v.name}: ${v.desc} ---`);
    const start = Date.now();
    const result = await model.generateContent(v.prompt);
    const out = result.response.text();
    const ms = Date.now() - start;
    const info = analyze(out);
    console.log('⏱️ Thời gian(ms):', ms);
    console.log('hasHeader:', info.hasHeader, '| validCount:', info.validCount);
    console.log('Valid preview:', info.validPreview);
    console.log('Output preview (first 500 chars):');
    console.log(out.slice(0, 500).replace(/\n/g, ' \n '));
  }
}

run().catch(err => {
  console.error('❌ Lỗi khi chạy test variants:', err);
  process.exit(1);
});


