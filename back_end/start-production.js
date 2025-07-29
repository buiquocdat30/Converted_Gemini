const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Khởi động hệ thống production...');

// Chạy Express server
const server = spawn('node', ['index.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Chạy Socket.io server
const socket = spawn('node', ['socket.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Chạy Worker
const worker = spawn('node', ['utils/worker.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Xử lý khi các process kết thúc
server.on('close', (code) => {
  console.log(`[SERVER] Express server đã dừng với code: ${code}`);
});

socket.on('close', (code) => {
  console.log(`[SOCKET] Socket.io server đã dừng với code: ${code}`);
});

worker.on('close', (code) => {
  console.log(`[WORKER] Worker đã dừng với code: ${code}`);
});

// Xử lý lỗi
server.on('error', (error) => {
  console.error('[SERVER] Lỗi:', error);
});

socket.on('error', (error) => {
  console.error('[SOCKET] Lỗi:', error);
});

worker.on('error', (error) => {
  console.error('[WORKER] Lỗi:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Đang dừng tất cả services...');
  try {
    server.kill('SIGINT');
    socket.kill('SIGINT');
    worker.kill('SIGINT');
    
    // Đợi một chút để các process có thời gian đóng gracefully
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Đã dừng tất cả services');
  } catch (error) {
    console.error('❌ Lỗi khi dừng services:', error);
  }
  process.exit(0);
});

console.log('✅ Tất cả services đã khởi động!');
console.log('📊 Express server: http://localhost:8000');
console.log('🔌 Socket.io server: http://localhost:8001');
console.log('⚙️  Worker: Đang chạy');
console.log('💡 Nhấn Ctrl+C để dừng tất cả'); 