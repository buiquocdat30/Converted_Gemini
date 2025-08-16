const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/user/library'; // Đảm bảo đúng port của BE

// Thay thế bằng ID truyện và ID người dùng hợp lệ từ database của bạn
const TEST_STORY_ID = '689ff2fc61c296e4c822a917'; 
const TEST_USER_ID = '681826bfe8339b73ad579f56'; 

// Giả định một token xác thực. Trong môi trường thực tế, bạn sẽ lấy token này sau khi đăng nhập.
// Bạn có thể lấy một token hợp lệ từ quá trình đăng nhập và dán vào đây để kiểm tra.
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE4MjZiZmU4MzM5YjczYWQ1NzlmNTYiLCJ1c2VybmFtZSI6IlRvbnkiLCJpYXQiOjE3NTE0MjE1OTl9.JvCFfE8MV3CuVS6veIufM1Rr8WugBo6OozSIy8iQ9Uo'; 

const fetchChapters = async (storyId, userId, page = 1, limit = 10, useCache = true) => {
    const url = `${API_BASE_URL}/${storyId}/chapters?page=${page}&limit=${limit}`;
    console.log(`\nĐang gọi API: ${url} (Cache: ${useCache ? 'Có' : 'Không'})`);

    try {
        const start = Date.now();
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                //'X-User-ID': userId, // Có thể cần nếu middleware auth của bạn cần userId trong header
            },
        });
        const end = Date.now();
        console.log(`Thời gian phản hồi: ${end - start} ms`);
        console.log(`Số lượng chương nhận được: ${response.data.length}`);
        // console.log('Dữ liệu chương đầu tiên:', response.data[0]); // Bỏ comment để xem chi tiết dữ liệu
        return response.data;
    } catch (error) {
        console.error('Lỗi khi fetch chapters:', error.response ? error.response.data : error.message);
        return null;
    }
};

const runTests = async () => {
    console.log('=== Bắt đầu kiểm thử tải chương truyện ===');

    if (TEST_STORY_ID === 'your_story_id_here' || TEST_USER_ID === 'your_user_id_here' || AUTH_TOKEN === 'your_auth_token_here') {
        console.error('Lỗi: Vui lòng cập nhật TEST_STORY_ID, TEST_USER_ID và AUTH_TOKEN trong script.');
        return;
    }

    // Test 1: Lần gọi đầu tiên (mong đợi cache miss)
    console.log('\n--- Test Case 1: Lần gọi đầu tiên (mong đợi cache miss) ---');
    await fetchChapters(TEST_STORY_ID, TEST_USER_ID, 1, 10);

    // Đợi một chút để đảm bảo Redis kịp lưu (thường không cần thiết nhưng tốt cho debug)
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // Test 2: Lần gọi thứ hai ngay sau đó (mong đợi cache hit)
    console.log('\n--- Test Case 2: Lần gọi thứ hai (mong đợi cache hit) ---');
    await fetchChapters(TEST_STORY_ID, TEST_USER_ID, 1, 10);

    // Test 3: Lần gọi một trang khác (mong đợi cache miss cho trang mới)
    console.log('\n--- Test Case 3: Lần gọi trang khác (mong đợi cache miss) ---');
    await fetchChapters(TEST_STORY_ID, TEST_USER_ID, 2, 10);

    // Test 4: Lần gọi trang vừa rồi lần nữa (mong đợi cache hit cho trang mới)
    console.log('\n--- Test Case 4: Lần gọi trang khác lần nữa (mong đợi cache hit) ---');
    await fetchChapters(TEST_STORY_ID, TEST_USER_ID, 2, 10);

    console.log('\n=== Hoàn thành kiểm thử ===');
};

runTests();
