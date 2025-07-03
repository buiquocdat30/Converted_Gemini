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
  // console.log("đây là thời gian trung bình dịch từ:", averageTimePerWord);
  // Sử dụng hook cho tiến độ từng chương
  const chapterProgressHooks = useRef({});

  // State cho tiến độ tổng thực tế (bám sát số chương đã dịch)
  const [manualTotalProgress, setManualTotalProgress] = useState(0);

  // Quản lý trạng thái từng chương
  const [chapterStatus, setChapterStatus] = useState({}); // { [index]: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'CANCELLED' | 'FAILED' }

  // Ref để lưu trạng thái hủy dịch của từng chương
  const cancelMapRef = useRef({});

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

  // Reset trạng thái dịch all khi chuyển trang
  useEffect(() => {
    setHasTranslatedAll(false);
  }, [currentPage]);

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

    // Reset trạng thái hủy cho các chương sắp dịch
    chaptersToTranslate.forEach(ch => {
      cancelMapRef.current[ch.originalIndex] = false;
    });

    try {
      await translateAllChapters({
        chaptersToTranslate,
        chapters,
        apiKey,
        model,
        storyId,
        setResults: (updater) => {
          // Bọc lại để kiểm tra cancelMapRef trước khi cập nhật
          if (typeof updater === 'function') {
            setResults((prev) => {
              const next = updater(prev);
              // Log từng index trước khi lọc
              Object.keys(next).forEach(idx => {
                console.log(`[LOG][setResults-batch] idx=${idx}, status=${chapterStatus[idx]}, cancelFlag=${cancelMapRef.current[idx]}`);
              });
              // Loại bỏ kết quả các chương đã bị hủy
              const filtered = { ...next };
              Object.keys(filtered).forEach(idx => {
                if (cancelMapRef.current[idx] || chapterStatus[idx] === "CANCELLED") {
                  console.log(`[SKIP][setResults-batch] Bỏ qua cập nhật idx=${idx} vì đã CANCELLED hoặc cờ hủy.`);
                  delete filtered[idx];
                }
              });
              return filtered;
            });
          } else {
            // updater là object
            Object.keys(updater).forEach(idx => {
              console.log(`[LOG][setResults-batch-obj] idx=${idx}, status=${chapterStatus[idx]}, cancelFlag=${cancelMapRef.current[idx]}`);
            });
            const filtered = { ...updater };
            Object.keys(filtered).forEach(idx => {
              if (cancelMapRef.current[idx] || chapterStatus[idx] === "CANCELLED") {
                console.log(`[SKIP][setResults-batch-obj] Bỏ qua cập nhật idx=${idx} vì đã CANCELLED hoặc cờ hủy.`);
                delete filtered[idx];
              }
            });
            setResults(filtered);
          }
        },
        setTranslatedCount,
        setErrorMessages,
        onTranslationResult: (index, translated, translatedTitle, duration) => {
          // Log lại giá trị mới nhất
          console.log(`[CHECK][onTranslationResult] index=${index}, status hiện tại=${chapterStatus[index]}, cancelFlag hiện tại=${cancelMapRef.current[index]}`);
          if (cancelMapRef.current[index] || chapterStatus[index] === "CANCELLED") {
            console.log(`[SKIP][onTranslationResult-batch] Bỏ qua cập nhật vì đã CANCELLED hoặc cờ hủy.`);
            return;
          }
          onTranslationResult(index, translated, translatedTitle, duration);
        },
        isStopped: isStoppedRef.current,
        onChapterStartProgress: handleChapterStartProgress,
        onChapterStopProgress: handleChapterStopProgress,
        onUpdateTotalProgress: (percent) => setManualTotalProgress(percent),
        getChapterStatus: (idx) => chapterStatus[idx],
        onBatchCancel: (batchIndex) => {
          // Đánh dấu trạng thái CANCELLED cho các chương trong batch bị huỷ
          setChapterStatus(prev => {
            const newStatus = { ...prev };
            const start = batchIndex * 3;
            const end = start + 3;
            for (let i = start; i < end; i++) {
              if (newStatus[i] === "PROCESSING" || newStatus[i] === "PENDING") {
                console.log(`[STOP][BatchCancel] Set CANCELLED cho idx=${i}, status cũ=${newStatus[i]}`);
                newStatus[i] = "CANCELLED";
                cancelMapRef.current[i] = true;
              }
            }
            return newStatus;
          });
        },
        setChapterStatus: (originalIndex, status) => {
          setChapterStatus((prev) => {
            const newStatus = { ...prev, [originalIndex]: status };
            console.log(`[SET][${status.toUpperCase()}] idx=${originalIndex}, status mới=${newStatus[originalIndex]}, cancelFlag=${cancelMapRef.current[originalIndex]}`);
            return newStatus;
          });
        },
        setChapterStatusProcessing: (originalIndex) => {
          setChapterStatus((prev) => {
            const newStatus = { ...prev, [originalIndex]: "PROCESSING" };
            console.log(`[SET][PROCESSING][BATCH] idx=${originalIndex}, status mới=${newStatus[originalIndex]}, cancelFlag=${cancelMapRef.current[originalIndex]}`);
            return newStatus;
          });
        },
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
    cancelMapRef.current[index] = false; // Reset trạng thái hủy khi dịch lại
    // Nếu không được phép dịch thì return luôn, không chạy tiếp
    if (!canTranslate(index)) return;
    // Nếu chương đang PROCESSING hoặc PENDING thì không cho dịch lại
    if (
      chapterStatus[index] === "PROCESSING" ||
      chapterStatus[index] === "PENDING"
    )
      return;

    // Đặt trạng thái PENDING
    setChapterStatus((prev) => {
      const newStatus = { ...prev, [index]: "PENDING" };
      console.log(`[SET][PENDING] idx=${index}, status mới=${newStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
      return newStatus;
    });
    console.log(`Dưới setChapterStatus [SET][PENDING] newStatus=${newStatus}`)

    setTimeout(() => {
      // Nếu user đã hủy trước khi gửi request
      if (chapterStatus[index] === "CANCELLED" || cancelMapRef.current[index]) {
        console.log(
          `[CHAPTER ${index}] Đã hủy trước khi gửi request, không gửi nữa.`
        );
        return;
      }
      // Chuyển sang PROCESSING
      setChapterStatus((prev) => {
        const newStatus = { ...prev, [index]: "PROCESSING" };
        console.log(`[SET][PROCESSING] idx=${index}, status mới=${newStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
        return newStatus;
      });

      console.log(`Dưới setChapterStatus [SET][PROCESSING] newStatus=${newStatus}`)
      const chapterHook = getChapterProgressHook(index);
      chapterHook.startProgress(); // Bắt đầu tiến độ cho chương này

      translateSingleChapter({
        index,
        chapters,
        apiKey,
        model,
        storyId,
        setProgress: (progress) => {
          setChapterProgresses((prev) => ({ ...prev, [index]: progress }));
        },
        setResults: (updater) => {
          if (cancelMapRef.current[index] || chapterStatus[index] === "CANCELLED") {
            console.log(`[SKIP][setResults-single] idx=${index} đã CANCELLED hoặc cờ hủy, bỏ qua cập nhật.`);
            return;
          }
          setResults(updater);
        },
        setErrorMessages,
        setTranslatedCount,
        setTotalProgress: (progress) => {
          startTotalProgress();
        },
        onTranslationResult: (idx, translated, translatedTitle, duration) => {
          console.log(`[LOG][onTranslationResult-single] idx=${idx}, status=${chapterStatus[idx]}, cancelFlag=${cancelMapRef.current[idx]}`);
          if (cancelMapRef.current[idx] || chapterStatus[idx] === "CANCELLED") {
            console.log(`[SKIP][onTranslationResult-single] Bỏ qua cập nhật vì đã CANCELLED hoặc cờ hủy.`);
            return;
          }
          onTranslationResult(idx, translated, translatedTitle, duration);
        },
        onSelectChapter,
        isStopped: isStoppedRef.current,
        onComplete: (duration, error) => {
          // Nếu user đã hủy trong lúc đang dịch
          if (chapterStatus[index] === "CANCELLED" || cancelMapRef.current[index]) {
            chapterHook.stopProgress();
            setChapterStatus((prev) => {
              const newStatus = { ...prev, [index]: "CANCELLED" };
              console.log(`[SET][CANCELLED] idx=${index}, status mới=${newStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
              return newStatus;
            });
            console.log(
              `[CHAPTER ${index}] Đã hủy trong lúc đang dịch, bỏ qua kết quả.`
            );
            return;
          }
          chapterHook.stopProgress();
          if (error) {
            setChapterStatus((prev) => {
              const newStatus = { ...prev, [index]: "FAILED" };
              console.log(`[QUEUE][${new Date().toLocaleTimeString()}] Chương ${index} chuyển trạng thái: FAILED. Lý do:`, error);
              return newStatus;
            });
            console.log(`[CHAPTER ${index}] Lỗi khi dịch:`, error);
          } else {
            if (cancelMapRef.current[index] || chapterStatus[index] === "CANCELLED") {
              console.log(`[COMPLETE][SetStatus] idx=${index}, status cũ=${chapterStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
              console.log(`[CHAPTER ${index}] Đã hủy, không set COMPLETE.`);
              return;
            }
            setChapterStatus((prev) => {
              console.log(`[COMPLETE][SetStatus] idx=${index}, status cũ=${prev[index]}, cancelFlag=${cancelMapRef.current[index]}`);
              const newStatus = { ...prev, [index]: "COMPLETE" };
              console.log(`[QUEUE][${new Date().toLocaleTimeString()}] Chương ${index} chuyển trạng thái: COMPLETE`);
              return newStatus;
            });
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
      setChapterStatus((prev) => {
        const newStatus = { ...prev, [index]: "CANCELLED" };
        console.log(`[SET][CANCELLED] idx=${index}, status mới=${newStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
        return newStatus;
      });
      cancelMapRef.current[index] = true;
      console.log(`[SET][cancelFlag] idx=${index}, cancelFlag mới=${cancelMapRef.current[index]}`);
      toast("Đã huỷ dịch chương thành công!", { icon: "🛑" });
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

  // Hàm dừng dịch toàn bộ chương
  const stopAllTranslation = () => {
    isStoppedRef.current = true;
    // Lấy danh sách các chương đang PENDING hoặc PROCESSING trong trang hiện tại
    currentChapters.forEach((ch) => {
      // Lấy index thực tế trong mảng chapters
      const idx = chapters.findIndex(
        (chapter) => chapter.chapterNumber === ch.chapterNumber
      );
      if (chapterStatus[idx] === "PENDING" || chapterStatus[idx] === "PROCESSING") {
        setChapterStatus((prev) => {
          const newStatus = { ...prev, [idx]: "CANCELLED" };
          console.log(`[SET][CANCELLED] idx=${idx}, status mới=${newStatus[idx]}, cancelFlag=${cancelMapRef.current[idx]}`);
          return newStatus;
        });
        cancelMapRef.current[idx] = true;
        console.log(`[SET][cancelFlag] idx=${idx}, cancelFlag mới=${cancelMapRef.current[idx]}`);
        console.log(`[STOP][stopAllTranslation] Set CANCELLED cho idx=${idx}, status cũ=${chapterStatus[idx]}`);
      }
    });
    toast.success("Đã dừng dịch toàn bộ chương trong trang!");
    setHasTranslatedAll(false);
    toast(
      `Ước tính thời gian dịch 1 trang: ${estimatedTimeStr} (Tổng ${totalWordsInPage} từ, trung bình ${averageTimePerWord} giây/từ)`
    );
  };

  // Expose setChapterStatus ra window để dịch batch gọi được
  useEffect(() => {
    window.setChapterStatusGlobal = (originalIndex, status) => {
      setChapterStatus((prev) => {
        const newStatus = { ...prev, [originalIndex]: status };
        console.log(`[SET][${status.toUpperCase()}][BATCH] idx=${originalIndex}, status mới=${newStatus[originalIndex]}, cancelFlag=${cancelMapRef.current[originalIndex]}`);
        return newStatus;
      });
    };
    return () => {
      window.setChapterStatusGlobal = undefined;
    };
  }, []);

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
                        style={{ height: "42px" }}
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
                    {/* Hiển thị label Đang dịch hoặc Đã dịch */}
                    {(chapterStatus[idx] === "PROCESSING" || chapterStatus[idx] === "PENDING") && (
                      <span className="translated-label" >
                        🔄 Đang dịch, vui lòng chờ...
                      </span>
                    )}
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
          className="stop-translate-all-button"
          onClick={stopAllTranslation}
          disabled={!isTranslatingAll}
        >
          🛑 Dừng dịch toàn bộ chương trong trang
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
