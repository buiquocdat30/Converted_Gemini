// hàm dịch theo từng chương
import axios from "axios";
import { toast } from "react-hot-toast";

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
    alert(
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
    const requestData = {
      chapters: [
        {
          title: chapter.chapterName || `Chương ${index + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || index + 1,
        },
      ],
      model: model,
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
      "http://localhost:8000/translate",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Log toàn bộ response để debug
    console.log("Response data translateSingleChapter:", res.data);

    // Lấy dữ liệu từ chapter đầu tiên trong mảng chapters
    const chapterData = res?.data?.chapters?.[0];
    if (!chapterData) {
      console.error("❌ Không tìm thấy dữ liệu chương trong response");
      return null;
    }

    // Sử dụng thời gian dịch từ backend response
    const duration = chapterData.timeTranslation || 0;
    console.log(
      `⏱️ Thời gian dịch chương ${index + 1}: ${duration.toFixed(2)}s`
    );

    // Log chi tiết dữ liệu chương
    console.log("📖 Dữ liệu chương:", {
      chapterNumber: chapterData.chapterNumber,
      title: chapterData.title,
      translatedTitle: chapterData.translatedTitle,
      content: chapterData.content?.substring(0, 100) + "...",
      translatedContent:
        chapterData.translatedContent?.substring(0, 100) + "...",
      status: chapterData.status,
      duration: duration.toFixed(2) + "s",
    });

    // Cập nhật state với dữ liệu đã dịch
    setResults((prev) => ({
      ...prev,
      [index]: {
        translatedContent: chapterData.translatedContent || "",
        translatedTitle: chapterData.translatedTitle || "",
        chapterName: chapterData.translatedTitle || chapter.chapterName,
        duration: duration, // Thêm thời gian dịch vào kết quả
      },
    }));

    // Gọi callback để thông báo kết quả dịch
    onTranslationResult?.(
      index,
      chapterData.translatedContent,
      chapterData.translatedTitle,
      duration
    );

    // Cập nhật tiến độ
    setProgress((prev) => ({ ...prev, [index]: 100 }));
    setTranslatedCount((prev) => prev + 1);
    setErrorMessages((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });

    // Cập nhật tiến độ tổng thể
    const percent = Math.floor(((index + 1) / chapters.length) * 100);
    setTotalProgress(percent);

    // Gọi callback khi hoàn thành
    onComplete?.(duration);

    // Trả về dữ liệu đã dịch
    return {
      chapterNumber: chapterData.chapterNumber,
      title: chapterData.title,
      translatedTitle: chapterData.translatedTitle || "",
      content: chapterData.content || "",
      translatedContent: chapterData.translatedContent || "",
      status: chapterData.status,
      duration: duration,
    };
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
