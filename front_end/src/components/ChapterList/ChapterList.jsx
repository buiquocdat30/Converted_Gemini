import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faStop } from "@fortawesome/free-solid-svg-icons";
import { translateAllChapters } from "../../services/translateChapters";
import { translateSingleChapter } from "../../services/translateSingleChapter";
import { toast } from "react-hot-toast";
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
  const [errorMessages, setErrorMessages] = useState({}); // Thêm trạng thái lỗi
  const [translatedCount, setTranslatedCount] = useState(0); //chương đã dịch
  const [progress, setProgress] = useState({}); // Lưu tiến độ mỗi chương
  const [totalProgress, setTotalProgress] = useState(0); // Lưu tiến độ tổng
  const [isTranslateAllDisabled, setIsTranslateAllDisabled] = useState(false); //Disable nút dịch tổng
  const [isTranslatingAll, setIsTranslatingAll] = useState(false); //Nút quay quay loading
  const [hasTranslatedAll, setHasTranslatedAll] = useState(false); //đã dịch xong
  const isStoppedRef = useRef(false); //dừng dịch
  const [isStopping, setIsStopping] = useState(false); // Trạng thái đang dừng

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
    setIsTranslateAllDisabled(true);
    console.time("⏱️ Thời gian dịch toàn bộ");

    setIsTranslatingAll(true);
    const maxChapters = apiKey ? chapters.length : 2;

    if (!apiKey) {
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

    const chaptersToTranslate = chapters
      .map((chapter, index) => ({ ...chapter, originalIndex: index }))
      .filter((_, index) => !results[index])
      .slice(0, maxChapters - translatedCount);

    if (chaptersToTranslate.length === 0) {
      toast.success("Tất cả các chương đã được dịch.");
      setTotalProgress(100);
      setIsTranslateAllDisabled(true);
      setIsTranslatingAll(false);
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
      toast.error("❌ Lỗi khi dịch tất cả các chương.");
      setIsTranslateAllDisabled(false);
    } finally {
      console.timeEnd("⏱️ Thời gian dịch toàn bộ");
      setIsTranslatingAll(false);
      setHasTranslatedAll(true);
    }
  };

  // Hàm dịch từng chương
  const translate = (index) => {
    console.log("chapters", chapters);
    console.log("apiKey", apiKey);
    console.log("model", model);
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

  // Hàm dừng dịch
  const stopTranslation = async () => {
    try {
      setIsStopping(true);
      isStoppedRef.current = true;
      
      // Gọi API để dừng job
      const token = localStorage.getItem("auth-token");
      await axios.post(`${API_URL}/translate/queue/stop`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success("Đã dừng quá trình dịch");
      setIsTranslatingAll(false);
      setIsTranslateAllDisabled(false);
    } catch (error) {
      console.error("Lỗi khi dừng dịch:", error);
      toast.error("Không thể dừng quá trình dịch");
    } finally {
      setIsStopping(false);
    }
  };

  // Reset trạng thái dừng khi bắt đầu dịch mới
  useEffect(() => {
    if (!isTranslatingAll) {
      isStoppedRef.current = false;
    }
  }, [isTranslatingAll]);

  return (
    <div className="chapter-list">
      <div className="chapter-list-header">
        <h2>Danh sách chương</h2>
        <div className="chapter-list-actions">
          <button
            className="translate-all-btn"
            onClick={translateAll}
            disabled={isTranslateAllDisabled}
          >
            {isTranslatingAll ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Đang dịch...
              </>
            ) : (
              "Dịch tất cả"
            )}
          </button>
          {isTranslatingAll && (
            <button
              className="stop-translation-btn"
              onClick={stopTranslation}
              disabled={isStopping}
            >
              {isStopping ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Đang dừng...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faStop} /> Dừng dịch
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <h3>📚 Danh sách chương ({sortedChapters.length})</h3>
      <ul>
        {currentChapters.map((ch, idxOnPage) => {
          const calculatedChapterNumber = calculateChapterNumber(idxOnPage);
          // Tìm index thực tế trong mảng chapters dựa trên chapterNumber
          const idx = chapters.findIndex(
            (chapter) => chapter.chapterNumber === ch.chapterNumber
          );
          const isTranslated = !!results[idx];

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
                  {isTranslated && (
                    <span className="translated-label">✅ Đã dịch</span>
                  )}
                  <div className="chapter-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        translate(idx);
                      }}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(ch.chapterNumber);
                      }}
                      className="delete-chapter-button"
                      style={
                        isTranslated
                          ? { width: "100%", height: "100%" }
                          : { width: "50%" }
                      }
                    >
                      ❌ Xoá
                    </button>
                  </div>
                </div>
                {progress[idx] !== undefined && !isTranslatingAll && (
                  <div className="chapter-progress-bar-container">
                    <div
                      className="chapter-progress-bar"
                      style={{ width: `${progress[idx]}%` }}
                    ></div>
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
