import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { translateAllChapters } from "../../services/translateChapters";
import { translateSingleChapter } from "../../services/translateSingleChapter";
import { toast } from "react-hot-toast";
import useTranslationProgress from "../../hook/useTranslationProgress";
import "./ChapterList.css";

const ChapterList = ({
  chapters,
  apiKey,
  model,
  onTranslationResult,
  onSelectChapter,
  onSelectJumbChapter,
  currentIndex = 0,
  storyId,
  deleteChapter,
  onChapterAdded,
  setChapters,
}) => {
  const [results, setResults] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [translatedCount, setTranslatedCount] = useState(0);
  const [isTranslateAllDisabled, setIsTranslateAllDisabled] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [hasTranslatedAll, setHasTranslatedAll] = useState(false);
  const isStoppedRef = useRef(false);
  const [translationDurations, setTranslationDurations] = useState({});
  const [chapterProgresses, setChapterProgresses] = useState({});
  const [chapterTranslatingStates, setChapterTranslatingStates] = useState({});

  // Sử dụng hook cho tiến độ tổng
  const {
    progress: totalProgress,
    isTranslating: isTotalTranslating,
    startProgress: startTotalProgress,
    stopProgress: stopTotalProgress,
    averageTimePerWord,
  } = useTranslationProgress(30);
  console.log("đây là thời gian trung bình dịch từ:", averageTimePerWord);
  // Sử dụng hook cho tiến độ từng chương
  const chapterProgressHooks = useRef({});

  // State cho tiến độ tổng thực tế (bám sát số chương đã dịch)
  const [manualTotalProgress, setManualTotalProgress] = useState(0);

  // Quản lý trạng thái từng chương
  const [chapterStatus, setChapterStatus] = useState({}); // { [index]: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'CANCELLED' | 'FAILED' }

  // Hàm khởi tạo hook tiến độ cho một chương
  const getChapterProgressHook = (index) => {
    if (!chapterProgressHooks.current[index]) {
      // Tạo một object giả lập hook thay vì gọi hook thật
      chapterProgressHooks.current[index] = {
        progress: 0,
        isTranslating: false,
        startProgress: () => {
          setChapterTranslatingStates((prev) => ({ ...prev, [index]: true }));
          setChapterProgresses((prev) => ({ ...prev, [index]: 0 }));

          // Tạo interval để cập nhật tiến độ
          // Mỗi 150ms tăng 1% (6.6% mỗi giây)
          const interval = setInterval(() => {
            setChapterProgresses((prev) => {
              const currentProgress = prev[index] || 0;
              const newProgress = Math.min(currentProgress + 1, 98); // Tăng 1% mỗi lần, dừng ở 98%
              return { ...prev, [index]: newProgress };
            });
          }, 150); // 150ms = 0.15s cho mỗi 1%

          // Lưu interval để có thể clear sau
          chapterProgressHooks.current[index].interval = interval;
        },
        stopProgress: () => {
          setChapterTranslatingStates((prev) => ({ ...prev, [index]: false }));
          setChapterProgresses((prev) => ({ ...prev, [index]: 100 }));

          // Clear interval
          if (chapterProgressHooks.current[index].interval) {
            clearInterval(chapterProgressHooks.current[index].interval);
          }
        },
      };
    }
    return chapterProgressHooks.current[index];
  };

  //khu vực phân Trang
  const [currentPage, setCurrentPage] = useState(1);
  const chaptersPerPage = 10;

  // Sắp xếp chapters theo chapterNumber tăng dần
  const sortedChapters = [...chapters].sort(
    (a, b) => a.chapterNumber - b.chapterNumber
  );
  const totalPages = Math.ceil(sortedChapters.length / chaptersPerPage);

  const startIdx = (currentPage - 1) * chaptersPerPage;
  const endIdx = startIdx + chaptersPerPage;
  const currentChapters = sortedChapters.slice(startIdx, endIdx);

  // Tách riêng state cho nhảy trang và nhảy chương
  const [jumpToPage, setJumpToPage] = useState("");
  const [jumpToChapter, setJumpToChapter] = useState("");

  // Hàm tính số chương dựa trên trang và vị trí
  const calculateChapterNumber = (index) => {
    return startIdx + index + 1;
  };

  const getTranslatedCount = () => {
    // Đếm số chương đã dịch thực tế (results hoặc chapters có translatedContent)
    return chapters.filter(
      (ch, idx) => results[idx] || ch.translatedContent || ch.translated
    ).length;
  };

  const canTranslate = (index) => {
    if (results[index]) return false; // đã dịch rồi
    const translatedSoFar = getTranslatedCount();
    if (!apiKey && translatedSoFar >= 2) return false; // vượt giới hạn
    return true;
  };

  useEffect(() => {
    // Kiểm tra có key khả dụng không (có thể là array hoặc string)
    const hasApiKey = Array.isArray(apiKey) ? apiKey.length > 0 : !!apiKey;

    if (hasApiKey) {
      setIsTranslateAllDisabled(false); // ✅ Đã có key thì luôn bật nút
    } else {
      setIsTranslateAllDisabled(translatedCount >= 2); // ✅ Chưa có key thì giới hạn 2 chương
    }
  }, [translatedCount, chapters.length, apiKey]);

  // Đảm bảo translatedCount không vượt quá 2 nếu không có apiKey
  useEffect(() => {
    const hasApiKey = Array.isArray(apiKey) ? apiKey.length > 0 : !!apiKey;
    if (!hasApiKey) {
      // Đếm số chương đã dịch (results)
      const count = Object.keys(results).length;
      if (count > 2) {
        setTranslatedCount(2);
      } else {
        setTranslatedCount(count);
      }
    }
  }, [apiKey, results]);

  // Callback cho translateAllChapters để điều khiển progress từng chương
  const handleChapterStartProgress = (index) => {
    const chapterHook = getChapterProgressHook(index);
    chapterHook.startProgress();
  };
  const handleChapterStopProgress = (index) => {
    const chapterHook = getChapterProgressHook(index);
    chapterHook.stopProgress();
  };

  // Hàm dịch tất cả các chương
  const translateAll = async () => {
    setIsTranslateAllDisabled(true);
    console.time("⏱️ Thời gian dịch toàn bộ");

    setIsTranslatingAll(true);
    setManualTotalProgress(0); // Reset tiến độ tổng thực tế

    // Kiểm tra có key khả dụng không
    const hasApiKey = Array.isArray(apiKey) ? apiKey.length > 0 : !!apiKey;
    const maxChapters = hasApiKey ? chapters.length : 2;

    if (!hasApiKey) {
      const remainingFree = 2 - translatedCount;
      if (remainingFree <= 0) {
        toast.error(
          "🔒 Chỉ được dịch 2 chương đầu miễn phí. Hãy nhập API key để tiếp tục."
        );
        setIsTranslateAllDisabled(true);
        setIsTranslatingAll(false);
        return;
      }
    }

    // Lấy các chương trong trang hiện tại
    const currentPageChapters = currentChapters.map((chapter, pageIndex) => {
      // Tìm index thực tế trong mảng chapters gốc
      const actualIndex = chapters.findIndex(
        (ch) => ch.chapterNumber === chapter.chapterNumber
      );
      return { ...chapter, originalIndex: actualIndex, pageIndex };
    });

    // Lọc ra các chương chưa dịch trong trang hiện tại
    const chaptersToTranslate = currentPageChapters
      .filter((chapter) => !results[chapter.originalIndex])
      .slice(
        0,
        hasApiKey
          ? currentPageChapters.length
          : Math.min(2 - translatedCount, currentPageChapters.length)
      );

    console.log(
      "📄 Chương trong trang hiện tại:",
      currentPageChapters.map((ch) => ch.chapterName)
    );
    console.log(
      "📝 Chương sẽ dịch:",
      chaptersToTranslate.map((ch) => ch.chapterName)
    );

    if (chaptersToTranslate.length === 0) {
      toast.success("Tất cả các chương trong trang này đã được dịch.");
      setIsTranslatingAll(false);
      setHasTranslatedAll(true);
      setManualTotalProgress(100); // Đảm bảo lên 100% khi xong
      return;
    }

    try {
      await translateAllChapters({
        chaptersToTranslate,
        chapters,
        apiKey,
        model,
        setResults,
        setTranslatedCount,
        setErrorMessages,
        onTranslationResult,
        isStopped: isStoppedRef.current,
        onChapterStartProgress: handleChapterStartProgress,
        onChapterStopProgress: handleChapterStopProgress,
        onUpdateTotalProgress: (percent) => setManualTotalProgress(percent),
      });
    } catch (error) {
      console.error("Lỗi khi dịch chương:", error);
      setErrorMessages((prev) => ({
        ...prev,
        general: "❌ Lỗi khi dịch tất cả các chương.",
      }));
      toast.error("❌ Lỗi khi dịch tất cả các chương.");
      setIsTranslateAllDisabled(false);
    } finally {
      console.timeEnd("⏱️ Thời gian dịch toàn bộ");
      setIsTranslatingAll(false);
      setHasTranslatedAll(true);
      setManualTotalProgress(100); // Đảm bảo lên 100% khi xong
    }
  };

  // Hàm dịch từng chương
  const translate = (index) => {
    // Nếu không được phép dịch thì return luôn, không chạy tiếp
    if (!canTranslate(index)) return;
    // Nếu chương đang PROCESSING hoặc PENDING thì không cho dịch lại
    if (
      chapterStatus[index] === "PROCESSING" ||
      chapterStatus[index] === "PENDING"
    )
      return;

    // Đặt trạng thái PENDING
    setChapterStatus((prev) => ({ ...prev, [index]: "PENDING" }));

    // Đặt timeout nhỏ để mô phỏng delay gửi request (có thể bỏ nếu muốn gửi ngay)
    setTimeout(() => {
      // Nếu user đã hủy trước khi gửi request
      if (chapterStatus[index] === "CANCELLED") {
        console.log(
          `[CHAPTER ${index}] Đã hủy trước khi gửi request, không gửi nữa.`
        );
        return;
      }
      // Chuyển sang PROCESSING
      setChapterStatus((prev) => ({ ...prev, [index]: "PROCESSING" }));
      const chapterHook = getChapterProgressHook(index);
      chapterHook.startProgress(); // Bắt đầu tiến độ cho chương này

      translateSingleChapter({
        index,
        chapters,
        apiKey,
        model,
        setProgress: (progress) => {
          setChapterProgresses((prev) => ({ ...prev, [index]: progress }));
        },
        setResults,
        setErrorMessages,
        setTranslatedCount,
        setTotalProgress: (progress) => {
          startTotalProgress();
        },
        onTranslationResult,
        onSelectChapter,
        isStopped: isStoppedRef.current,
        onComplete: (duration, error) => {
          // Nếu user đã hủy trong lúc đang dịch
          if (chapterStatus[index] === "CANCELLED") {
            chapterHook.stopProgress();
            setChapterStatus((prev) => ({ ...prev, [index]: "CANCELLED" }));
            console.log(
              `[CHAPTER ${index}] Đã hủy trong lúc đang dịch, bỏ qua kết quả.`
            );
            return;
          }
          chapterHook.stopProgress();
          if (error) {
            setChapterStatus((prev) => ({ ...prev, [index]: "FAILED" }));
            console.log(`[CHAPTER ${index}] Lỗi khi dịch:`, error);
          } else {
            setChapterStatus((prev) => ({ ...prev, [index]: "COMPLETE" }));
            console.log(`[CHAPTER ${index}] Dịch xong.`);
          }
          stopTotalProgress();
          setTranslationDurations((prev) => ({ ...prev, [index]: duration }));
          setTimeout(() => {
            setChapterProgresses((prev) => {
              const newProgresses = { ...prev };
              delete newProgresses[index];
              return newProgresses;
            });
          }, 2000);
        },
      });
    }, 200); // delay nhỏ để user có thể bấm hủy ngay sau khi bấm dịch
  };

  // Hàm hủy dịch 1 chương
  const cancelTranslate = (index) => {
    // Chỉ cho hủy khi đang PENDING hoặc PROCESSING
    if (
      chapterStatus[index] === "PENDING" ||
      chapterStatus[index] === "PROCESSING"
    ) {
      setChapterStatus((prev) => ({ ...prev, [index]: "CANCELLED" }));
      console.log(`[CHAPTER ${index}] User bấm hủy dịch.`);
    }
  };

  // Hàm nhảy tới trang
  const handleJumpToPage = () => {
    const num = parseInt(jumpToPage);
    if (isNaN(num)) {
      toast.error("❌ Vui lòng nhập số trang hợp lệ!");
      return;
    }

    if (num < 1 || num > totalPages) {
      toast.error(`❌ Số trang phải từ 1 đến ${totalPages}!`);
      return;
    }

    setCurrentPage(num);
    setJumpToPage(""); // Reset input sau khi nhảy
  };

  // Hàm nhảy tới chương
  const handleJumpToChapter = () => {
    const num = parseInt(jumpToChapter);
    if (isNaN(num)) {
      toast.error("❌ Vui lòng nhập số chương hợp lệ!");
      return;
    }

    if (num < 1 || num > chapters.length) {
      toast.error(`❌ Số chương phải từ 1 đến ${chapters.length}!`);
      return;
    }

    const targetIndex = num - 1;
    const newPage = Math.ceil(num / chaptersPerPage);
    setCurrentPage(newPage);
    onSelectChapter?.(targetIndex);
    setJumpToChapter(""); // Reset input sau khi nhảy
  };

  // Hàm xử lý khi nhập giá trị vào input nhảy trang
  const handlePageInputChange = (e) => {
    const value = e.target.value;
    const num = parseInt(value);

    if (value === "") {
      setJumpToPage("");
      return;
    }

    if (isNaN(num)) {
      return;
    }

    if (num >= 1 && num <= totalPages) {
      setJumpToPage(value);
    }
  };

  // Hàm xử lý khi nhập giá trị vào input nhảy chương
  const handleChapterInputChange = (e) => {
    const value = e.target.value;
    const num = parseInt(value);

    if (value === "") {
      setJumpToChapter("");
      return;
    }

    if (isNaN(num)) {
      return;
    }

    if (num >= 1 && num <= chapters.length) {
      setJumpToChapter(value);
    }
  };

  // Hàm xử lý khi chọn chương
  const handleSelectChapter = (index, page) => {
    // Lấy chapterNumber từ sortedChapters
    const chapterNumber = sortedChapters[index]?.chapterNumber;
    console.log("Số chương được chọn:", chapterNumber);
    console.log("Index được chọn:", index);
    console.log("Sorted chapters:", sortedChapters);

    // Tìm index thực tế trong mảng chapters dựa trên chapterNumber
    const actualIndex = chapters.findIndex(
      (ch) => ch.chapterNumber === chapterNumber
    );
    console.log("Index thực tế trong mảng chapters:", actualIndex);

    if (page) {
      setCurrentPage(page);
    }
    onSelectChapter?.(actualIndex); // Truyền index thực tế
  };

  // Hàm xử lý xóa chương
  const handleDeleteChapter = async (chapterNumber) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa chương này?")) {
      try {
        await deleteChapter(storyId, chapterNumber);
        // Gọi callback để tải lại dữ liệu
        if (onChapterAdded) {
          onChapterAdded();
        }
        toast.success("Đã xóa chương thành công!");
      } catch (error) {
        console.error("Lỗi khi xóa chương:", error);
        toast.error("Lỗi khi xóa chương!");
      }
    }
  };

  // Tính tổng số từ của 1 trang hiện tại
  const totalWordsInPage = currentChapters.reduce((sum, ch) => {
    const titleWords = (ch.title || ch.chapterName || "")
      .split(/\s+/)
      .filter(Boolean).length;
    const contentWords = (ch.content || ch.rawText || "")
      .split(/\s+/)
      .filter(Boolean).length;
    return sum + titleWords + contentWords;
  }, 0);

  // Lấy averageTimePerWord từ hook
  const estimatedTime = Math.round(
    totalWordsInPage * parseFloat(averageTimePerWord)
  ); // giây
  const estimatedTimeStr =
    estimatedTime < 60
      ? `${estimatedTime} giây`
      : `${Math.floor(estimatedTime / 60)} phút ${estimatedTime % 60} giây`;

  return (
    <div className="chapter-list">
      <h3>📚 Danh sách chương ({sortedChapters.length})</h3>
      <ul>
        {currentChapters.map((ch, idxOnPage) => {
          const calculatedChapterNumber = calculateChapterNumber(idxOnPage);
          const idx = chapters.findIndex(
            (chapter) => chapter.chapterNumber === ch.chapterNumber
          );
          const isTranslated = !!results[idx];
          const duration = translationDurations[idx];

          // Lấy progress từ state
          const chapterProgress = chapterProgresses[idx] || 0;
          const isChapterTranslating = chapterTranslatingStates[idx] || false;

          return (
            <li key={ch.chapterNumber}>
              <div
                className={`chapter-item ${
                  idx === currentIndex ? "selected" : ""
                }`}
                onClick={() =>
                  handleSelectChapter(
                    idx,
                    Math.ceil(ch.chapterNumber / chaptersPerPage)
                  )
                }
              >
                <div className="chapter-header">
                  <p>Chương {calculatedChapterNumber}:</p>
                  <strong>
                    {ch.translatedTitle ||
                      ch.title ||
                      ch.chapterName ||
                      `Chương ${calculatedChapterNumber}`}
                  </strong>
                  {/* ĐÃ DỊCH: Đưa xuống dưới trạng thái */}
                  {/* {isTranslated && (
                    <span className="translated-label">
                      ✅ Đã dịch {duration ? `(${duration.toFixed(1)}s)` : ""}
                    </span>
                  )} */}
                  <div className="chapter-actions">
                    {/* Nút Dịch chỉ hiện khi không PROCESSING/PENDING */}
                    {!(
                      chapterStatus[idx] === "PROCESSING" ||
                      chapterStatus[idx] === "PENDING"
                    ) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          translate(idx);
                        }}
                        disabled={
                          !canTranslate(idx) ||
                          isTranslatingAll ||
                          chapterStatus[idx] === "PROCESSING" ||
                          chapterStatus[idx] === "PENDING"
                        }
                        className={`translate-sgn-button ${
                          isTranslated ? "hidden" : ""
                        }`}
                      >
                        📝 Dịch
                      </button>
                    )}
                    {/* Nút hủy dịch chỉ hiện khi PROCESSING hoặc PENDING */}
                    {(chapterStatus[idx] === "PENDING" ||
                      chapterStatus[idx] === "PROCESSING") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelTranslate(idx);
                        }}
                        className="cancel-translate-button"
                        style={{ height: "100%" }}
                      >
                        🛑 Hủy Dịch
                      </button>
                    )}
                    {/* Nút Xóa chỉ hiện khi không PROCESSING/PENDING */}
                    {!(
                      chapterStatus[idx] === "PROCESSING" ||
                      chapterStatus[idx] === "PENDING"
                    ) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(ch.chapterNumber);
                        }}
                        className={`delete-chapter-button${
                          chapterStatus[idx] === "COMPLETE" ? " complete" : ""
                        }`}
                      >
                        ❌ Xoá
                      </button>
                    )}
                  </div>
                </div>
                {/* Hiển thị trạng thái chương */}
                {chapterStatus[idx] && (
                  <div className="chapter-status">
                    <span>
                      Trạng thái: <b>{chapterStatus[idx]}</b>
                    </span>
                    {/* Hiển thị thanh tiến độ nếu đang PROCESSING hoặc PENDING */}
                    {(chapterStatus[idx] === "PROCESSING" ||
                      chapterStatus[idx] === "PENDING") && (
                      <div className="chapter-progress-bar-container">
                        <div
                          className="chapter-progress-bar"
                          style={{ width: `${chapterProgress}%` }}
                        ></div>
                        <div className="progress-info">
                          <small className="progress-text">
                            Đang dịch... {chapterProgress.toFixed(0)}%
                          </small>
                        </div>
                      </div>
                    )}
                    {/* Hiển thị label Đã dịch khi COMPLETE */}
                    {chapterStatus[idx] === "COMPLETE" && (
                      <span className="translated-label">
                        ✅ Đã dịch {duration ? `(${duration.toFixed(1)}s)` : ""}
                      </span>
                    )}
                  </div>
                )}
                {errorMessages[idx] && (
                  <div className="error-message">
                    <p>{errorMessages[idx]}</p>
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

        {/* Hiển thị trang đầu tiên */}
        {currentPage > 2 && (
          <button onClick={() => setCurrentPage(1)}>1</button>
        )}

        {/* Hiển thị dấu ... khi cần */}
        {currentPage > 3 && <span>...</span>}

        {/* Hiển thị các trang xung quanh trang hiện tại */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((pageNum) => {
            // Luôn hiển thị trang đầu và trang cuối
            if (pageNum === 1 || pageNum === totalPages) return true;
            // Hiển thị các trang xung quanh trang hiện tại (trước và sau 1 trang)
            return Math.abs(pageNum - currentPage) <= 1;
          })
          .map((pageNum, index, array) => {
            // Thêm dấu ... giữa các khoảng trống
            const showEllipsisBefore =
              index > 0 && array[index - 1] !== pageNum - 1;
            const showEllipsisAfter =
              index < array.length - 1 && array[index + 1] !== pageNum + 1;

            return (
              <React.Fragment key={pageNum}>
                {showEllipsisBefore && <span>...</span>}
                <button
                  className={currentPage === pageNum ? "active" : ""}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
                {showEllipsisAfter && <span>...</span>}
              </React.Fragment>
            );
          })}

        {/* Hiển thị dấu ... khi cần */}
        {currentPage < totalPages - 2 && <span>...</span>}

        {/* Hiển thị trang cuối cùng */}
        {currentPage < totalPages - 1 && (
          <button onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </button>
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
          placeholder={`Nhập (1-${totalPages})`}
          value={jumpToPage}
          onChange={handlePageInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJumpToPage();
          }}
        />
        <button onClick={handleJumpToPage}>➡️ Đi tới trang</button>
      </div>

      {/* nhảy tới chương */}
      <div className="jump-to-chapter">
        <label>🔍 Nhảy tới chương:</label>
        <input
          type="number"
          min={1}
          max={chapters.length}
          placeholder={`Nhập (1-${chapters.length})`}
          value={jumpToChapter}
          onChange={handleChapterInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJumpToChapter();
          }}
        />
        <button onClick={handleJumpToChapter}>➡️ Đi tới chương</button>
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
            "🔁 Dịch lại toàn bộ chương trong trang"
          ) : (
            "📖 Dịch toàn bộ chương trong trang"
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
      {isTranslatingAll && (
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${manualTotalProgress}%` }}
          ></div>
          <small className="progress-text">
            Đang dịch... {manualTotalProgress.toFixed(0)}%<br />
            <span style={{ fontSize: "12px", color: "#888" }}>
              Tiến độ tổng là ước lượng dựa trên số chương đã dịch, không phải
              thời gian thực tế.
            </span>
          </small>
        </div>
      )}
      {errorMessages.general && (
        <div className="general-error">
          <p>{errorMessages.general}</p>
        </div>
      )}
      {/* Thời gian dự kiến dịch trang */}
      <div style={{ margin: "8px 0", color: "#888", fontSize: "15px" }}>
        ⏳ Thời gian dự kiến dịch trang này: <b>{estimatedTimeStr}</b> (Tổng{" "}
        {totalWordsInPage} từ, trung bình {averageTimePerWord} giây/từ)
      </div>
    </div>
  );
};

export default ChapterList;
