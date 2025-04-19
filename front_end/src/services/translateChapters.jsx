//hàm dịch toàn bộ chương
import axios from "axios";

export const translateChapters = async ({
  chaptersToTranslate,
  chapters,
  apiKey,
  setResults,
  setTranslatedCount,
  setTotalProgress,
  setErrorMessages,
  onTranslationResult,
}) => {
  try {
    const res = await axios.post("http://localhost:8000/api/translate", {
      chapters: chaptersToTranslate,
      key: apiKey || "",
    });

    const translatedChapters = res?.data?.chapters;

    if (Array.isArray(translatedChapters)) {
      const newResults = {};
      const newErrors = {};

      translatedChapters.forEach((chapter, idx) => {
        const realIndex = chaptersToTranslate[idx].originalIndex;
        const translated = chapter.translated || "";
        const translatedTitle = chapter.translatedTitle || "";

        newResults[realIndex] = {translated,translatedTitle};
        newErrors[realIndex] = null;

        console.log('kết quả dịch toàn bộ chương á',newResults)
        onTranslationResult(realIndex, translated,translatedTitle);

        setTranslatedCount((prevCount) => {
          const newCount = prevCount + 1;
          const percent = Math.floor((newCount / chapters.length) * 100);
          setTotalProgress(percent);
          return newCount;
        });
      });

      setResults((prev) => ({ ...prev, ...newResults }));
      setErrorMessages((prev) => ({
        ...prev,
        ...newErrors,
        general: null,
      }));
    }
  } catch (error) {
    console.error("❌ Lỗi khi dịch chương:", error);
    setErrorMessages((prev) => ({
      ...prev,
      general: "❌ Lỗi khi dịch tất cả các chương.",
    }));
    alert("❌ Lỗi khi dịch tất cả các chương.");
  }
};
