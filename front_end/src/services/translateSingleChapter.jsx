// hàm dịch theo từng chương
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from '../config/config';

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
  console.log("📖 [FE] ===== BẮT ĐẦU DỊCH CHƯƠNG =====");
  console.log(`[FE] 📝 Dịch chương ${index + 1}:`, {
    chapterNumber: chapters[index]?.chapterNumber,
    title: chapters[index]?.chapterName,
    contentLength: chapters[index]?.rawText?.length || chapters[index]?.content?.length || 0,
    storyId: storyId,
    hasApiKey: !!apiKey,
    model: model?.name || model
  });

  const chapter = chapters[index];
  onSelectChapter?.(index); // 👈 gọi để hiển thị chương trước khi dịch

  if (!apiKey && index >= 2) {
    console.log("[FE] ❌ Không có API key cho chương > 2");
    toast.error(
      "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
    );
    return;
  }

  const startTime = Date.now(); // Bắt đầu tính thời gian

  try {
    console.log("[FE] 📋 Thông tin chương:", {
      chapter: chapter ? "OK" : "MISSING",
      chapterNumber: chapter?.chapterNumber,
      title: chapter?.chapterName,
      contentLength: chapter?.rawText?.length || chapter?.content?.length || 0
    });
    console.log("[FE] 🔑 API Key:", apiKey ? "Có" : "Không");
    console.log("[FE] 🤖 Model:", model?.name || model);

    // Format dữ liệu gửi đi - gửi toàn bộ model object
    const modelToSend = model; // Gửi toàn bộ model object
    console.log('[FE] 📤 Gửi model object lên backend:', modelToSend);
    
    const requestData = {
      chapters: [
        {
          title: chapter.chapterName || `Chương ${index + 1}`,
          content: chapter.rawText || chapter.content,
          chapterNumber: chapter.chapterNumber || index + 1,
        },
      ],
      model: modelToSend, // Gửi toàn bộ model object
      storyId: storyId,
    };
    
    // Chỉ thêm userKeys nếu apiKey hợp lệ
    if (
      apiKey &&
      !(Array.isArray(apiKey) && apiKey.length === 0) &&
      apiKey !== ""
    ) {
      requestData.userKeys = Array.isArray(apiKey) ? apiKey : [apiKey];
      console.log(`[FE] 🔑 Thêm ${requestData.userKeys.length} API keys vào request`);
    } else {
      console.log("[FE] 🔑 Không có API key, sẽ dùng default key");
    }

    console.log("[FE] 📤 Request data:", {
      chaptersCount: requestData.chapters.length,
      model: requestData.model,
      storyId: requestData.storyId,
      hasUserKeys: !!requestData.userKeys,
      userKeysCount: requestData.userKeys?.length || 0
    });

    console.log("[FE] 🌐 Gửi request đến backend...");
    const token = localStorage.getItem("auth-token");
    const res = await axios.post(
      API_URL + "/translate",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Log toàn bộ response để debug
    console.log("[FE] 📥 Response từ backend:", {
      success: res.data.success,
      message: res.data.message,
      hasChapters: !!res.data.chapters,
      chaptersCount: res.data.chapters?.length || 0
    });

    // Xử lý kết quả dịch từ response
    if (res.data.success && res.data.chapters && res.data.chapters.length > 0) {
      const chapterData = res.data.chapters[0];
      const translated = chapterData.translatedContent || "";
      const translatedTitle = chapterData.translatedTitle || "";
      const duration = parseFloat(chapterData.timeTranslation || 0); // Đảm bảo là number
      
      console.log("[FE] ✅ Nhận được kết quả dịch:", {
        hasTranslatedTitle: !!translatedTitle,
        hasTranslatedContent: !!translated,
        titleLength: translatedTitle?.length || 0,
        contentLength: translated?.length || 0,
        duration: duration,
        durationType: typeof duration
      });

      // Cập nhật kết quả dịch
      setResults((prev) => ({
        ...prev,
        [index]: {
          translated,
          translatedTitle,
          chapterName: translatedTitle || chapter.chapterName,
          duration: duration
        },
      }));

      // Gọi callback với kết quả
      onTranslationResult?.(index, translated, translatedTitle, duration);
      
      // Gọi onComplete callback để dừng progress
      onComplete?.(duration);
      
      console.log("[FE] ✅ Đã cập nhật kết quả dịch thành công");
    } else {
      console.warn("[FE] ⚠️ Không có kết quả dịch trong response");
      onComplete?.(0, new Error("Không có kết quả dịch"));
    }

    console.log("📖 [FE] ===== HOÀN THÀNH GỬI REQUEST =====");
    return res.data;
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(
      `❌ [FE] Lỗi dịch chương ${index + 1} sau ${duration.toFixed(2)}s:`,
      error
    );
    setErrorMessages((prev) => ({
      ...prev,
      [index]: `❌ Lỗi khi dịch: ${error.message}`,
    }));
    onComplete?.(duration); // Vẫn gọi callback với thời gian lỗi
    console.log("📖 [FE] ===== LỖI DỊCH CHƯƠNG =====");
    return null;
  }
};
