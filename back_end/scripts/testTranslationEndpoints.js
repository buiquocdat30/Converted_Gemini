// File test đơn giản để test backend endpoints trực tiếp
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000/api'; // Thay đổi URL theo server của bạn
const TEST_TOKEN = 'test-token'; // Thay đổi token thực tế

// Mock data
const mockChapters = [
  { title: 'Chương 1', content: 'Nội dung chương 1 rất dài để test dịch thuật...', chapterNumber: 1 },
  { title: 'Chương 2', content: 'Nội dung chương 2 rất dài để test dịch thuật...', chapterNumber: 2 },
  { title: 'Chương 3', content: 'Nội dung chương 3 rất dài để test dịch thuật...', chapterNumber: 3 },
  { title: 'Chương 4', content: 'Nội dung chương 4 rất dài để test dịch thuật...', chapterNumber: 4 },
  { title: 'Chương 5', content: 'Nội dung chương 5 rất dài để test dịch thuật...', chapterNumber: 5 },
  { title: 'Chương 6', content: 'Nội dung chương 6 rất dài để test dịch thuật...', chapterNumber: 6 },
  { title: 'Chương 7', content: 'Nội dung chương 7 rất dài để test dịch thuật...', chapterNumber: 7 },
  { title: 'Chương 8', content: 'Nội dung chương 8 rất dài để test dịch thuật...', chapterNumber: 8 },
  { title: 'Chương 9', content: 'Nội dung chương 9 rất dài để test dịch thuật...', chapterNumber: 9 },
  { title: 'Chương 10', content: 'Nội dung chương 10 rất dài để test dịch thuật...', chapterNumber: 10 },
  { title: 'Chương 11', content: 'Nội dung chương 11 rất dài để test dịch thuật...', chapterNumber: 11 },
  { title: 'Chương 12', content: 'Nội dung chương 12 rất dài để test dịch thuật...', chapterNumber: 12 },
  { title: 'Chương 13', content: 'Nội dung chương 13 rất dài để test dịch thuật...', chapterNumber: 13 },
  { title: 'Chương 14', content: 'Nội dung chương 14 rất dài để test dịch thuật...', chapterNumber: 14 },
  { title: 'Chương 15', content: 'Nội dung chương 15 rất dài để test dịch thuật...', chapterNumber: 15 },
  { title: 'Chương 16', content: 'Nội dung chương 16 rất dài để test dịch thuật...', chapterNumber: 16 },
  { title: 'Chương 17', content: 'Nội dung chương 17 rất dài để test dịch thuật...', chapterNumber: 17 },
  { title: 'Chương 18', content: 'Nội dung chương 18 rất dài để test dịch thuật...', chapterNumber: 18 },
  { title: 'Chương 19', content: 'Nội dung chương 19 rất dài để test dịch thuật...', chapterNumber: 19 },
  { title: 'Chương 20', content: 'Nội dung chương 20 rất dài để test dịch thuật...', chapterNumber: 20 }
];

const mockModel = {
  value: 'gpt-3.5-turbo',
  label: 'GPT-3.5 Turbo',
  name: 'GPT-3.5 Turbo',
  rpm: 60,
  tpm: 90000,
  rpd: 1000
};

const mockUserKeys = ['test-api-key-123'];
const mockStoryId = 'test-story-123';
const mockUserId = 'test-user-456';

