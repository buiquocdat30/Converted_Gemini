// BotService.js - Xử lý các hành động của bot
import { toast } from 'react-hot-toast';

export async function handleBotAction(command, context) {
  // Xử lý lỗi từ parser
  if (command.error) {
    return command.error;
  }

  const {
    createStory,
    addChapter,
    isLoggedIn,
    getAuthToken,
    updateCurrentKey,
    updateSelectedKeys,
  } = context;

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
      
      if (!isLoggedIn) {
        return '❌ Bạn cần đăng nhập để thêm truyện mới';
      }

      try {
        const storyInfo = {
          name: command.payload,
          description: `Truyện được tạo qua bot: ${command.payload}`,
          author: 'Bot',
          chapters: []
        };

        const response = await createStory(storyInfo);
        showBotNotification(`✅ Đã tạo truyện "${command.payload}" thành công!`, 'success');
        return `📚 <strong>Thành công!</strong> Đã tạo truyện "${command.payload}" với ID: ${response.id}`;
      } catch (error) {
        console.error('Lỗi khi tạo truyện:', error);
        showBotNotification('❌ Lỗi khi tạo truyện', 'error');
        return `❌ Lỗi khi tạo truyện: ${error.message}`;
      }

    case 'addChapter':
      if (!command.payload) {
        return '❌ Vui lòng nhập tên chương';
      }
      
      if (!isLoggedIn) {
        return '❌ Bạn cần đăng nhập để thêm chương mới';
      }

      try {
        // Tạo chương mẫu
        const chapterData = {
          storyId: null, // Sẽ cần storyId thực tế
          chapterNumber: 1,
          chapterName: command.payload,
          rawText: `Nội dung chương "${command.payload}" sẽ được thêm vào đây.`
        };

        // Lưu ý: Cần storyId thực tế để thêm chương
        showBotNotification('⚠️ Cần chọn truyện trước khi thêm chương', 'warning');
        return `📖 <strong>Lưu ý:</strong> Để thêm chương "${command.payload}", bạn cần:\n1. Chọn truyện trong tab "Truyện đang dịch"\n2. Sau đó sử dụng lệnh này lại`;
      } catch (error) {
        console.error('Lỗi khi thêm chương:', error);
        showBotNotification('❌ Lỗi khi thêm chương', 'error');
        return `❌ Lỗi khi thêm chương: ${error.message}`;
      }

    case 'addKey':
      if (!command.payload) {
        return '❌ Vui lòng nhập API key';
      }

      try {
        // Cập nhật API key trong session
        updateCurrentKey(command.payload);
        updateSelectedKeys([command.payload]);
        
        showBotNotification('✅ Đã lưu API key thành công!', 'success');
        return `🔑 <strong>Thành công!</strong> Đã lưu API key: ${command.payload.substring(0, 20)}...`;
      } catch (error) {
        console.error('Lỗi khi lưu API key:', error);
        showBotNotification('❌ Lỗi khi lưu API key', 'error');
        return `❌ Lỗi khi lưu API key: ${error.message}`;
      }

    case 'help':
      return `🤖 <strong>Translation Bot - Hướng dẫn sử dụng</strong> <br/>\n\n` +
             `📝 <strong>Các lệnh hỗ trợ:</strong><br/>` +
             `• <code>dịch [nội dung]</code> - Dịch nội dung<br/>` +
             `• <code>thêm truyện [tên truyện]</code> - Thêm truyện mới<br/>` +
             `• <code>thêm chương [tên chương]</code> - Thêm chương mới<br/>` +
             `• <code>thêm key [api_key]</code> - Thêm API key<br/>` +
             `• <code>trạng thái</code> hoặc <code>status</code> - Kiểm tra trạng thái đăng nhập<br/>` +
             `• <code>giúp</code> hoặc <code>help</code> - Hiển thị hướng dẫn này<br/>` +
             `• <code>xóa</code> hoặc <code>clear</code> - Xóa lịch sử chat<br/>` +
             `💡 <strong>Ví dụ:</strong><br/>` +
             `• <code>dịch Hello world</code><br/>` +
             `• <code>thêm truyện Truyện kiếm hiệp</code><br/>` +
             `• <code>thêm chương Chương 1: Khởi đầu</code><br/>` +
             `• <code>thêm key AIzaSyC...</code><br/>`;

    case 'clear':
      return '🧹 Lịch sử chat đã được xóa!';

    case 'status':
      if (isLoggedIn) {
        return `✅ <strong>Trạng thái:</strong> Đã đăng nhập\n🔑 <strong>API Key:</strong> ${getAuthToken() ? 'Đã có' : 'Chưa có'}`;
      } else {
        return `❌ <strong>Trạng thái:</strong> Chưa đăng nhập\n💡 <strong>Gợi ý:</strong> Vui lòng đăng nhập để sử dụng đầy đủ tính năng`;
      }

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
