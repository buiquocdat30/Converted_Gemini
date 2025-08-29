// BotService.js - Xử lý các hành động của bot
import { toast } from 'react-hot-toast';

export async function handleBotAction(command) {
  // Xử lý lỗi từ parser
  if (command.error) {
    return command.error;
  }

  switch (command.type) {
    case 'translate':
      if (!command.payload) {
        return '❌ Vui lòng nhập nội dung cần dịch';
      }
      return `🔄 Đang xử lý lệnh dịch: "${command.payload}"\n\nTính năng này sẽ được tích hợp với hệ thống dịch chính.`;

    case 'addStory':
      if (!command.payload) {
        return '❌ Vui lòng nhập tên truyện';
      }
      return `📚 Đang xử lý lệnh thêm truyện: "${command.payload}"\n\nTính năng này sẽ được tích hợp với hệ thống quản lý truyện.`;

    case 'addChapter':
      if (!command.payload) {
        return '❌ Vui lòng nhập tên chương';
      }
      return `📖 Đang xử lý lệnh thêm chương: "${command.payload}"\n\nTính năng này sẽ được tích hợp với hệ thống quản lý chương.`;

    case 'addKey':
      if (!command.payload) {
        return '❌ Vui lòng nhập API key';
      }
      return `🔑 Đang xử lý lệnh thêm API key: "${command.payload}"\n\nTính năng này sẽ được tích hợp với hệ thống quản lý key.`;

    case 'help':
      return `🤖 <strong>Translation Bot - Hướng dẫn sử dụng</strong>\n\n` +
             `📝 <strong>Các lệnh hỗ trợ:</strong>\n` +
             `• <code>dịch [nội dung]</code> - Dịch nội dung\n` +
             `• <code>thêm truyện [tên truyện]</code> - Thêm truyện mới\n` +
             `• <code>thêm chương [tên chương]</code> - Thêm chương mới\n` +
             `• <code>thêm key [api_key]</code> - Thêm API key\n` +
             `• <code>giúp</code> hoặc <code>help</code> - Hiển thị hướng dẫn này\n` +
             `• <code>xóa</code> hoặc <code>clear</code> - Xóa lịch sử chat\n\n` +
             `💡 <strong>Ví dụ:</strong>\n` +
             `• <code>dịch Hello world</code>\n` +
             `• <code>thêm truyện Truyện kiếm hiệp</code>\n` +
             `• <code>thêm chương Chương 1: Khởi đầu</code>`;

    case 'clear':
      return '🧹 Lịch sử chat đã được xóa!';

    case 'unknown':
      return command.error || `❓ Tôi không hiểu lệnh "${command.payload}". Hãy gõ "giúp" để xem các lệnh hỗ trợ.`;

    default:
      return `❌ Lỗi không xác định: ${command.type}`;
  }
}

// Hàm helper để hiển thị thông báo toast
export function showBotNotification(message, type = 'info') {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast(message, { icon: '⚠️' });
      break;
    default:
      toast(message);
  }
}

// Hàm để tích hợp với ConvertContext (sẽ được implement sau)
export async function integrateWithConvertContext(action, payload) {
  // TODO: Tích hợp với ConvertContext để thực hiện các hành động thực tế
  console.log('Bot action:', action, 'Payload:', payload);
  
  // Placeholder cho các tích hợp trong tương lai
  switch (action) {
    case 'translate':
      // Gọi API dịch
      break;
    case 'addStory':
      // Gọi API thêm truyện
      break;
    case 'addChapter':
      // Gọi API thêm chương
      break;
    case 'addKey':
      // Lưu API key
      break;
  }
}
