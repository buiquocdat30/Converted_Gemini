import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { translateChapters } from "../../services/translateChapters";
import { translateSingleChapter } from "../../services/translateSingleChapter";
import "./ChapterList.css";

const ChapterList = ({
  chapters,
  apiKey,
  model,
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
  const isStoppedRef = useRef(false); //dừng dịch

  //khu vực phân Trang
  const [currentPage, setCurrentPage] = useState(1);
  const chaptersPerPage = 10;

  const totalPages = Math.ceil(chapters.length / chaptersPerPage);

  const startIdx = (currentPage - 1) * chaptersPerPage;
  const endIdx = startIdx + chaptersPerPage;
  const currentChapters = chapters.slice(startIdx, endIdx);
  const [jumpIndex, setJumpIndex] = useState("");

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
        model,
        setResults,
        setTranslatedCount,
        setTotalProgress,
        setErrorMessages,
        onTranslationResult,
        isStopped: isStoppedRef.current,
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
      model,
      setProgress,
      setResults,
      setErrorMessages,
      setTranslatedCount,
      setTotalProgress,
      onTranslationResult,
      onSelectChapter,
      isStopped: isStoppedRef.current,
    });
  };

  // hàm nhảy tới chương
  const handleJumpToChapter = (type) => {
    const num = parseInt(jumpIndex);
    if (isNaN(num)) return;

    if (type === "chapter" && num >= 1 && num <= chapters.length) {
      // 👉 Nếu nhảy tới chương hợp lệ
      const targetIndex = num - 1;
      const newPage = Math.ceil(num / chaptersPerPage);
      setCurrentPage(newPage);
      onSelectChapter(targetIndex);
    } else if (type === "page" && num >= 1 && num <= totalPages) {
      // 👉 Nếu nhảy tới trang hợp lệ
      setCurrentPage(num);
    }

    setJumpIndex(""); // ✅ Reset input sau khi nhảy
  };

  return (
    <div className="chapter-list">
      <h3>📚 Danh sách chương ({chapters.length})</h3>
      <ul>
        {currentChapters.map((ch, idxOnPage) => {
          const idx = startIdx + idxOnPage;
          const isTranslated = !!results[idx];
          return (
            <li key={idx}>
              <div className="chapter-item">
                <div className="chapter-header">
                  <p>Chương {idx + 1}:</p>
                  <strong>
                    {isTranslated ? ch.translatedTitle : ch.title}
                  </strong>
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
                    className={`translate-button ${
                      isTranslated ? "hidden" : ""
                    }`}
                  >
                    📝 Dịch
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
      {/* trang chứa các chương khi vượt quá 10 chương */}
      <div className="pagination">
        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
          ⏮️ Trang đầu
        </button>

        {currentPage > 3 && (
          <>
            <button onClick={() => setCurrentPage(1)}>1</button>
            {currentPage > 4 && <span>...</span>}
          </>
        )}

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (pageNum) =>
              pageNum === 1 ||
              pageNum === totalPages ||
              Math.abs(pageNum - currentPage) <= 1
          )
          .map((pageNum) => (
            <button
              key={pageNum}
              className={currentPage === pageNum ? "active" : ""}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}

        {currentPage < totalPages - 2 && (
          <>
            {currentPage < totalPages - 3 && <span>...</span>}
            <button onClick={() => setCurrentPage(totalPages)}>
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          ⏭️ Trang cuối
        </button>
      </div>

      {/* nhảy tới trang */}
      <div className="jump-to-page">
        <label>🔍 Nhảy tới trang:</label>
        <input
          type="number"
          min={1}
          max={totalPages}
          placeholder="Nhập"
          value={jumpIndex}
          onChange={(e) => setJumpIndex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJumpToChapter("page");
          }}
        />
        <button onClick={() => handleJumpToChapter("page")}>
          ➡️ Đi tới trang
        </button>
      </div>
      {/* nhảy tới chương */}
      <div className="jump-to-chapter">
        <label>🔍 Nhảy tới chương:</label>
        <input
          type="number"
          min={1}
          max={chapters.length}
          placeholder="Nhập"
          value={jumpIndex}
          onChange={(e) => setJumpIndex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJumpToChapter("chapter");
          }}
        />
        <button onClick={() => handleJumpToChapter("chapter")}>
          ➡️ Đi tới chương
        </button>
      </div>

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
            "🔁 Dịch lại toàn bộ chương"
          ) : (
            "📖 Dịch toàn bộ chương"
          )}
        </button>
        <button
          className="stop-translate-button"
          onClick={() => (isStoppedRef.current = true)}
          disabled={!isTranslatingAll}
        >
          🛑 Dừng dịch
        </button>
      </div>
      {totalProgress !== 0 && (
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${totalProgress}%` }}
          ></div>
        </div>
      )}
      {errorMessages.general && (
        <div className="general-error">
          <p>{errorMessages.general}</p>
        </div>
      )}
    </div>
  );
};

export default ChapterList;
