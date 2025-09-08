#!/usr/bin/env node

// Script kiểm tra môi trường trước khi test
const axios = require('axios');
const { execSync } = require('child_process');

console.log('🔍 [ENV-CHECK] ===== KIỂM TRA MÔI TRƯỜNG TEST =====');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000/api';
const REDIS_URL = 'redis://localhost:6379';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkNodeVersion() {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion >= 14) {
      log(colors.green, `✅ Node.js version: ${version} (OK)`);
      return true;
    } else {
      log(colors.red, `❌ Node.js version: ${version} (Cần >= 14.0.0)`);
      return false;
    }
  } catch (error) {
    log(colors.red, `❌ Không thể kiểm tra Node.js version: ${error.message}`);
    return false;
  }
}

function checkNpmVersion() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(colors.green, `✅ npm version: ${version} (OK)`);
    return true;
  } catch (error) {
    log(colors.red, `❌ Không thể kiểm tra npm version: ${error.message}`);
    return false;
  }
}

async function checkBackendServer() {
  try {
    log(colors.blue, '🔍 Kiểm tra Backend server...');
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    
    if (response.status === 200) {
      log(colors.green, `✅ Backend server: ${BACKEND_URL} (OK)`);
      return true;
    } else {
      log(colors.red, `❌ Backend server: Status ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(colors.red, `❌ Backend server: Không thể kết nối đến ${BACKEND_URL}`);
      log(colors.yellow, '💡 Hãy chạy: cd back_end && npm start');
    } else {
      log(colors.red, `❌ Backend server: ${error.message}`);
    }
    return false;
  }
}

async function checkFrontendServer() {
  try {
    log(colors.blue, '🔍 Kiểm tra Frontend server...');
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    
    if (response.status === 200) {
      log(colors.green, `✅ Frontend server: ${FRONTEND_URL} (OK)`);
      return true;
    } else {
      log(colors.red, `❌ Frontend server: Status ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(colors.red, `❌ Frontend server: Không thể kết nối đến ${FRONTEND_URL}`);
      log(colors.yellow, '💡 Hãy chạy: cd front_end && npm start');
    } else {
      log(colors.red, `❌ Frontend server: ${error.message}`);
    }
    return false;
  }
}

function checkRedisConnection() {
  try {
    log(colors.blue, '🔍 Kiểm tra Redis connection...');
    const redis = require('redis');
    const client = redis.createClient({ url: REDIS_URL });
    
    return new Promise((resolve) => {
      client.on('connect', () => {
        log(colors.green, `✅ Redis connection: ${REDIS_URL} (OK)`);
        client.quit();
        resolve(true);
      });
      
      client.on('error', (error) => {
        log(colors.red, `❌ Redis connection: ${error.message}`);
        log(colors.yellow, '💡 Hãy chạy: redis-server');
        resolve(false);
      });
      
      client.connect();
    });
  } catch (error) {
    log(colors.red, `❌ Redis: ${error.message}`);
    log(colors.yellow, '💡 Hãy cài đặt Redis và chạy: redis-server');
    return false;
  }
}

function checkDependencies() {
  log(colors.blue, '🔍 Kiểm tra dependencies...');
  
  const checks = [
    { name: 'Frontend dependencies', path: 'front_end/node_modules', cmd: 'cd front_end && npm list --depth=0' },
    { name: 'Backend dependencies', path: 'back_end/node_modules', cmd: 'cd back_end && npm list --depth=0' }
  ];
  
  let allOk = true;
  
  checks.forEach(check => {
    try {
      const fs = require('fs');
      if (fs.existsSync(check.path)) {
        log(colors.green, `✅ ${check.name}: OK`);
      } else {
        log(colors.red, `❌ ${check.name}: node_modules không tồn tại`);
        log(colors.yellow, `💡 Hãy chạy: ${check.cmd}`);
        allOk = false;
      }
    } catch (error) {
      log(colors.red, `❌ ${check.name}: ${error.message}`);
      allOk = false;
    }
  });
  
  return allOk;
}

function checkTestFiles() {
  log(colors.blue, '🔍 Kiểm tra test files...');
  
  const testFiles = [
    'front_end/src/pages/TranslationTestPage.jsx',
    'back_end/scripts/testTranslationEndpoints.js',
    'front_end/src/services/translateRangePage.jsx',
    'front_end/src/services/translateAllPages.jsx'
  ];
  
  let allOk = true;
  
  testFiles.forEach(file => {
    try {
      const fs = require('fs');
      if (fs.existsSync(file)) {
        log(colors.green, `✅ ${file}: OK`);
      } else {
        log(colors.red, `❌ ${file}: Không tồn tại`);
        allOk = false;
      }
    } catch (error) {
      log(colors.red, `❌ ${file}: ${error.message}`);
      allOk = false;
    }
  });
  
  return allOk;
}

async function checkAuthToken() {
  try {
    log(colors.blue, '🔍 Kiểm tra auth token...');
    
    // Kiểm tra token trong localStorage của browser (không thể test từ Node.js)
    log(colors.yellow, '⚠️ Auth token: Cần kiểm tra thủ công trong browser');
    log(colors.yellow, '💡 Mở Developer Tools → Application → Local Storage → auth-token');
    
    return true;
  } catch (error) {
    log(colors.red, `❌ Auth token: ${error.message}`);
    return false;
  }
}

async function runAllChecks() {
  const results = {
    nodeVersion: checkNodeVersion(),
    npmVersion: checkNpmVersion(),
    dependencies: checkDependencies(),
    testFiles: checkTestFiles(),
    authToken: await checkAuthToken(),
    backendServer: await checkBackendServer(),
    frontendServer: await checkFrontendServer(),
    redisConnection: await checkRedisConnection()
  };
  
  console.log('\n📊 [ENV-CHECK] ===== KẾT QUẢ KIỂM TRA =====');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✅ PASS' : '❌ FAIL';
    const color = value ? colors.green : colors.red;
    log(color, `${status} ${key}`);
  });
  
  console.log(`\n📈 [ENV-CHECK] Tổng kết: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    log(colors.green, '🎉 [ENV-CHECK] Tất cả checks đều PASS! Sẵn sàng để test.');
    console.log('\n🚀 [ENV-CHECK] Bước tiếp theo:');
    console.log('1. Chạy backend test: cd back_end && node scripts/testTranslationEndpoints.js');
    console.log('2. Mở frontend test: http://localhost:3000/test-translation');
  } else {
    log(colors.red, '⚠️ [ENV-CHECK] Một số checks FAILED! Vui lòng khắc phục trước khi test.');
    console.log('\n🔧 [ENV-CHECK] Các bước khắc phục:');
    
    if (!results.dependencies) {
      console.log('- Cài đặt dependencies: cd front_end && npm install && cd ../back_end && npm install');
    }
    if (!results.backendServer) {
      console.log('- Khởi động backend: cd back_end && npm start');
    }
    if (!results.frontendServer) {
      console.log('- Khởi động frontend: cd front_end && npm start');
    }
    if (!results.redisConnection) {
      console.log('- Khởi động Redis: redis-server');
    }
  }
  
  return passed === total;
}

// Chạy kiểm tra
runAllChecks()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(colors.red, `💥 [ENV-CHECK] Fatal error: ${error.message}`);
    process.exit(1);
  });