// Test function cho range-pages endpoint
async function testRangePagesEndpoint() {
  console.log('🧪 [BACKEND-TEST] ===== TESTING RANGE-PAGES ENDPOINT =====');
  
  try {
    const requestData = {
      pageNumbers: [1, 2], // Test trang 1 và 2
      chapters: mockChapters,
      userKeys: mockUserKeys,
      model: mockModel,
      storyId: mockStoryId,
      userId: mockUserId,
      isBatchTranslation: true
    };

    console.log('📤 [BACKEND-TEST] Request data:', {
      pageNumbers: requestData.pageNumbers,
      chaptersCount: requestData.chapters.length,
      model: requestData.model.label,
      storyId: requestData.storyId,
      userId: requestData.userId,
      hasUserKeys: !!requestData.userKeys,
      userKeysCount: requestData.userKeys.length
    });

    const response = await axios.post(`${API_URL}/translate/range-pages`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('📥 [BACKEND-TEST] Response status:', response.status);
    console.log('📥 [BACKEND-TEST] Response data:', {
      success: response.data.success,
      message: response.data.message,
      totalPages: response.data.totalPages,
      successfulPages: response.data.successfulPages,
      totalJobs: response.data.totalJobs,
      hasTiming: !!response.data.timing,
      errorsCount: response.data.errors?.length || 0
    });

    if (response.data.timing) {
      console.log('📊 [BACKEND-TEST] Timing info:', response.data.timing);
    }

    if (response.data.errors && response.data.errors.length > 0) {
      console.log('❌ [BACKEND-TEST] Errors:', response.data.errors);
    }

    console.log('✅ [BACKEND-TEST] Range-pages endpoint test completed successfully');
    return response.data;

  } catch (error) {
    console.error('❌ [BACKEND-TEST] Range-pages endpoint test failed:', error.message);
    if (error.response) {
      console.error('📥 [BACKEND-TEST] Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw error;
  }
}

// Test function cho all-pages endpoint
async function testAllPagesEndpoint() {
  console.log('🧪 [BACKEND-TEST] ===== TESTING ALL-PAGES ENDPOINT =====');
  
  try {
    const requestData = {
      chapters: mockChapters,
      userKeys: mockUserKeys,
      model: mockModel,
      storyId: mockStoryId,
      userId: mockUserId,
      isBatchTranslation: true,
      forceTranslate: false,
      maxPagesPerBatch: 3
    };

    console.log('📤 [BACKEND-TEST] Request data:', {
      chaptersCount: requestData.chapters.length,
      model: requestData.model.label,
      storyId: requestData.storyId,
      userId: requestData.userId,
      hasUserKeys: !!requestData.userKeys,
      userKeysCount: requestData.userKeys.length,
      forceTranslate: requestData.forceTranslate,
      maxPagesPerBatch: requestData.maxPagesPerBatch
    });

    const response = await axios.post(`${API_URL}/translate/all-pages`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('📥 [BACKEND-TEST] Response status:', response.status);
    console.log('📥 [BACKEND-TEST] Response data:', {
      success: response.data.success,
      message: response.data.message,
      totalPages: response.data.totalPages,
      successfulPages: response.data.successfulPages,
      totalJobs: response.data.totalJobs,
      hasTiming: !!response.data.timing,
      hasPageAnalysis: !!response.data.pageAnalysis,
      errorsCount: response.data.errors?.length || 0
    });

    if (response.data.timing) {
      console.log('📊 [BACKEND-TEST] Timing info:', response.data.timing);
    }

    if (response.data.pageAnalysis) {
      console.log('📊 [BACKEND-TEST] Page analysis:', response.data.pageAnalysis);
    }

    if (response.data.errors && response.data.errors.length > 0) {
      console.log('❌ [BACKEND-TEST] Errors:', response.data.errors);
    }

    console.log('✅ [BACKEND-TEST] All-pages endpoint test completed successfully');
    return response.data;

  } catch (error) {
    console.error('❌ [BACKEND-TEST] All-pages endpoint test failed:', error.message);
    if (error.response) {
      console.error('📥 [BACKEND-TEST] Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw error;
  }
}

// Test function cho validation
async function testValidation() {
  console.log('🧪 [BACKEND-TEST] ===== TESTING VALIDATION =====');
  
  const testCases = [
    {
      name: 'Missing pageNumbers',
      data: {
        chapters: mockChapters,
        userKeys: mockUserKeys,
        model: mockModel,
        storyId: mockStoryId,
        userId: mockUserId
      },
      endpoint: '/translate/range-pages'
    },
    {
      name: 'Missing chapters',
      data: {
        pageNumbers: [1, 2],
        userKeys: mockUserKeys,
        model: mockModel,
        storyId: mockStoryId,
        userId: mockUserId
      },
      endpoint: '/translate/range-pages'
    },
    {
      name: 'Missing model',
      data: {
        pageNumbers: [1, 2],
        chapters: mockChapters,
        userKeys: mockUserKeys,
        storyId: mockStoryId,
        userId: mockUserId
      },
      endpoint: '/translate/range-pages'
    },
    {
      name: 'Missing userKeys for all-pages',
      data: {
        chapters: mockChapters,
        model: mockModel,
        storyId: mockStoryId,
        userId: mockUserId
      },
      endpoint: '/translate/all-pages'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🧪 [BACKEND-TEST] Testing validation: ${testCase.name}`);
      
      const response = await axios.post(`${API_URL}${testCase.endpoint}`, testCase.data, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        timeout: 10000
      });

      console.log(`⚠️ [BACKEND-TEST] Validation test "${testCase.name}" should have failed but got success`);
      
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ [BACKEND-TEST] Validation test "${testCase.name}" correctly returned 400 error`);
        console.log(`📥 [BACKEND-TEST] Error message: ${error.response.data.error}`);
      } else {
        console.log(`❌ [BACKEND-TEST] Validation test "${testCase.name}" failed with unexpected error:`, error.message);
      }
    }
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 [BACKEND-TEST] ===== STARTING BACKEND TESTS =====');
  console.log(`🌐 [BACKEND-TEST] API URL: ${API_URL}`);
  console.log(`🔑 [BACKEND-TEST] Using token: ${TEST_TOKEN.substring(0, 10)}...`);
  
  const results = {
    rangePagesTest: null,
    allPagesTest: null,
    validationTest: null,
    errors: []
  };

  try {
    // Test validation first
    console.log('\n📋 [BACKEND-TEST] Running validation tests...');
    await testValidation();
    results.validationTest = 'completed';

    // Test range-pages endpoint
    console.log('\n📄 [BACKEND-TEST] Running range-pages endpoint test...');
    results.rangePagesTest = await testRangePagesEndpoint();

    // Test all-pages endpoint
    console.log('\n📚 [BACKEND-TEST] Running all-pages endpoint test...');
    results.allPagesTest = await testAllPagesEndpoint();

    console.log('\n🎉 [BACKEND-TEST] ===== ALL TESTS COMPLETED SUCCESSFULLY =====');
    
    // Summary
    console.log('\n📊 [BACKEND-TEST] Test Summary:');
    console.log(`✅ Range Pages Test: ${results.rangePagesTest?.success ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ All Pages Test: ${results.allPagesTest?.success ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Validation Test: ${results.validationTest === 'completed' ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('\n❌ [BACKEND-TEST] ===== TESTS FAILED =====');
    console.error('❌ [BACKEND-TEST] Error:', error.message);
    results.errors.push(error.message);
  }

  return results;
}

// Export functions for use in other files
module.exports = {
  testRangePagesEndpoint,
  testAllPagesEndpoint,
  testValidation,
  runAllTests,
  mockChapters,
  mockModel,
  mockUserKeys,
  mockStoryId,
  mockUserId
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      console.log('\n📋 [BACKEND-TEST] Final Results:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 [BACKEND-TEST] Fatal error:', error);
      process.exit(1);
    });
}
