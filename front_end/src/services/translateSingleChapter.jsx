// hàm dịch theo từng chương
import axios from "axios";
import { toast } from "react-hot-toast";
import { SOCKET_URL } from '../config/config';

export const translateSingleChapter = async ({
  index,
  chapters,
  apiKey,
  model,
  storyId,
  setProgress,
  setResults,
  setErrorMessages,
  setTranslatedCount,
  setTotalProgress,
  onTranslationResult,
  onSelectChapter,
  onComplete,
}) => {
  const chapter = chapters[index];
  onSelectChapter?.(index); // 👈 gọi để hiển thị chương trước khi dịch

  if (!apiKey && index >= 2) {
    toast.error(
      "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
    );
    return;
  }

  const startTime = Date.now(); // Bắt đầu tính thời gian

  try {
    console.log("📌 chương hiện tại:", chapter ? ("OK", chapter) : "MISSING");
    console.log("apiKey:", apiKey);
    console.log("model:", model);

    // Format dữ liệu gửi đi - hỗ trợ cả single key và multiple keys
    const modelToSend = (model && typeof model === 'object' && model.value) ? model.value : model;
    console.log('[translateSingleChapter] Gửi model lên backend:', modelToSend);
    const requestData = {
      chapters: [
        {
          title: chapter.chapterName || `Chương ${index + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || index + 1,
        },
      ],
      model: modelToSend,
      storyId: storyId,
    };
    // Chỉ thêm userKeys nếu apiKey hợp lệ
    if (
      apiKey &&
      !(Array.isArray(apiKey) && apiKey.length === 0) &&
      apiKey !== ""
    ) {
      requestData.userKeys = Array.isArray(apiKey) ? apiKey : [apiKey];
    }

    console.log("Request data:", requestData);

    const token = localStorage.getItem("auth-token");
    const res = await axios.post(
      SOCKET_URL + "/translate",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Log toàn bộ response để debug
    console.log("Response data translateSingleChapter:", res.data);

    // Không kiểm tra kết quả dịch trong response nữa, chỉ log và return
    // FE sẽ nhận kết quả dịch qua socket (chapterTranslated)
    return res.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(
      `❌ Lỗi dịch chương ${index + 1} sau ${duration.toFixed(2)}s:`,
      error
    );
    setErrorMessages((prev) => ({
      ...prev,
      [index]: `❌ Lỗi khi dịch: ${error.message}`,
    }));
    onComplete?.(duration); // Vẫn gọi callback với thời gian lỗi
    return null;
  }
};
