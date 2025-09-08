#!/usr/bin/env node

// Script tự động chạy tất cả tests
const { execSync, spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

console.log('🚀 [AUTO-TEST] ===== TỰ ĐỘNG CHẠY TẤT CẢ TESTS =====');

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE4MjZiZmU4MzM5YjczYWQ1NzlmNTYiLCJ1c2VybmFtZSI6IlRvbnkiLCJpYXQiOjE3NTE0MjE1OTl9.JvCFfE8MV3CuVS6veIufM1Rr8WugBo6OozSIy8iQ9Uo'; // Thay đổi token thực tế

// Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkEnvironment() {
  log(colors.blue, '🔍 [AUTO-TEST] Kiểm tra môi trường...');
  
  try {
    // Kiểm tra backend
    await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    log(colors.green, '✅ Backend server: OK');
  } catch (error) {
    log(colors.red, '❌ Backend server: Không thể kết nối');
    log(colors.yellow, '💡 Hãy chạy: cd back_end && npm start');
    return false;
  }
  
  try {
    // Kiểm tra frontend
    await axios.get(FRONTEND_URL, { timeout: 5000 });
    log(colors.green, '✅ Frontend server: OK');
  } catch (error) {
    log(colors.red, '❌ Frontend server: Không thể kết nối');
    log(colors.yellow, '💡 Hãy chạy: cd front_end && npm start');
    return false;
  }
  
  return true;
}

