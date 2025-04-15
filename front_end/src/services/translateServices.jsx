// hàm dịch toàn bộ chương (sử dụng SSE)
import { EventSourcePolyfill } from "event-source-polyfill";

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
  return new Promise((resolve, reject) => {
    try {
      const eventSource = new EventSourcePolyfill(
        "http://localhost:8000/api/translate",
        {
          headers: {
            "Content-Type": "application/json",
          },
          payload: JSON.stringify({
            chapters: chaptersToTranslate,
            key: apiKey || "",
          }),
        }
      );

      // 👇 Lắng nghe sự kiện khi mỗi chương hoàn tất (chapterDone từ BE)
      eventSource.addEventListener("chapterDone", (event) => {
        const data = JSON.parse(event.data);
        const { chapterIndex, translated } = data;

        const originalIndex =
          chaptersToTranslate[chapterIndex]?.originalIndex ?? chapterIndex;

        setResults((prev) => ({
          ...prev,
          [originalIndex]: translated,
        }));

        onTranslationResult(originalIndex, translated);

        setTranslatedCount((prev) => {
          const newCount = prev + 1;
          const percent = Math.floor((newCount / chapters.length) * 100);
          setTotalProgress(percent);
          return newCount;
        });

        setErrorMessages((prev) => ({
          ...prev,
          [originalIndex]: null,
          general: null,
        }));
      });

      // 👇 Lắng nghe khi toàn bộ dịch xong
      eventSource.addEventListener("done", () => {
        eventSource.close();
        resolve();
      });

      e; // 👇 Bắt lỗi SSE
      eventSource.onerror = (event) => {
        console.error("❌ Lỗi SSE dịch chương:", event);
        setErrorMessages((prev) => ({
          ...prev,
          general: "❌ Lỗi khi dịch tất cả các chương.",
        }));
        eventSource.close();
        reject(event);
      };
    } catch (error) {
      console.error("❌ Lỗi khởi tạo SSE:", error);
      setErrorMessages((prev) => ({
        ...prev,
        general: "❌ Lỗi khi dịch tất cả các chương.",
      }));
      reject(error);
    }
  });
};

// hàm dịch theo từng chương (giữ nguyên axios)
import axios from "axios";

export const translateSingleChapter = async ({
  index,
  chapters,
  apiKey,
  setProgress,
  setResults,
  setErrorMessages,
  setTranslatedCount,
  setTotalProgress,
  onTranslationResult,
  onSelectChapter,
}) => {
  const chapter = chapters[index];
  onSelectChapter?.(index);

  if (!apiKey && index >= 2) {
    alert(
      "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
    );
    return;
  }

  let fakeProgress = 0;
  const interval = setInterval(() => {
    fakeProgress += 5;
    if (fakeProgress < 95) {
      setProgress((prev) => ({ ...prev, [index]: fakeProgress }));
    } else {
      clearInterval(interval);
    }
  }, 200);

  try {
    console.log("✅ gọi API translate");
    const res = await axios.post("http://localhost:8000/api/translate", {
      chapters: [chapter],
      key: apiKey || "",
    });

    const translated = res?.data?.chapters?.[0]?.translated || "";

    setResults((prev) => ({
      ...prev,
      [index]: translated,
    }));

    onTranslationResult(index, translated);

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
