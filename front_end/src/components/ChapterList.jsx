import React, { useState, useEffect } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import "../css/ChapterList.css";

const ChapterList = ({
  chapters,
  apiKey,
  onTranslationResult,
  onSelectChapter,
}) => {
  const [results, setResults] = useState({});
  const [errorMessages, setErrorMessages] = useState({}); // Thêm trạng thái lỗi
  const [translatedCount, setTranslatedCount] = useState(0); //chương đã dịch
  const [progress, setProgress] = useState({}); // Lưu tiến độ mỗi chương
  const [totalProgress, setTotalProgress] = useState(0); // Lưu tiến độ tổng
  const [isTranslateAllDisabled, setIsTranslateAllDisabled] = useState(false); //Disable nút dịch tổng
  const [isTranslatingAll, setIsTranslatingAll] = useState(false); //Nút quay quay loading

  //đếm chương
  const canTranslate = (index) => {
    if (results[index]) return false; // đã dịch rồi
    if (!apiKey && translatedCount >= 2) return false; // vượt giới hạn
    return true;
  };

  useEffect(() => {
    const maxChapters = apiKey ? chapters.length : 2;
    if (translatedCount >= maxChapters) {
      setIsTranslateAllDisabled(true); // ✅ Disable nút nếu đã dịch đủ
    }
  }, [translatedCount, chapters, apiKey]);

  // Hàm dịch tất cả các chương
  const translateAll = async () => {
    setIsTranslateAllDisabled(true); // ✅ Disable ngay khi bắt đầu
    console.time("⏱️ Thời gian dịch toàn bộ");

    setIsTranslatingAll(true); // ✅ Bắt đầu loading
    const maxChapters = apiKey ? chapters.length : 2;

    if (!apiKey && chapters.length > 2) {
      alert(
        "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
      );
      setIsTranslateAllDisabled(false); // ✅ Mở lại nếu chưa được dịch
      setIsTranslatingAll(false); // ❌ Dừng loading nếu không dịch
      return;
    }

    const chaptersToTranslate = chapters
      .map((chapter, index) => ({ ...chapter, originalIndex: index }))
      .filter((_, index) => !results[index])
      .slice(0, maxChapters - translatedCount); // chỉ dịch thêm nếu chưa đủ

    if (chaptersToTranslate.length === 0) {
      alert("Tất cả các chương đã được dịch.");
      setTotalProgress(100);
      setIsTranslateAllDisabled(true);
      setIsTranslatingAll(false); // ✅ Dừng loading
      return;
    }

    try {
      const res = await axios.post("http://localhost:8000/api/translate", {
        chapters: chaptersToTranslate,
        key: apiKey || "",
      });

      // ✅ Bảo vệ an toàn trước khi truy cập
      const translatedChapters = res?.data?.chapters;
      if (Array.isArray(translatedChapters)) {
        // Lưu kết quả dịch cho tất cả các chương
        const newResults = {};
        const newErrors = {};
        let count = 0;

        // Gửi kết quả dịch về cho component cha
        translatedChapters.forEach((chapter, idx) => {
          const realIndex = chaptersToTranslate[idx].originalIndex;
          newResults[realIndex] = chapter.translated || "";
          newErrors[realIndex] = null;
          onTranslationResult(realIndex, chapter.translated);
          count++;

          // Cập nhật tiến độ tổng sau khi mỗi chương được dịch
          setTranslatedCount((prevCount) => {
            const newCount = prevCount + 1;
            const percent = Math.floor((newCount / chapters.length) * 100);
            setTotalProgress(percent);
            return newCount;
          });
        });

        setResults((prev) => ({ ...prev, ...newResults }));
        setTranslatedCount((prev) => prev + count);
        setErrorMessages((prev) => ({
          ...prev,
          ...newErrors,
          general: null, // ✅ Xóa lỗi tổng thể nếu có
        }));
      }
    } catch (error) {
      console.error("Lỗi khi dịch chương:", error); // In lỗi chi tiết ra console
      setErrorMessages((prev) => ({
        ...prev,
        general: "❌ Lỗi khi dịch tất cả các chương.",
      }));
      alert("Lỗi khi dịch tất cả các chương.");
      // ✅ Mở lại nếu bị lỗi
      setIsTranslateAllDisabled(false);
    } finally {
      console.timeEnd("⏱️ Thời gian dịch toàn bộ");
      setIsTranslatingAll(false); // ✅ Dừng loading
    }
  };

  // Hàm dịch từng chương
  const translate = async (index) => {
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
      });

      const translated = res?.data?.chapters?.[0]?.translated || "";
      console.log("📌 dịch hiện tại:", translated || "MISSING");

      // Cập nhật kết quả dịch
      setResults((prev) => ({
        ...prev,
        [index]: translated,
      }));
      onTranslationResult(index, translated);
      console.log(
        "📌 Dịch hiện tại:",
        onTranslationResult ? "OK ✅" : "MISSING ❌"
      );

      // Khi dịch xong: full 100%
      setProgress((prev) => ({ ...prev, [index]: 100 }));
      setTranslatedCount((prev) => prev + 1);

      setErrorMessages((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });

      // Cập nhật tiến độ tổng
      const percent = Math.floor(((index + 1) / chapters.length) * 100);
      setTotalProgress(percent);
    } catch (error) {
      console.error("Lỗi khi dịch chương:", error); // In lỗi chi tiết ra console

      let errorMessage = "❌ Lỗi khi dịch chương: " + chapter.title;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage += " - " + error.response.data.message; // Thêm thông báo lỗi từ backend
      }

      setErrorMessages((prev) => ({ ...prev, [index]: errorMessage })); // Lưu lỗi

      alert(errorMessage);
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="chapter-list">
      <h3>📚 Danh sách chương ({chapters.length})</h3>
      <ul>
        {chapters.map((ch, idx) => {
          const isTranslated = !!results[idx];
          const disableTranslate =
            isTranslated || (!apiKey && translatedCount >= 2);

          return (
            <li key={idx}>
              <div className="chapter-item">
                <div className="chapter-header">
                  <strong>{ch.title}</strong>
                  {isTranslated && (
                    <span className="translated-label">✅ Đã dịch</span>
                  )}
                  <button
                    onClick={() => translate(idx)}
                    disabled={
                      isTranslated ||
                      (!apiKey && translatedCount >= 2) ||
                      isTranslatingAll
                    }
                    className="translate-button"
                  >
                    Dịch
                  </button>
                </div>

                {errorMessages[idx] && (
                  <div className="error-message">
                    <p>{errorMessages[idx]}</p>
                  </div>
                )}

                {progress[idx] !== undefined && !isTranslatingAll && (
                  <div className="chapter-progress-bar-container">
                    <div
                      className="chapter-progress-bar"
                      style={{ width: `${progress[idx]}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="translate-all-container">
        <button
          className="translate-all-button"
          onClick={translateAll}
          disabled={isTranslateAllDisabled || isTranslatingAll}
        >
          {isTranslatingAll ? (
            <span>
              <FontAwesomeIcon icon={faSpinner} spin /> Đang dịch...
            </span>
          ) : (
            "Dịch toàn bộ chương"
          )}
        </button>

        {totalProgress !== 0 && (
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {errorMessages.general && (
        <div className="general-error">
          <p>{errorMessages.general}</p>
        </div>
      )}
    </div>
  );
};

export default ChapterList;