async function runBackendTests() {
  log(colors.cyan, '\n🧪 [AUTO-TEST] ===== CHẠY BACKEND TESTS =====');
  
  try {
    // Chạy backend test script
    const result = execSync('node scripts/testTranslationEndpoints.js', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log(colors.green, '✅ Backend tests completed');
    console.log(result);
    return true;
  } catch (error) {
    log(colors.red, '❌ Backend tests failed');
    console.error(error.stdout || error.message);
    return false;
  }
}

async function runFrontendTests() {
  log(colors.cyan, '\n🎨 [AUTO-TEST] ===== CHẠY FRONTEND TESTS =====');
  
  try {
    // Test range-pages endpoint
    log(colors.blue, '🔍 Testing range-pages endpoint...');
    const rangePagesResponse = await axios.post(`${BACKEND_URL}/translate/range-pages`, {
      pageNumbers: [1, 2],
      chapters: generateMockChapters(20),
      userKeys: ['test-api-key'],
      model: {
        value: 'gpt-3.5-turbo',
        label: 'GPT-3.5 Turbo',
        rpm: 60,
        tpm: 90000,
        rpd: 1000
      },
      storyId: 'test-story-123',
      userId: 'test-user-456',
      isBatchTranslation: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      timeout: 30000
    });
    
    if (rangePagesResponse.data.success) {
      log(colors.green, `✅ Range-pages test: ${rangePagesResponse.data.successfulPages}/${rangePagesResponse.data.totalPages} pages`);
    } else {
      log(colors.red, '❌ Range-pages test failed');
      return false;
    }
    
    // Test all-pages endpoint
    log(colors.blue, '🔍 Testing all-pages endpoint...');
    const allPagesResponse = await axios.post(`${BACKEND_URL}/translate/all-pages`, {
      chapters: generateMockChapters(20),
      userKeys: ['test-api-key'],
      model: {
        value: 'gpt-3.5-turbo',
        label: 'GPT-3.5 Turbo',
        rpm: 60,
        tpm: 90000,
        rpd: 1000
      },
      storyId: 'test-story-123',
      userId: 'test-user-456',
      isBatchTranslation: true,
      forceTranslate: false,
      maxPagesPerBatch: 3
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      timeout: 30000
    });
    
    if (allPagesResponse.data.success) {
      log(colors.green, `✅ All-pages test: ${allPagesResponse.data.successfulPages}/${allPagesResponse.data.totalPages} pages`);
    } else {
      log(colors.red, '❌ All-pages test failed');
      return false;
    }
    
    return true;
  } catch (error) {
    log(colors.red, '❌ Frontend tests failed');
    if (error.response) {
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

function generateMockChapters(count) {
  const chapters = [];
  for (let i = 1; i <= count; i++) {
    chapters.push({
      title: `Chương ${i}`,
      content: `Nội dung chương ${i} rất dài để test dịch thuật...`,
      chapterNumber: i
    });
  }
  return chapters;
}

async function runIntegrationTests() {
  log(colors.cyan, '\n🔗 [AUTO-TEST] ===== CHẠY INTEGRATION TESTS =====');
  
  try {
    // Test validation
    log(colors.blue, '🔍 Testing validation...');
    
    const validationTests = [
      {
        name: 'Missing pageNumbers',
        data: {
          chapters: generateMockChapters(5),
          userKeys: ['test-api-key'],
          model: { value: 'gpt-3.5-turbo' },
          storyId: 'test-story-123',
          userId: 'test-user-456'
        },
        endpoint: '/translate/range-pages'
      },
      {
        name: 'Missing chapters',
        data: {
          pageNumbers: [1, 2],
          userKeys: ['test-api-key'],
          model: { value: 'gpt-3.5-turbo' },
          storyId: 'test-story-123',
          userId: 'test-user-456'
        },
        endpoint: '/translate/range-pages'
      },
      {
        name: 'Missing userKeys for all-pages',
        data: {
          chapters: generateMockChapters(5),
          model: { value: 'gpt-3.5-turbo' },
          storyId: 'test-story-123',
          userId: 'test-user-456'
        },
        endpoint: '/translate/all-pages'
      }
    ];
    
    let validationPassed = 0;
    
    for (const test of validationTests) {
      try {
        await axios.post(`${BACKEND_URL}${test.endpoint}`, test.data, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN}`
          },
          timeout: 10000
        });
        log(colors.red, `❌ Validation test "${test.name}" should have failed`);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          log(colors.green, `✅ Validation test "${test.name}": Correctly returned 400`);
          validationPassed++;
        } else {
          log(colors.red, `❌ Validation test "${test.name}": Unexpected error`);
        }
      }
    }
    
    if (validationPassed === validationTests.length) {
      log(colors.green, '✅ All validation tests passed');
      return true;
    } else {
      log(colors.red, `❌ Only ${validationPassed}/${validationTests.length} validation tests passed`);
      return false;
    }
    
  } catch (error) {
    log(colors.red, '❌ Integration tests failed');
    console.error(error.message);
    return false;
  }
}

async function runPerformanceTests() {
  log(colors.cyan, '\n⚡ [AUTO-TEST] ===== CHẠY PERFORMANCE TESTS =====');
  
  try {
    // Test với nhiều trang
    log(colors.blue, '🔍 Testing with multiple pages...');
    const startTime = Date.now();
    
    const response = await axios.post(`${BACKEND_URL}/translate/range-pages`, {
      pageNumbers: [1, 2, 3, 4, 5],
      chapters: generateMockChapters(50),
      userKeys: ['test-api-key'],
      model: {
        value: 'gpt-3.5-turbo',
        label: 'GPT-3.5 Turbo',
        rpm: 60,
        tpm: 90000,
        rpd: 1000
      },
      storyId: 'test-story-123',
      userId: 'test-user-456',
      isBatchTranslation: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      timeout: 60000
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (response.data.success) {
      log(colors.green, `✅ Performance test: ${response.data.totalJobs} jobs in ${duration}ms`);
      log(colors.green, `📊 Average: ${(duration / response.data.totalJobs).toFixed(2)}ms per job`);
      return true;
    } else {
      log(colors.red, '❌ Performance test failed');
      return false;
    }
    
  } catch (error) {
    log(colors.red, '❌ Performance tests failed');
    console.error(error.message);
    return false;
  }
}

async function generateTestReport(results) {
  log(colors.cyan, '\n📊 [AUTO-TEST] ===== TEST REPORT =====');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\n📈 Test Summary:`);
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests}/${totalTests}`);
  console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  console.log(`\n📋 Detailed Results:`);
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? colors.green : colors.red;
    log(color, `${status} ${test}`);
  });
  
  if (passedTests === totalTests) {
    log(colors.green, '\n🎉 [AUTO-TEST] ALL TESTS PASSED! 🎉');
    console.log('\n🚀 Next steps:');
    console.log('1. Test UI manually: http://localhost:3000/test-translation');
    console.log('2. Monitor queue: redis-cli monitor');
    console.log('3. Check logs: tail -f back_end/logs/app.log');
  } else {
    log(colors.red, '\n⚠️ [AUTO-TEST] SOME TESTS FAILED!');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check backend logs for errors');
    console.log('2. Verify Redis connection');
    console.log('3. Check database connectivity');
    console.log('4. Verify API keys and tokens');
  }
  
  return passedTests === totalTests;
}

async function main() {
  try {
    // Kiểm tra môi trường
    const envOk = await checkEnvironment();
    if (!envOk) {
      log(colors.red, '❌ Environment check failed. Please fix issues before running tests.');
      process.exit(1);
    }
    
    // Chạy các tests
    const results = {
      'Backend Tests': await runBackendTests(),
      'Frontend Tests': await runFrontendTests(),
      'Integration Tests': await runIntegrationTests(),
      'Performance Tests': await runPerformanceTests()
    };
    
    // Tạo báo cáo
    const allPassed = await generateTestReport(results);
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log(colors.red, `💥 [AUTO-TEST] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Chạy tests
main();
