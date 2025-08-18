
const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

// Đặt Story ID và User ID hợp lệ của bạn tại đây
// Bạn cần có ít nhất một truyện với một vài chương để test
const TEST_STORY_ID = '689ff75961c296e4c822ad1d'; // Thay bằng một storyId có thật
const TEST_USER_ID = '6681826bfe8339b73ad579f56';   // Thay bằng một userId có thật
const TEST_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE4MjZiZmU4MzM5YjczYWQ1NzlmNTYiLCJ1c2VybmFtZSI6IlRvbnkiLCJpYXQiOjE3NTE0MjE1OTl9.JvCFfE8MV3CuVS6veIufM1Rr8WugBo6OozSIy8iQ9Uo'; // Thay bằng token xác thực hợp lệ

const testChapterLoading = async () => {
    if (TEST_AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
        console.error('❌ Lỗi: Vui lòng thay TEST_AUTH_TOKEN bằng token xác thực hợp lệ của bạn.');
        console.error('Bạn có thể lấy token sau khi đăng nhập thành công vào ứng dụng.');
        return;
    }

    console.log('==================================================');
    console.log('🚀 Bắt đầu kiểm thử tải chương truyện với Redis caching');
    console.log('==================================================');

    const headers = {
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
    };

    const params = {
        page: 1,
        limit: 5,
    };

    // Test lần 1: Mong đợi Cache MISS
    console.log('\n--- Lần 1: Gọi API để tải chương (mong đợi Cache MISS) ---');
    try {
        const startTime = Date.now();
        const response1 = await axios.get(
            `${BASE_URL}/user/library/${TEST_STORY_ID}/chapters`,
            { headers, params }
        );
        const endTime = Date.now();
        console.log(`✅ Lần 1 thành công! Tải ${response1.data.length} chương trong ${endTime - startTime}ms.`);
        // console.log('Dữ liệu chương lần 1:', response1.data.map(ch => ch.chapterNumber));
        console.log('Vui lòng kiểm tra log backend để thấy [REDIS] Cache MISS.');
    } catch (error) {
        console.error('❌ Lỗi khi tải chương lần 1:', error.response?.data || error.message);
        return;
    }

    // Đợi một chút để đảm bảo cache kịp lưu
    console.log('Đang chờ 2 giây trước khi gọi lại...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test lần 2: Mong đợi Cache HIT
    console.log('\n--- Lần 2: Gọi API để tải chương (mong đợi Cache HIT) ---');
    try {
        const startTime = Date.now();
        const response2 = await axios.get(
            `${BASE_URL}/user/library/${TEST_STORY_ID}/chapters`,
            { headers, params }
        );
        const endTime = Date.now();
        console.log(`✅ Lần 2 thành công! Tải ${response2.data.length} chương trong ${endTime - startTime}ms.`);
        // console.log('Dữ liệu chương lần 2:', response2.data.map(ch => ch.chapterNumber));
        console.log('Vui lòng kiểm tra log backend để thấy [REDIS] Cache HIT.');
    } catch (error) {
        console.error('❌ Lỗi khi tải chương lần 2:', error.response?.data || error.message);
        return;
    }

    console.log('\n==================================================');
    console.log('✅ Kiểm thử hoàn tất. Hãy kiểm tra console log của backend để xác nhận Cache HIT/MISS.');
    console.log('==================================================');
};

testChapterLoading();
