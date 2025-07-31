import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { translateAllChapters } from "../../services/translateChapters";
import { translateSingleChapter } from "../../services/translateSingleChapter";
import { toast } from "react-hot-toast";
import useTranslationProgress from "../../hook/useTranslationProgress";
import "./ChapterList.css";
import { useSession } from '../../context/SessionContext';
import useTranslationSocket from '../../hook/useTranslationSocket';
import { AuthContext } from '../../context/ConverteContext';

const ChapterList = ({
  chapters,
  apiKey,
  model: modelProp,
  onTranslationResult,
  onSelectChapter,
  onSelectJumbChapter,
  currentIndex = 0,
  storyId,
  deleteChapter,
  onChapterAdded,
  setChapters,
  ...rest
}) => {
  const { selectedModel: modelFromContext } = useSession();
  const { userData } = useContext(AuthContext); // Lấy userData từ context
  // Ưu tiên prop model nếu là object, nếu không thì lấy từ context
  const modelObject = (modelProp && typeof modelProp === 'object' && modelProp.rpm) ? modelProp : modelFromContext;
  
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

          console.log(`[PROGRESS] Khởi tạo progress cho chương ${index} - chờ thông tin từ socket`);
          
          // Không tự động tính progress nữa, chờ thông tin từ socket
          // Progress sẽ được cập nhật qua handleSocketChapterProgress
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
    
    // Kiểm tra có key khả dụng không
    const hasApiKey = Array.isArray(apiKey) ? apiKey.length > 0 : !!apiKey;
    
    // Nếu không có key (dùng defaultKey), chỉ cho phép dịch 2 chương đầu tiên (index 0, 1)
    if (!hasApiKey && index >= 2) {
      return false; // Chương từ index 2 trở đi không được dịch trong chế độ free
    }
    
    // Nếu có key, cho phép dịch tất cả
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
      .filter((chapter) => {
        // Chỉ lấy chương chưa dịch
        if (results[chapter.originalIndex]) return false;
        
        // Nếu không có key, chỉ cho phép dịch 2 chương đầu tiên (index 0, 1)
        if (!hasApiKey && chapter.originalIndex >= 2) return false;
        
        return true;
      })
      .slice(0, hasApiKey ? currentPageChapters.length : currentPageChapters.length);

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
      // Chỉ đặt trạng thái PENDING, không khởi động thanh tiến độ ngay
      setChapterStatus(prev => ({
        ...prev,
        [ch.originalIndex]: "PENDING"
      }));
    });

    try {
      await translateAllChapters({
        chaptersToTranslate,
        chapters,
        apiKey,
        model: modelObject,
        storyId,
        userData, // Truyền userData
        setResults: (updater) => {
          // Bọc lại để kiểm tra cancelMapRef trước khi cập nhật
          if (typeof updater === 'function') {
            setResults((prev) => {
              const next = updater(prev);
              // Log từng index trước khi lọc
              Object.keys(next).forEach(idx => {
                console.log(`[LOG][setResults-batch] idx=${idx}, cancelFlag=${cancelMapRef.current[idx]}`);
              });
              // Loại bỏ kết quả các chương đã bị hủy
              const filtered = { ...next };
              Object.keys(filtered).forEach(idx => {
                if (cancelMapRef.current[idx]) {
                  console.log(`[SKIP][setResults-batch] Bỏ qua cập nhật idx=${idx} vì đã CANCELLED hoặc cờ hủy.`);
                  delete filtered[idx];
                }
              });
              return filtered;
            });
          } else {
            // updater là object
            Object.keys(updater).forEach(idx => {
              console.log(`[LOG][setResults-batch-obj] idx=${idx}, cancelFlag=${cancelMapRef.current[idx]}`);
            });
            const filtered = { ...updater };
            Object.keys(filtered).forEach(idx => {
              if (cancelMapRef.current[idx]) {
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
          console.log(`[CHECK][onTranslationResult] index=${index}, cancelFlag hiện tại=${cancelMapRef.current[index]}`);
          if (cancelMapRef.current[index]) {
            console.log(`[SKIP][onTranslationResult-batch] Bỏ qua cập nhật vì đã CANCELLED hoặc cờ hủy.`);
            return;
          }
          onTranslationResult(index, translated, translatedTitle, duration);
        },
        isStopped: isStoppedRef.current,
        onChapterStartProgress: handleChapterStartProgress,
        onChapterStopProgress: handleChapterStopProgress,
        onUpdateTotalProgress: (percent) => setManualTotalProgress(percent),
        getChapterStatus: (idx) => {
          // Sử dụng callback để lấy trạng thái hiện tại
          return new Promise((resolve) => {
            setChapterStatus((prev) => {
              resolve(prev[idx]);
              return prev; // Không thay đổi state
            });
          });
        },
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

  // Thêm state cho countdown dịch lẻ
  const [singleTranslateCooldown, setSingleTranslateCooldown] = useState(0);
  const singleTranslateTimerRef = useRef(null);

  // Thay đổi hàm startSingleTranslateCooldown để luôn set cooldown = 30s để test
  const startSingleTranslateCooldown = () => {
    console.log('[ChapterList] model from prop rpm:', modelObject.rpm);
    console.log('[ChapterList test model.rpm] startSingleTranslateCooldown', modelObject, typeof modelObject, modelObject?.rpm);
    if (!modelObject || typeof modelObject !== 'object' || !modelObject.rpm) {
      console.warn('[ChapterList] Model không hợp lệ hoặc không có rpm:', modelObject);
      return;
    }
    const cooldown = Math.ceil(60 / modelObject.rpm);
    setSingleTranslateCooldown(cooldown);
    if (singleTranslateTimerRef.current) clearInterval(singleTranslateTimerRef.current);
    singleTranslateTimerRef.current = setInterval(() => {
      setSingleTranslateCooldown(prev => {
        if (prev <= 1) {
          clearInterval(singleTranslateTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clear timer khi unmount
  useEffect(() => {
    return () => {
      if (singleTranslateTimerRef.current) clearInterval(singleTranslateTimerRef.current);
    };
  }, []);

  // Sửa hàm translate để log ra khi bấm dịch 1 chương
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
    // Nếu đang cooldown dịch lẻ thì không cho dịch
    if (singleTranslateCooldown > 0) return;

    // Log model object và rpm
    console.log('[ChapterList] Bấm dịch chương', index, 'Model:', modelObject, 'RPM:', modelObject?.rpm);

    // Bắt đầu cooldown dịch lẻ
    startSingleTranslateCooldown();
    console.log('[ChapterList] Bấm dịch chương', index, 'Cooldown:', 30, 'giây');

    // Đặt trạng thái PENDING
    setChapterStatus((prev) => {
      const newStatus = { ...prev, [index]: "PENDING" };
      console.log(`[SET][PENDING] idx=${index}, status mới=${newStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
      return newStatus;
    });

    setTimeout(() => {
      // Nếu user đã hủy trước khi gửi request
      if (cancelMapRef.current[index]) {
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

      const chapterHook = getChapterProgressHook(index);
      chapterHook.startProgress(); // Bắt đầu tiến độ cho chương này

      translateSingleChapter({
        index,
        chapters,
        apiKey,
        model: modelObject,
        storyId,
        setProgress: (progress) => {
          setChapterProgresses((prev) => ({ ...prev, [index]: progress }));
        },
        setResults: (updater) => {
          if (cancelMapRef.current[index]) {
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
        onTranslationResult: (idx, translated, translatedTitle, duration, errorObj) => {
          // Áp dụng errorHandlerService: Nếu có lỗi, đánh FAILED và toast
          if (errorObj && (errorObj.hasError || errorObj.status === 'FAILED' || errorObj.translationError)) {
            console.warn(`[LOG][FAILED][onTranslationResult] idx=${idx}: hasError=${errorObj.hasError}, status=${errorObj.status}, translationError=${errorObj.translationError}`);
            setChapterStatus((prev) => ({ ...prev, [idx]: "FAILED" }));
            toast.error(errorObj.error || errorObj.userMessage || "Lỗi không xác định khi dịch chương!");
            chapterHook.stopProgress();
            setChapterProgresses((prev) => ({ ...prev, [idx]: 0 }));
            setErrorMessages((prev) => ({ ...prev, [idx]: errorObj.error || errorObj.userMessage }));
            return;
          }
          // ... logic cập nhật chương khi dịch thành công ...
          onTranslationResult(idx, translated, translatedTitle, duration);
        },
        onSelectChapter,
        isStopped: isStoppedRef.current,
        onComplete: (duration, error) => {
          // Nếu user đã hủy trong lúc đang dịch
          if (cancelMapRef.current[index]) {
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
            setErrorMessages((prev) => ({ ...prev, [index]: error.message || "Dịch thất bại" }));
            toast.error(error.message || "Dịch thất bại");
            console.log(`[CHAPTER ${index}] Lỗi khi dịch:`, error);
          } else {
            if (cancelMapRef.current[index]) {
              console.log(`[COMPLETE][SetStatus] idx=${index}, cancelFlag=${cancelMapRef.current[index]}`);
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
    totalWordsInPage * (parseFloat(averageTimePerWord) || 0.1)
  ); // giây
  
  // Debug log để kiểm tra tính toán
  console.log('[PROGRESS-DEBUG] Tính thời gian ước tính:', {
    totalWordsInPage,
    averageTimePerWord,
    parsedAvgTime: parseFloat(averageTimePerWord),
    fallbackAvgTime: parseFloat(averageTimePerWord) || 0.1,
    estimatedTime,
    estimatedTimeStr: estimatedTime < 60
      ? `${estimatedTime} giây`
      : `${Math.floor(estimatedTime / 60)} phút ${estimatedTime % 60} giây`
  });
  
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
      // Sử dụng callback để kiểm tra trạng thái hiện tại
      setChapterStatus((prev) => {
        const currentStatus = prev[idx];
        if (currentStatus === "PENDING" || currentStatus === "PROCESSING") {
          const newStatus = { ...prev, [idx]: "CANCELLED" };
          console.log(`[SET][CANCELLED] idx=${idx}, status mới=${newStatus[idx]}, cancelFlag=${cancelMapRef.current[idx]}`);
          cancelMapRef.current[idx] = true;
          console.log(`[SET][cancelFlag] idx=${idx}, cancelFlag mới=${cancelMapRef.current[idx]}`);
          console.log(`[STOP][stopAllTranslation] Set CANCELLED cho idx=${idx}, status cũ=${currentStatus}`);
          return newStatus;
        }
        return prev;
      });
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

  // Lắng nghe kết quả dịch chương từ socket.io (tối ưu callback)
  const handleSocketChapterTranslated = useCallback((data) => {
    // data: { chapterNumber, translatedContent, translatedTitle, duration, error, jobIndex, totalJobs }
    console.log('[SOCKET][chapterTranslated] ===== NHẬN KẾT QUẢ TỪ SOCKET =====');
    console.log('[SOCKET][chapterTranslated] Data nhận được:', data);
    
    const idx = chapters.findIndex(ch => ch.chapterNumber === data.chapterNumber);
    console.log('[SOCKET][chapterTranslated] Tìm chapter index:', idx, 'cho chapterNumber:', data.chapterNumber);
    
    if (idx === -1) {
      console.warn('[SOCKET][chapterTranslated] Không tìm thấy chapter với number:', data.chapterNumber);
      console.log('[SOCKET][chapterTranslated] Danh sách chapters:', chapters.map(ch => ch.chapterNumber));
      return;
    }
    
    console.log('[SOCKET][chapterTranslated] Cập nhật results cho index:', idx);
    setResults(prev => ({
      ...prev,
      [idx]: {
        translated: data.translatedContent,
        translatedTitle: data.translatedTitle,
        duration: data.duration,
        error: data.error,
      }
    }));
    
    if (data.error) {
      setErrorMessages(prev => ({ ...prev, [idx]: data.error }));
      console.error(`[SOCKET][chapterTranslated] Dịch chương ${data.chapterNumber} thất bại: ${data.error}`);
      toast.error(`Dịch chương ${data.chapterNumber} thất bại: ${data.error}`);
            } else {
      setTranslatedCount(prev => prev + 1);
      console.log(`[SOCKET][chapterTranslated] Đã dịch xong chương ${data.chapterNumber}`);
      toast.success(`Đã dịch xong chương ${data.chapterNumber}`);
      
      // Gọi callback để lưu database
      if (onTranslationResult) {
        console.log(`[SOCKET][chapterTranslated] Gọi onTranslationResult cho index ${idx}`);
        console.log(`[SOCKET][chapterTranslated] Dữ liệu gửi:`, {
          index: idx,
          translatedContent: data.translatedContent?.substring(0, 100) + '...',
          translatedTitle: data.translatedTitle,
          duration: data.duration
        });
        onTranslationResult(idx, data.translatedContent, data.translatedTitle, data.duration);
      } else {
        console.warn('[SOCKET][chapterTranslated] onTranslationResult không được truyền!');
      }
    }
    console.log('[SOCKET][chapterTranslated] ===== HOÀN THÀNH XỬ LÝ =====');
  }, [chapters, onTranslationResult]);

  // Lắng nghe progress từ socket.io
  const handleSocketChapterProgress = useCallback((data) => {
    // data: { chapterNumber, status, progress, jobIndex, totalJobs }
    const idx = chapters.findIndex(ch => ch.chapterNumber === data.chapterNumber);
    if (idx === -1) return;
    
    console.log('[SOCKET][chapterProgress] Nhận progress:', data);
    
    // Cập nhật trạng thái chương
    setChapterStatus(prev => ({
      ...prev,
      [idx]: data.status
    }));
    
    // Cập nhật progress bar dựa trên thông tin từ socket
    if (data.status === 'PROCESSING') {
      // Sử dụng progress từ socket thay vì tính toán local
      setChapterProgresses(prev => ({
        ...prev,
        [idx]: data.progress || 0
      }));
      
      setChapterTranslatingStates(prev => ({
        ...prev,
        [idx]: true
      }));
      
      console.log(`[SOCKET][chapterProgress] Cập nhật progress chương ${data.chapterNumber}: ${data.progress}%`);
    } else if (data.status === 'COMPLETE') {
      setChapterProgresses(prev => ({
        ...prev,
        [idx]: 100
      }));
      setChapterTranslatingStates(prev => ({
        ...prev,
        [idx]: false
      }));
    } else if (data.status === 'FAILED') {
      setChapterProgresses(prev => ({
        ...prev,
        [idx]: 0
      }));
      setChapterTranslatingStates(prev => ({
        ...prev,
        [idx]: false
      }));
    }
    
    // Cập nhật progress tổng nếu có jobIndex và totalJobs
    if (data.jobIndex !== undefined && data.totalJobs) {
      const totalProgress = Math.floor(((data.jobIndex + 1) / data.totalJobs) * 100);
      setManualTotalProgress(totalProgress);
      console.log(`[SOCKET][chapterProgress] Progress tổng: ${totalProgress}% (${data.jobIndex + 1}/${data.totalJobs})`);
    }
  }, [chapters]);

  const userId = userData?.id; // Lấy userId từ userData thay vì localStorage
  const roomId = userId ? `user:${userId}` : `story:${storyId}`;
  useTranslationSocket(roomId, handleSocketChapterTranslated, handleSocketChapterProgress);

  // Debug: Log room ID và socket connection
  useEffect(() => {
    const userId = userData?.id; // Lấy userId từ userData thay vì localStorage
    const roomId = userId ? `user:${userId}` : `story:${storyId}`;
    console.log('[SOCKET-DEBUG] Room ID:', roomId);
    console.log('[SOCKET-DEBUG] User ID:', userId);
    console.log('[SOCKET-DEBUG] Story ID:', storyId);
  }, [storyId, userData?.id]);

  // Log props thay đổi mỗi lần render
  const prevPropsRef = useRef({});
  useEffect(() => {
    const changed = [];
    if (prevPropsRef.current.chapters !== chapters) changed.push('chapters');
    if (prevPropsRef.current.apiKey !== apiKey) changed.push('apiKey');
    if (prevPropsRef.current.model !== modelProp) changed.push('model');
    if (prevPropsRef.current.currentIndex !== currentIndex) changed.push('currentIndex');
    if (prevPropsRef.current.storyId !== storyId) changed.push('storyId');
    if (changed.length > 0) {
      console.log('%c[DEBUG] ChapterList re-render vì props:', 'color: orange', changed);
      const currentProps = { chapters, apiKey, model: modelProp, currentIndex, storyId };
      changed.forEach(key => {
        console.log(`[DEBUG] Giá trị mới của ${key}:`, currentProps[key]);
      });
    }
    prevPropsRef.current = { chapters, apiKey, model: modelProp, currentIndex, storyId };
  });

  // Log các state chính mỗi lần render
  useEffect(() => {
    console.log('%c[DEBUG] ChapterList state:', 'color: green', {
      results,
      chapterStatus,
      translatedCount,
      isTranslatingAll,
      isTranslateAllDisabled,
      manualTotalProgress,
      chapterProgresses,
      chapterTranslatingStates,
    });
  });

  // Log từng state riêng biệt khi thay đổi
  useEffect(() => {
    console.log('[DEBUG][STATE] results thay đổi:', results);
  }, [results]);
  useEffect(() => {
    console.log('[DEBUG][STATE] chapterStatus thay đổi:', chapterStatus);
  }, [chapterStatus]);
  useEffect(() => {
    console.log('[DEBUG][STATE] translatedCount thay đổi:', translatedCount);
  }, [translatedCount]);
  useEffect(() => {
    console.log('[DEBUG][STATE] isTranslatingAll thay đổi:', isTranslatingAll);
  }, [isTranslatingAll]);
  useEffect(() => {
    console.log('[DEBUG][STATE] isTranslateAllDisabled thay đổi:', isTranslateAllDisabled);
  }, [isTranslateAllDisabled]);
  useEffect(() => {
    console.log('[DEBUG][STATE] manualTotalProgress thay đổi:', manualTotalProgress);
  }, [manualTotalProgress]);
  useEffect(() => {
    console.log('[DEBUG][STATE] chapterProgresses thay đổi:', chapterProgresses);
  }, [chapterProgresses]);
  useEffect(() => {
    console.log('[DEBUG][STATE] chapterTranslatingStates thay đổi:', chapterTranslatingStates);
  }, [chapterTranslatingStates]);

  // Log từng prop riêng biệt khi thay đổi
  useEffect(() => {
    console.log('[DEBUG][PROP] chapters thay đổi:', chapters);
  }, [chapters]);
  useEffect(() => {
    console.log('[DEBUG][PROP] apiKey thay đổi:', apiKey);
  }, [apiKey]);
  useEffect(() => {
    console.log('[DEBUG][PROP] modelProp thay đổi:', modelProp);
  }, [modelProp]);
  useEffect(() => {
    console.log('[DEBUG][PROP] currentIndex thay đổi:', currentIndex);
  }, [currentIndex]);
  useEffect(() => {
    console.log('[DEBUG][PROP] storyId thay đổi:', storyId);
  }, [storyId]);
 
  // Progress bar component tối ưu hóa bằng React.memo
  const ChapterProgressBar = React.memo(({ progress }) => (
    <div className="chapter-progress-bar-container">
      <div className="chapter-progress-bar" style={{ width: `${progress}%` }}></div>
      <div className="progress-info">
        <small className="progress-text">
          Đang dịch... {progress.toFixed(0)}%
        </small>
      </div>
    </div>
  ));

  // Component con cho từng chương, tối ưu hóa bằng React.memo
  const ChapterItem = React.memo(({
    ch,
    idx,
    calculatedChapterNumber,
    currentIndex,
    chapterStatus,
    chapterProgress,
    chapterTranslatingState,
    isTranslated,
    duration,
    errorMessage,
    canTranslate,
    isTranslatingAll,
    singleTranslateCooldown,
    translate,
    cancelTranslate,
    handleDeleteChapter,
    handleSelectChapter,
    chaptersPerPage,
    onSelectChapter
  }) => {
    // Khi render trạng thái chương hoặc xử lý kết quả dịch:
    const isFailed = chapterStatus === 'FAILED' || ch?.hasError || !!ch?.translationError;
          return (
            <li key={ch.chapterNumber}>
              <div
          className={`chapter-item ${idx === currentIndex ? "selected" : ""}`}
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
                  <div className="chapter-actions">
                    {/* Nút Dịch chỉ hiện khi không PROCESSING/PENDING */}
              {!(chapterStatus === "PROCESSING" || chapterStatus === "PENDING") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          translate(idx);
                        }}
                        disabled={
                          !canTranslate(idx) ||
                          isTranslatingAll ||
                    chapterStatus === "PROCESSING" ||
                    chapterStatus === "PENDING" ||
                          singleTranslateCooldown > 0
                        }
                  className={`translate-sgn-button ${isTranslated ? "hidden" : ""}`}
                      >
                        {singleTranslateCooldown > 0 ? `📝 Dịch (${singleTranslateCooldown}s)` : "📝 Dịch"}
                      </button>
                    )}
                    {/* Nút hủy dịch chỉ hiện khi PROCESSING hoặc PENDING */}
              {(chapterStatus === "PENDING" || chapterStatus === "PROCESSING") && (
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
              {!(chapterStatus === "PROCESSING" || chapterStatus === "PENDING") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(ch.chapterNumber);
                        }}
                  className={`delete-chapter-button${chapterStatus === "COMPLETE" ? " complete" : ""}`}
                      >
                        ❌ Xoá
                      </button>
                    )}
                  </div>
                </div>
                {/* Hiển thị trạng thái chương */}
          {chapterStatus && (
                  <div className="chapter-status">
                    <span>
                Trạng thái: <b>{chapterStatus}</b>
                    </span>
                    {/* Hiển thị thanh tiến độ nếu đang PENDING hoặc PROCESSING */}
              {(chapterStatus === "PENDING" || chapterStatus === "PROCESSING") && (
                <ChapterProgressBar progress={chapterProgress} />
                    )}
                    {/* Hiển thị label cho từng trạng thái */}
              {chapterStatus === "PENDING" && (
                      <span className="translated-label" style={{ color: "#ffa500" }}>
                        ⏳ Đang xử lý hàng chờ...
                      </span>
                    )}
              {chapterStatus === "PROCESSING" && (
                      <span className="translated-label" >
                        🔄 Đang dịch, vui lòng chờ...
                      </span>
                    )}
              {chapterStatus === "COMPLETE" && (
                      <span className="translated-label">
                        ✅ Đã hoàn thành dịch trong: {duration ? `(${duration.toFixed(1)}s)` : ""}
                      </span>
                    )}
              {chapterStatus === "FAILED" && (
                      <span className="translated-label" style={{ color: "red" }}>
                        ❌ Chương dịch thất bại!
                      </span>
                    )}
                  </div>
                )}
          {errorMessage && (
                  <div className="error-message">
              <p>{errorMessage}</p>
                  </div>
                )}
              </div>
            </li>
    );
  });

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
          const chapterProgress = chapterProgresses[idx] || 0;
          const chapterTranslatingState = chapterTranslatingStates[idx] || false;
          const errorMessage = errorMessages[idx];
          return (
            <ChapterItem
              key={ch.chapterNumber}
              ch={ch}
              idx={idx}
              calculatedChapterNumber={calculatedChapterNumber}
              currentIndex={currentIndex}
              chapterStatus={chapterStatus[idx]}
              chapterProgress={chapterProgress}
              chapterTranslatingState={chapterTranslatingState}
              isTranslated={isTranslated}
              duration={duration}
              errorMessage={errorMessage}
              canTranslate={canTranslate}
              isTranslatingAll={isTranslatingAll}
              singleTranslateCooldown={singleTranslateCooldown}
              translate={translate}
              cancelTranslate={cancelTranslate}
              handleDeleteChapter={handleDeleteChapter}
              handleSelectChapter={handleSelectChapter}
              chaptersPerPage={chaptersPerPage}
              onSelectChapter={onSelectChapter}
            />
          );
        })}
      </ul>
      {/* trang chứa các chương khi vượt quá 10 chương */}
      <div className="pagination">
        {(() => {
          const pageButtons = [];
          const pagesToShowAtEnds = 5;
          const pagesToShowInMiddle = 3;

          // Previous button
          pageButtons.push(
            <button key="prev" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
              &laquo;
            </button>
          );

          if (totalPages <= 6) {
            // Case 1: 6 or fewer pages, show all
            for (let i = 1; i <= totalPages; i++) {
              pageButtons.push(
                <button
                  key={i}
                  className={currentPage === i ? "active" : ""}
                  onClick={() => setCurrentPage(i)}
                >
                  {String(i).padStart(2, "0")}
                </button>
              );
            }
          } else {
            // Case 2: More than 6 pages
            if (currentPage < pagesToShowAtEnds) {
              // 2.1: At the start
              for (let i = 1; i <= pagesToShowAtEnds; i++) {
                pageButtons.push(
                  <button
                    key={i}
                    className={currentPage === i ? "active" : ""}
                    onClick={() => setCurrentPage(i)}
                  >
                    {String(i).padStart(2, "0")}
                  </button>
                );
              }
              pageButtons.push(<span key="end-ellipsis">...</span>);
              pageButtons.push(
                <button key="last" onClick={() => setCurrentPage(totalPages)}>
                  Last
                </button>
              );
            } else if (currentPage > totalPages - (pagesToShowAtEnds - 1)) {
              // 2.3: At the end
              pageButtons.push(
                <button key="first" onClick={() => setCurrentPage(1)}>
                  First
                </button>
              );
              pageButtons.push(<span key="start-ellipsis">...</span>);
              for (let i = totalPages - (pagesToShowAtEnds - 1); i <= totalPages; i++) {
                pageButtons.push(
                  <button
                    key={i}
                    className={currentPage === i ? "active" : ""}
                    onClick={() => setCurrentPage(i)}
                  >
                    {String(i).padStart(2, "0")}
                  </button>
                );
              }
            } else {
              // 2.2: In the middle
              pageButtons.push(
                <button key="first" onClick={() => setCurrentPage(1)}>
                  First
                </button>
              );
              pageButtons.push(<span key="start-ellipsis">...</span>);
              const middleStart = currentPage - Math.floor((pagesToShowInMiddle - 1) / 2);
              const middleEnd = currentPage + Math.floor(pagesToShowInMiddle / 2);
              for (let i = middleStart; i <= middleEnd; i++) {
                pageButtons.push(
                  <button
                    key={i}
                    className={currentPage === i ? "active" : ""}
                    onClick={() => setCurrentPage(i)}
                  >
                    {String(i).padStart(2, "0")}
                  </button>
                );
              }
              pageButtons.push(<span key="end-ellipsis">...</span>);
              pageButtons.push(
                <button key="last" onClick={() => setCurrentPage(totalPages)}>
                  Last
                </button>
              );
            }
          }

          // Next button
          pageButtons.push(
            <button key="next" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
              &raquo;
            </button>
          );
          
          return pageButtons;
        })()}
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
        ⏳ Thời gian dự kiến dịch trang này: <b>{estimatedTimeStr}</b> (Tổng {totalWordsInPage} từ, trung bình {averageTimePerWord} giây/từ)
      </div>
    </div>
  );
};

export default React.memo(ChapterList, (prevProps, nextProps) => {
  return (
    prevProps.chapters === nextProps.chapters &&
    prevProps.apiKey === nextProps.apiKey &&
    prevProps.model?.value === nextProps.model?.value &&
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.storyId === nextProps.storyId
  );
});