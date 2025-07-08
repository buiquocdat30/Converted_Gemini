// test_error_flow.js
// Script kiểm tra tự động luồng lỗi từ BE lên FE
import axios from "axios";

async function testErrorFlow() {
  const token = localStorage.getItem("auth-token");
  if (!token) {
    console.error("❌ Không tìm thấy token xác thực. Hãy đăng nhập trước khi test.");
    alert("Không tìm thấy token xác thực. Hãy đăng nhập trước khi test.");
    return;
  }
  // Nhập key lỗi hoặc model lỗi để test
  const ERROR_KEY = "KEY_LỖI_HOẶC_HẾT_QUOTA"; // Thay bằng key lỗi thực tế
  const ERROR_MODEL = "model_sai_ten"; // Hoặc dùng model lỗi
  const requestData = {
    chapters: [{
      title: "Chương lỗi test",
      content: "Nội dung test lỗi quota hoặc model",
      chapterNumber: 1
    }],
    model: ERROR_MODEL, // Hoặc "gemini-2.0-flash"
    storyId: "test-story-id",
    userKeys: [ERROR_KEY]
  };

  try {
    const res = await axios.post("http://localhost:8000/translate", requestData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chapterData = res?.data?.chapters?.[0];
    if (!chapterData) {
      console.error("❌ Không nhận được dữ liệu chương trong response");
      alert("Không nhận được dữ liệu chương trong response");
      return;
    }
    if (chapterData.hasError || chapterData.status === 'FAILED' || chapterData.translationError) {
      console.error("[TEST][FE] Nhận chương lỗi từ BE:", chapterData);
      alert("FE đã nhận chương lỗi từ BE:\n" + JSON.stringify(chapterData, null, 2));
    } else {
      console.log("[TEST][FE] Nhận chương thành công:", chapterData);
      alert("FE nhận chương thành công (không có lỗi):\n" + JSON.stringify(chapterData, null, 2));
    }
  } catch (error) {
    console.error("[TEST][FE] Lỗi khi gọi API:", error);
    alert("Lỗi khi gọi API: " + (error.message || error));
  }
}

// Để chạy: import file này vào FE hoặc copy vào console FE sau khi đăng nhập
// testErrorFlow();

export default testErrorFlow; 