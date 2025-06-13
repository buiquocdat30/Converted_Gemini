// hàm dịch theo từng chương
import axios from "axios";
import { toast } from "react-hot-toast";

export const translateSingleChapter = async ({
  index,
  chapters,
  apiKey,
  model,
  setProgress,
  setResults,
  setErrorMessages,
  setTranslatedCount,
  setTotalProgress,
  onTranslationResult,
  onSelectChapter,
}) => {
  const chapter = chapters[index];
  onSelectChapter?.(index); // 👈 gọi để hiển thị chương trước khi dịch

  console.log("📌 chương hiện tại:", chapter ? ("OK", chapter) : "MISSING");

  if (!apiKey && index >= 2) {
    alert(
      "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
    );
    return;
  }

  // Bắt đầu tiến độ giả lập
  let fakeProgress = 0;
  const interval = setInterval(() => {
    fakeProgress += 5;
    if (fakeProgress < 95) {
      setProgress((prev) => ({ ...prev, [index]: fakeProgress }));
    } else {
      clearInterval(interval);
    }
  }, 200); // mỗi 200ms tăng 5%

  try {
    console.log('chapter:', chapter)
    console.log('apiKey:', apiKey)
    console.log('model:', model)
    
    // Format dữ liệu gửi đi
    const requestData = {
      chapters: [{
        title: chapter.chapterName || `Chương ${index + 1}`,
        content: chapter.rawText || chapter.content,
        chapterNumber: chapter.chapterNumber || index + 1
      }],
      userKey: apiKey || "",
      model: model,
    };

    console.log('Request data:', requestData);
    
    const token = localStorage.getItem("auth-token");
    const res = await axios.post("http://localhost:8000/translate/queue", requestData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Log toàn bộ response để debug
    console.log("Response data translateSingleChapter:", res.data);

    // Lấy dữ liệu từ chapter đầu tiên trong mảng chapters
    const chapterData = res?.data?.chapters?.[0];
    if (!chapterData) {
      console.error("❌ Không tìm thấy dữ liệu chương trong response");
      return null;
    }

    // Log chi tiết dữ liệu chương
    console.log("📖 Dữ liệu chương:", {
      chapterNumber: chapterData.chapterNumber,
      title: chapterData.title,
      translatedTitle: chapterData.translatedTitle,
      content: chapterData.content?.substring(0, 100) + "...",
      translatedContent: chapterData.translatedContent?.substring(0, 100) + "...",
      status: chapterData.status
    });

    // Cập nhật state với dữ liệu đã dịch
    setResults((prev) => ({
      ...prev,
      [index]: {
        translatedContent: chapterData.translatedContent || "",
        translatedTitle: chapterData.translatedTitle || "",
        chapterName: chapterData.translatedTitle || chapter.chapterName
      }
    }));

    // Gọi callback để thông báo kết quả dịch
    onTranslationResult?.(index, chapterData.translatedContent, chapterData.translatedTitle);

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

    // Trả về dữ liệu đã dịch
    return {
      chapterNumber: chapterData.chapterNumber,
      title: chapterData.title,
      translatedTitle: chapterData.translatedTitle || "",
      content: chapterData.content || "",
      translatedContent: chapterData.translatedContent || "",
      status: chapterData.status
    };
  } catch (error) {
    console.error("Lỗi khi dịch chương:", error);
    console.error("Error response:", error.response?.data);

    let errorMessage = "❌ Lỗi khi dịch chương: " + (chapter.chapterName || `Chương ${index + 1}`);
    let errorDetails = null;

    // Xử lý các loại lỗi khác nhau
    if (error.response?.data?.error) {
      try {
        const errorData = JSON.parse(error.response.data.error);
        errorMessage = errorData.message;
        errorDetails = errorData.details;

        // Xử lý các mã lỗi cụ thể
        switch (errorData.code) {
          case "KEY_EXHAUSTED":
            if (errorDetails.availableModels?.length > 0) {
              errorMessage += `\n\nCác model khác có thể sử dụng: ${errorDetails.availableModels.join(", ")}`;
            }
            break;
          case "DEFAULT_KEY_EXHAUSTED":
            errorMessage += "\n\nVui lòng thêm key của bạn hoặc thử lại sau";
            break;
          case "KEY_NOT_FOUND":
            errorMessage += "\n\nVui lòng kiểm tra lại key của bạn";
            break;
        }
      } catch (e) {
        // Nếu không parse được JSON, sử dụng message gốc
        errorMessage = error.response.data.error;
      }
    } else if (error.message?.includes("API key not valid")) {
      errorMessage = "❌ API key không hợp lệ. Vui lòng kiểm tra lại key của bạn.";
    }

    setErrorMessages((prev) => ({ ...prev, [index]: errorMessage }));
    
    // Hiển thị thông báo lỗi với chi tiết
    if (errorDetails?.suggestion) {
      toast.error(
        <div>
          <p>{errorMessage}</p>
          <p style={{ marginTop: '8px', color: '#666' }}>{errorDetails.suggestion}</p>
        </div>
      );
    } else {
      toast.error(errorMessage);
    }
  } finally {
    clearInterval(interval);
  }
};
