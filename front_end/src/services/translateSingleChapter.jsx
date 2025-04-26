// hàm dịch theo từng chương
import axios from "axios";

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
    const res = await axios.post("http://localhost:8000/api/translate", {
      chapters: [chapter],
      key: apiKey || "",
      model: model,
    });

    console.log("in tạm chapers:", res.data.chapters);

    const translated = res?.data?.chapters?.[0]?.translated || "";
    console.log("📌 dịch hiện tại:", translated || "MISSING");

    const translatedTitle = res?.data?.chapters?.[0]?.translatedTitle || "";
    console.log("📌 title hiện tại:", translatedTitle || "MISSING");
    setResults((prev) => ({
      ...prev,
      [index]: { translated, translatedTitle },
    }));

    onTranslationResult(index, translated, translatedTitle);
    console.log("📌 Dịch hiện tại:", onTranslationResult);

    setProgress((prev) => ({ ...prev, [index]: 100 }));
    setTranslatedCount((prev) => prev + 1);

    setErrorMessages((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });

    const percent = Math.floor(((index + 1) / chapters.length) * 100);
    setTotalProgress(percent);
  } catch (error) {
    console.error("Lỗi khi dịch chương:", error);

    let errorMessage = "❌ Lỗi khi dịch chương: " + chapter.title;
    if (error.response?.data?.message) {
      errorMessage += " - " + error.response.data.message;
    }

    setErrorMessages((prev) => ({ ...prev, [index]: errorMessage }));
    alert(errorMessage);
  } finally {
    clearInterval(interval);
  }
};
