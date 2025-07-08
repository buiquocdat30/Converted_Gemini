/**
 * Script test end-to-end tạo và lưu thư viện từ mới (glossary)
 * - Gọi dịch từ translateService.js
 * - Log chi tiết quá trình dịch, kết quả, phần glossary
 * - Lấy và log lại glossary đã lưu từ glossaryService.js
 */

const { translateText } = require('../services/translateService');
const { getGlossaryByStoryId } = require('../services/glossaryService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Thay đổi key và model nếu cần
const TEST_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCsvSybJ7Wxw118MP-tYBl1N3JM2nZ5hsQ';
const TEST_MODEL = 'gemini-2.0-flash';

// Tạo storyId test riêng biệt để không ảnh hưởng dữ liệu thật
const TEST_STORY_ID = '665f1e2a2a2a2a2a2a2a2a2a'; // 24 ký tự hex hợp lệ

// Đoạn text mẫu có nhiều tên riêng, đa ngôn ngữ
const testText = `
张伟 là một nhân vật nổi tiếng ở M都. Anh ta từng học tại Học viện Onmyou cùng với Haikura Shinku và John Smith. Sau này, 张伟 sáng lập tổ chức Black Lotus và phát triển chiêu thức "Heavenly Dragon Fist". Trong trận chiến ở Tokyo, Haikura Shinku đã sử dụng tuyệt kỹ "Kage Bunshin no Jutsu". Ngoài ra còn có nhân vật phụ là Lee Min Ho và tổ chức White Tiger.\n\nTất cả các tên riêng trên đều cần được xử lý đúng quy tắc!\n\n`;

async function main() {
  console.log('--- BẮT ĐẦU TEST DỊCH & GLOSSARY ---');
  // Xóa glossary cũ nếu có (cho storyId test)
  await prisma.glossaryItem.deleteMany({ where: { storyId: TEST_STORY_ID } });

  // Gọi dịch
  console.log('Gọi translateText...');
  const result = await translateText(
    testText,
    { key: TEST_API_KEY, usageId: null, isUserKey: true },
    TEST_MODEL,
    'content',
    TEST_STORY_ID
  );

  console.log('\n--- KẾT QUẢ DỊCH ---');
  if (result.hasError) {
    console.error('❌ Lỗi dịch:', result.error);
    console.error('Chi tiết:', result.errorDetails);
    return;
  }
  console.log('Bản dịch:', result.translated);

  // Log phần glossary (nếu có)
  const glossaryMatch = result.translated.match(/📚 THƯ VIỆN TỪ MỚI:\n([\s\S]*?)(?=\n---|$)/);
  if (glossaryMatch) {
    console.log('\n--- THƯ VIỆN TỪ MỚI TRÍCH XUẤT ---');
    console.log(glossaryMatch[1].trim());
  } else {
    console.log('\n⚠️ Không tìm thấy phần "THƯ VIỆN TỪ MỚI" trong bản dịch!');
  }

  // Lấy lại glossary đã lưu từ DB
  const glossaryItems = await getGlossaryByStoryId(TEST_STORY_ID);
  console.log('\n--- GLOSSARY ĐÃ LƯU TRONG DB ---');
  if (glossaryItems.length === 0) {
    console.log('Không có từ mới nào được lưu!');
  } else {
    glossaryItems.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.original} = ${item.translated} [${item.type}] [${item.lang}]`);
    });
  }

  console.log('--- KẾT THÚC TEST ---');
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Lỗi khi chạy test:', err);
    prisma.$disconnect();
  });
} 