import React, { useState, useEffect } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { translateChapters } from "../services/translateChapters";
import { translateSingleChapter } from "../services/translateSingleChapter";
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
  const [hasTranslatedAll, setHasTranslatedAll] = useState(false); //đã dịch xong

  //đếm chương
  const canTranslate = (index) => {
    if (results[index]) return false; // đã dịch rồi
    if (!apiKey && translatedCount >= 2) return false; // vượt giới hạn
    return true;
  };

  useEffect(() => {
    if (apiKey) {
      setIsTranslateAllDisabled(false); // ✅ Đã có key thì luôn bật nút
    } else {
      setIsTranslateAllDisabled(translatedCount >= 2); // ✅ Chưa có key thì giới hạn 2 chương
    }
  }, [translatedCount, chapters.length, apiKey]);

  // Hàm dịch tất cả các chương
  const translateAll = async () => {
    setIsTranslateAllDisabled(true); // ✅ Disable ngay khi bắt đầu
    console.time("⏱️ Thời gian dịch toàn bộ");

    setIsTranslatingAll(true); // ✅ Bắt đầu loading
    const maxChapters = apiKey ? chapters.length : 2;

    if (!apiKey) {
      const remainingFree = 2 - translatedCount;
      if (remainingFree <= 0) {
        alert(
          "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
        );
        setIsTranslateAllDisabled(true);
        setIsTranslatingAll(false);
        return;
      }
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
      await translateChapters({
        chaptersToTranslate,
        chapters,
        apiKey,
        setResults,
        setTranslatedCount,
        setTotalProgress,
        setErrorMessages,
        onTranslationResult,
      });
    } catch (error) {
      console.error("Lỗi khi dịch chương:", error);
      setErrorMessages((prev) => ({
        ...prev,
        general: "❌ Lỗi khi dịch tất cả các chương.",
      }));
      alert("❌ Lỗi khi dịch tất cả các chương.");
      setIsTranslateAllDisabled(false);
    } finally {
      console.timeEnd("⏱️ Thời gian dịch toàn bộ");
      setIsTranslatingAll(false);
      setHasTranslatedAll(true);
    }
  };

  // Hàm dịch từng chương
  const translate = (index) => {
    translateSingleChapter({
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
    });
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
          onClick={() => {
            if (hasTranslatedAll) {
              const confirmRetry = window.confirm(
                "Bạn có muốn dịch lại toàn bộ chương lần nữa không?"
              );
              if (confirmRetry) {
                translateAll();
              }
            } else {
              translateAll();
            }
          }}
          disabled={isTranslateAllDisabled || isTranslatingAll}
        >
          {isTranslatingAll ? (
            <span>
              <FontAwesomeIcon icon={faSpinner} spin /> Đang dịch...
            </span>
          ) : hasTranslatedAll ? (
            "Dịch lại toàn bộ chương"
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
