import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { flushSync } from "react-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { translateAllChapters } from "../../services/translateChapters";
import { translateSingleChapter } from "../../services/translateSingleChapter";
import { toast } from "react-hot-toast";
import useTranslationProgress from "../../hook/useTranslationProgress";
import useTranslationSocket  from '../../hook/useTranslationSocket';
import "./ChapterList.css";
import { useSession } from '../../context/SessionContext';
import { AuthContext } from '../../context/ConverteContext';
import { API_URL } from '../../config/config';
import { addChapters, getChaptersByStoryIdAndRange, clearChapters } from '../../services/indexedDBService';

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
  chaptersPerPage,
  onPageChange,
  currentPage,
  totalStoryChapters, // Nhận totalStoryChapters từ props
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

  // 🚀 Thêm state để lưu thông tin timing từ BE
  const [queueTiming, setQueueTiming] = useState(null);

  // Sử dụng hook cho tiến độ tổng
  const {
    estimatedDuration,
  } = useTranslationProgress(storyId, 30); // Sử dụng defaultTime = 30s từ hook
  // console.log("đây là thời gian trung bình dịch từ:", averageTimePerWord);
  // Sử dụng hook cho tiến độ từng chương
  const chapterProgressHooks = useRef({});

  // Quản lý trạng thái từng chương
  const [chapterStatus, setChapterStatus] = useState({}); // { [index]: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'CANCELLED' | 'FAILED' }

  // Ref để lưu trạng thái hủy dịch của từng chương
  const cancelMapRef = useRef({});

  // Hàm khởi tạo hook tiến độ cho một chương
  const getChapterProgressHook = (index) => {
    console.log(`[PROGRESS-HOOK] 🔍 Lấy progress hook cho chapter index: ${index}`);
    console.log(`[PROGRESS-HOOK] 📊 Progress hooks hiện tại:`, Object.keys(chapterProgressHooks.current));
    
    if (!chapterProgressHooks.current[index]) {
      console.log(`[PROGRESS-HOOK] 🆕 Tạo mới progress hook cho chapter index: ${index}`);
      
      // Tạo một object giả lập hook thay vì gọi hook thật
      chapterProgressHooks.current[index] = {
        progress: 0,
        isTranslating: false,
        startProgress: () => {
          console.log(`[PROGRESS-HOOK] 🚀 Bắt đầu progress cho chapter ${index}:`, {
            estimatedDuration,
            estimatedTime: estimatedDuration || 30
          });
          
          setChapterTranslatingStates((prev) => {
            const newStates = { ...prev, [index]: true };
            console.log(`[PROGRESS-HOOK] 📊 Cập nhật translating states:`, newStates);
            return newStates;
          });
          setChapterProgresses((prev) => {
            const newProgresses = { ...prev, [index]: 0 };
            console.log(`[PROGRESS-HOOK] 📊 Cập nhật progresses:`, newProgresses);
            return newProgresses;
          });

          console.log(`[PROGRESS] Khởi tạo progress cho chương ${index} - sử dụng thời gian ước tính từ lịch sử`);
          
          // Sử dụng thời gian ước tính đã tính sẵn từ useTranslationProgress hook
          const finalEstimatedDuration = estimatedDuration || 30;
          
          console.log(`[PROGRESS] Chương ${index}: Ước tính ${finalEstimatedDuration.toFixed(1)}s từ lịch sử dịch`);
          console.log(`[PROGRESS-FINAL] estimatedDuration: ${finalEstimatedDuration.toFixed(1)}s`);
          
          // Lưu thời gian bắt đầu và thời gian dự kiến
          const startTime = Date.now();
          chapterProgressHooks.current[index].startTime = startTime;
          chapterProgressHooks.current[index].estimatedDuration = finalEstimatedDuration;
          
          // Cập nhật progress mượt mà với easing mỗi 100ms
          const tickInterval = 100; // ms
          const easingPower = 3; // ease-out (càng cao càng chậm về cuối)
          const interval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000; // giây
            const t = Math.min(elapsedTime / finalEstimatedDuration, 1); // 0 → 1
            const eased = 1 - Math.pow(1 - t, easingPower); // ease-out
            const next = Math.min(eased * 100, 99); // dừng ở 99%

            // Đảm bảo progress không giảm
            const currentProgress = chapterProgressHooks.current[index].currentProgress || 0;
            const newProgress = Math.max(currentProgress, next);
            chapterProgressHooks.current[index].currentProgress = newProgress;

            setChapterProgresses((prev) => {
              const newProgresses = { ...prev, [index]: newProgress };
              // Log tối giản để tránh spam console
              return newProgresses;
            });
          }, tickInterval);

          // Lưu interval để có thể clear sau
          chapterProgressHooks.current[index].interval = interval;
          console.log(`[PROGRESS-HOOK] ✅ Đã bắt đầu progress hook cho chapter ${index}`);
        },
        stopProgress: () => {
          console.log(`[PROGRESS-HOOK] 🛑 Dừng progress cho chapter ${index}`);
          
          setChapterTranslatingStates((prev) => {
            const newStates = { ...prev, [index]: false };
            console.log(`[PROGRESS-HOOK] 📊 Cập nhật translating states khi dừng:`, newStates);
            return newStates;
          });
          setChapterProgresses((prev) => {
            const newProgresses = { ...prev, [index]: 100 };
            console.log(`[PROGRESS-HOOK] 📊 Cập nhật progresses khi dừng:`, newProgresses);
            return newProgresses;
          });

          // Clear interval
          if (chapterProgressHooks.current[index].interval) {
            clearInterval(chapterProgressHooks.current[index].interval);
            console.log(`[PROGRESS-HOOK] 🧹 Đã clear interval cho chapter ${index}`);
          }
          console.log(`[PROGRESS-HOOK] ✅ Đã dừng progress hook cho chapter ${index}`);
        },
      };
    } else {
      console.log(`[PROGRESS-HOOK] ✅ Đã có progress hook cho chapter index: ${index}`);
    }
    
    console.log(`[PROGRESS-HOOK] 📤 Trả về progress hook cho chapter ${index}:`, {
      hasStartProgress: !!chapterProgressHooks.current[index].startProgress,
      hasStopProgress: !!chapterProgressHooks.current[index].stopProgress,
      currentProgress: chapterProgressHooks.current[index].currentProgress || 0
    });
    
    return chapterProgressHooks.current[index];
  };

  //khu vực phân Trang
  // const [currentPage, setCurrentPage] = useState(1); // chaptersPerPage đã được truyền từ props
  
  // Sắp xếp chapters theo chapterNumber tăng dần
  const sortedChapters = [...chapters].sort(
    (a, b) => a.chapterNumber - b.chapterNumber
  );
  // Tính totalPages dựa trên tổng số chương của truyện, không phải chỉ các chương hiện tại
  const totalPages = Math.ceil(totalStoryChapters / chaptersPerPage);

  const startIdx = (currentPage - 1) * chaptersPerPage; // Sửa lỗi cú pháp
  const endIdx = startIdx + chaptersPerPage;
  const currentChapters = sortedChapters; // chapters đã được Backend phân trang (sửa lại để không slice hai lần)

  // Debug pagination
  // console.log(`[ChapterList] 📊 Debug pagination:`, {
  //   totalChapters: sortedChapters.length,
  //   chaptersPerPage,
  //   totalPages,
  //   currentPage,
  //   startIdx,
  //   endIdx,
  //   currentChaptersCount: currentChapters.length,
  //   currentChapters: currentChapters.map(ch => ch.chapterNumber)
  // });

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

  // 🚀 Tự động cuộn đến chương hiện tại khi currentIndex thay đổi
  useEffect(() => {
    if (currentIndex !== undefined) {
      console.log(`[ChapterList] 🎯 Chương hiện tại: ${currentIndex + 1} (index: ${currentIndex})`);
      
      // 🚀 Scroll đến chương hiện tại
      setTimeout(() => {
        const chapterElement = document.querySelector(`[data-chapter-index="${currentIndex}"]`);
        if (chapterElement) {
          chapterElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log(`[ChapterList] 📜 Đã scroll đến chương ${currentIndex + 1}`);
        }
      }, 100); // Thêm một độ trễ nhỏ để đảm bảo render xong
    }
  }, [currentIndex]); // Chỉ phụ thuộc vào currentIndex

  // Debug: Test case cho logic tính toán trang
  useEffect(() => {
    console.log(`[ChapterList] 🧪 Test case tính toán trang:`, {
      'Chương 1 (index 0)': Math.floor(0 / 10) + 1, // Trang 1
      'Chương 10 (index 9)': Math.floor(9 / 10) + 1, // Trang 1
      'Chương 11 (index 10)': Math.floor(10 / 10) + 1, // Trang 2
      'Chương 20 (index 19)': Math.floor(19 / 10) + 1, // Trang 2
      'Chương 21 (index 20)': Math.floor(20 / 10) + 1, // Trang 3
    });
  }, []);

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
    console.log(`[ChapterList] 🚀 handleChapterStartProgress được gọi cho chapter index: ${index}`);
    console.log(`[ChapterList] 📊 Trạng thái chapter ${index} trước khi start:`, {
      chapterStatus: chapterStatus[index],
      chapterProgress: chapterProgresses[index],
      chapterTranslatingState: chapterTranslatingStates[index]
    });
    
    const chapterHook = getChapterProgressHook(index);
    console.log(`[ChapterList] 🔍 Chapter hook nhận được:`, {
      hasStartProgress: !!chapterHook.startProgress,
      hasStopProgress: !!chapterHook.stopProgress
    });
    
    chapterHook.startProgress();
    
    console.log(`[ChapterList] ✅ Đã gọi startProgress cho chapter ${index}`);
  };
  
  const handleChapterStopProgress = (index) => {
    console.log(`[ChapterList] 🛑 handleChapterStopProgress được gọi cho chapter index: ${index}`);
    console.log(`[ChapterList] 📊 Trạng thái chapter ${index} trước khi stop:`, {
      chapterStatus: chapterStatus[index],
      chapterProgress: chapterProgresses[index],
      chapterTranslatingState: chapterTranslatingStates[index]
    });
    
    const chapterHook = getChapterProgressHook(index);
    console.log(`[ChapterList] 🔍 Chapter hook nhận được:`, {
      hasStartProgress: !!chapterHook.startProgress,
      hasStopProgress: !!chapterHook.stopProgress
    });
    
    chapterHook.stopProgress();
    
    console.log(`[ChapterList] ✅ Đã gọi stopProgress cho chapter ${index}`);
  };

  // Hàm dịch tất cả các chương
  const translateAll = async () => {
    setIsTranslateAllDisabled(true);
    console.time("⏱️ Thời gian dịch toàn bộ");

    setIsTranslatingAll(true);
    // 🚀 Reset queue timing khi bắt đầu dịch mới
    setQueueTiming(null);

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
      const result = await translateAllChapters({
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
        onUpdateTotalProgress: (percent) => {}, // Không cần total progress cho single chapter
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
      
      // 🚀 Xử lý thông tin timing từ BE
      if (result && result.timing) {
        setQueueTiming(result.timing);
        console.log(`[ChapterList] 📊 Nhận thông tin timing từ BE:`, result.timing);
        
        // Hiển thị toast thông báo thông tin timing
        console.log(
          `🚀 Đã thêm ${result.jobCount} chương vào queue! 
          ⏱️ Thời gian ước tính: ${result.timing.estimatedTotalTime}s 
          🔧 Workers: ${result.timing.concurrency} song song 
          ⚡ Hiệu quả: Giảm ${result.timing.efficiency}% thời gian`,
          { duration: 4000 }
        );
      }
      
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
  const translate = async (index) => {
    console.log(`[CHAPTER ${index}] ===== BẮT ĐẦU DỊCH 1 CHƯƠNG =====`);
    console.log(`[CHAPTER ${index}] 📊 estimatedDuration từ hook:`, estimatedDuration);
    console.log(`[CHAPTER ${index}] 📊 storyId:`, storyId);
    
    cancelMapRef.current[index] = false; // Reset trạng thái hủy khi dịch lại
    
    // Nếu không được phép dịch thì return luôn, không chạy tiếp
    if (!canTranslate(index)) {
      console.log(`[CHAPTER ${index}] ❌ Không thể dịch chương này`);
      return;
    }
    
    // Nếu chương đang PROCESSING hoặc PENDING thì không cho dịch lại
    if (
      chapterStatus[index] === "PROCESSING" ||
      chapterStatus[index] === "PENDING"
    ) {
      console.log(`[CHAPTER ${index}] ❌ Chương đang trong quá trình dịch`);
      return;
    }
    
    // Nếu đang cooldown dịch lẻ thì không cho dịch
    if (singleTranslateCooldown > 0) {
      console.log(`[CHAPTER ${index}] ❌ Đang trong cooldown: ${singleTranslateCooldown}s`);
      return;
    }

    // Log model object và rpm
    console.log('[ChapterList] Bấm dịch chương', index, 'Model:', modelObject, 'RPM:', modelObject?.rpm);

    // Bắt đầu cooldown dịch lẻ
    startSingleTranslateCooldown();
    const cooldownTime = Math.ceil(60 / (modelObject?.rpm || 1));
    console.log(`[ChapterList] Bấm dịch chương ${index}, Cooldown: ${cooldownTime}s (RPM: ${modelObject?.rpm})`);

    // Đặt trạng thái PENDING
    setChapterStatus((prev) => {
      const newStatus = { ...prev, [index]: "PENDING" };
      console.log(`[SET][PENDING] idx=${index}, status mới=${newStatus[index]}, cancelFlag=${cancelMapRef.current[index]}`);
      return newStatus;
    });

    // Reset error message
    setErrorMessages((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });

    // Delay nhỏ để user có thể bấm hủy ngay sau khi bấm dịch
    setTimeout(async () => {
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

      // Lấy progress hook cho chương này
      const chapterHook = getChapterProgressHook(index);
      console.log(`[CHAPTER ${index}] 🔧 Progress hook:`, {
        hasStartProgress: !!chapterHook.startProgress,
        hasStopProgress: !!chapterHook.stopProgress,
        estimatedDuration: estimatedDuration
      });

      // Bắt đầu progress với thời gian ước tính từ hook
      chapterHook.startProgress(); // Bắt đầu tiến độ cho chương này

      // Sử dụng translateSingleChapter thay vì queue
      try {
        await translateSingleChapter({
        index,
        chapters,
        apiKey,
        model: modelObject,
        storyId,
        setProgress: (progress) => {
            // Cập nhật progress từ translateSingleChapter
          setChapterProgresses((prev) => ({ ...prev, [index]: progress }));
        },
          setResults,
        setErrorMessages,
        setTranslatedCount,
          setTotalProgress: () => {}, // Không cần total progress cho single chapter
          onTranslationResult,
        onSelectChapter,
          onComplete: async (duration, error) => {
            // Khi hoàn thành, dừng progress và cập nhật trạng thái
            if (error) {
              console.error(`[CHAPTER ${index}] ❌ Lỗi dịch:`, error.message);
              setChapterStatus((prev) => ({ ...prev, [index]: "FAILED" }));
              setErrorMessages((prev) => ({ ...prev, [index]: error.message }));
              toast.error(`Lỗi dịch chương ${index + 1}: ${error.message}`);
            } else {
              console.log(`[CHAPTER ${index}] ✅ Hoàn thành dịch trong ${duration}s`);
              console.log(`[CHAPTER ${index}] 📊 estimatedDuration đã sử dụng:`, estimatedDuration);
              setChapterStatus((prev) => ({ ...prev, [index]: "COMPLETE" }));
              setTranslatedCount((prev) => prev + 1);
              toast.success(`Đã dịch xong chương ${index + 1}`);

              // 🚀 Lưu chương đã dịch vào IndexedDB
              const chapterToCache = {
                ...chapters[index],
                translatedContent: results[index]?.translatedContent, // Lấy nội dung đã dịch từ results state
                translatedTitle: results[index]?.translatedTitle, // Lấy tiêu đề đã dịch từ results state
                status: "COMPLETE",
                hasError: false,
                translationError: null,
              };
              console.log(`[CHAPTER ${index}] 💾 Lưu chương vào IndexedDB:`, chapterToCache);
              await addChapters([chapterToCache]);
            }
            chapterHook.stopProgress();
          },
        });
        
      } catch (error) {
        console.error(`[CHAPTER ${index}] Lỗi khi dịch:`, error);
        setChapterStatus((prev) => ({ ...prev, [index]: "FAILED" }));
        setErrorMessages((prev) => ({ ...prev, [index]: error.message }));
          chapterHook.stopProgress();
        toast.error(`Lỗi khi dịch chương: ${error.message}`);
      }
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
        console.log(`[SET][CANCELLED] idx=${index}, status mới=${newStatus[index]}`);
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

    onPageChange(num); // Gọi onPageChange prop
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
    onPageChange(newPage); // Gọi onPageChange prop
    onSelectChapter?.(targetIndex); // Vẫn gọi onSelectChapter để cuộn
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
  const handleSelectChapter = (index) => {
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

    const calculatedPage = Math.floor(actualIndex / chaptersPerPage) + 1;
    if (calculatedPage !== currentPage) {
      console.log(`[ChapterList] 🔄 Tự động cập nhật trang từ ${currentPage} → ${calculatedPage} cho chương ${index}`);
      onPageChange(calculatedPage); // Gọi onPageChange prop
    }
    
    onSelectChapter?.(actualIndex); // Truyền index thực tế để cuộn
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

  // Sử dụng thời gian ước tính từ hook
  const estimatedTime = Math.round(estimatedDuration || 30); // giây
  
  
  
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
      `Ước tính thời gian dịch 1 trang: ${estimatedTimeStr} (Dựa trên lịch sử dịch: ${estimatedDuration?.toFixed(1) || 30}s)`
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
  const handleSocketChapterTranslated = useCallback(async (data) => {
    console.log('🎯 [ChapterList] ===== CALLBACK ĐƯỢC GỌI ====');
    console.log('[ChapterList] 📥 Data nhận được trong callback:', data);
    // Log kiểm tra glossary nếu có trả về qua socket
    if (data && typeof data.translatedContent === 'string') {
      const hasGlossaryKeyword = /THƯ VIỆN TỪ MỚI/i.test(data.translatedContent);
      const hasGlossaryEmoji = /📚/.test(data.translatedContent);
      console.log(`[ChapterList] 🔎 Socket content: hasGlossaryKeyword=${hasGlossaryKeyword}, hasGlossaryEmoji=${hasGlossaryEmoji}`);
    }
    console.log('[ChapterList] 🔍 Kiểm tra callback có tồn tại:', !!handleSocketChapterTranslated);
    console.log('[ChapterList] 🔍 Callback function type:', typeof handleSocketChapterTranslated);
    console.log('[ChapterList] 🔍 Callback function name:', handleSocketChapterTranslated?.name || 'anonymous');
    
    // Tìm chapter index dựa trên chapterNumber thay vì jobIndex
    const chapterIndex = chapters.findIndex(ch => ch.chapterNumber === data.chapterNumber);
    
    console.log('[ChapterList] 🔍 Tìm chapter index:', {
      chapterNumber: data.chapterNumber,
      foundIndex: chapterIndex,
      totalChapters: chapters.length,
      chapters: chapters.map(ch => ({ number: ch.chapterNumber, title: ch.chapterName }))
    });
    
    if (chapterIndex === -1) {
      console.warn(`[ChapterList] ⚠️ Không tìm thấy chapter ${data.chapterNumber} trong danh sách chapters`);
      console.warn('[ChapterList] ⚠️ Danh sách chapters hiện tại:', chapters.map(ch => ch.chapterNumber));
      return;
    }
    
    console.log(`[ChapterList] ✅ Chương ${data.chapterNumber} (index: ${chapterIndex}) hoàn thành dịch từ BE`);
    
    // Cập nhật kết quả dịch
    if (data.translatedContent || data.translatedTitle) {
      console.log('[ChapterList] 📝 Cập nhật results với data:', {
        chapterIndex,
        hasTranslatedTitle: !!data.translatedTitle,
        hasTranslatedContent: !!data.translatedContent,
        titleLength: data.translatedTitle?.length || 0,
        contentLength: data.translatedContent?.length || 0
      });
      // Trích preview glossary nếu backend chưa loại bỏ
      if (data.translatedContent) {
        const match = data.translatedContent.match(/(?:📚\s*)?THƯ VIỆN TỪ MỚI:\s*[\r\n]+([\s\S]*?)$/i);
        if (match) {
          const glPreview = match[1].split('\n').slice(0, 5);
          console.log('[ChapterList] 📚 Glossary preview (socket content):', glPreview);
        } else {
          console.log('[ChapterList] 📚 Không thấy block THƯ VIỆN TỪ MỚI trong socket content (đã bị BE loại bỏ là đúng)');
        }
      }
      const titlePreview = (data.translatedTitle || '').replace(/\s+/g, ' ').slice(0, 120);
      const contentPreview = (data.translatedContent || '').replace(/\s+/g, ' ').slice(0, 250);
      console.log(`[ChapterList] 🧩 Preview chương ${data.chapterNumber}:`);
      console.log(`              • Tiêu đề: "${titlePreview}"`);
      console.log(`              • Nội dung[0..250]: "${contentPreview}"`);
      
      setResults((prev) => {
        const newResults = {
        ...prev,
        [chapterIndex]: {
          translatedContent: data.translatedContent,
          translatedTitle: data.translatedTitle,
          duration: data.duration,
          hasError: data.hasError,
          error: data.error
        }
        };
        console.log('[ChapterList] 📊 Results mới:', newResults);
        return newResults;
      });


      // 🚀 Lưu chương đã dịch vào IndexedDB khi nhận từ Socket
      const chapterToCache = {
        ...chapters[chapterIndex],
        translatedContent: data.translatedContent,
        translatedTitle: data.translatedTitle,
        status: "COMPLETE",
        hasError: data.hasError,
        translationError: data.error,
      };
      console.log(`[ChapterList] 💾 Lưu chương ${data.chapterNumber} từ Socket vào IndexedDB:`, chapterToCache);
      await addChapters([chapterToCache]);


      // 🔄 Đẩy kết quả lên cha (TranslatorApp) để merge vào chapters và hiển thị ở Title/Viewer
      try {
        if (typeof onTranslationResult === 'function') {
          console.log('[ChapterList] 📤 Gọi onTranslationResult để cập nhật chapters ở cấp cha');
          onTranslationResult(
            chapterIndex,
            data.translatedContent,
            data.translatedTitle,
            data.duration
          );
        } else {
          console.warn('[ChapterList] ⚠️ onTranslationResult không phải là function');
        }
      } catch (err) {
        console.error('[ChapterList] ❌ Lỗi khi gọi onTranslationResult:', err);
      }
    }
    
    // Cập nhật trạng thái và dừng progress
    console.log('[ChapterList] 🔄 Cập nhật trạng thái chapter:', chapterIndex);
    setChapterStatus((prev) => {
      const newStatus = { ...prev, [chapterIndex]: "COMPLETE" };
      console.log('[ChapterList] 📊 Chapter status mới:', newStatus);
      return newStatus;
    });
    
    setChapterTranslatingStates((prev) => {
      const newStates = { ...prev, [chapterIndex]: false };
      console.log('[ChapterList] 📊 Chapter translating states mới:', newStates);
      return newStates;
    });
    
    // ✅ Tăng progress lên 100% khi hoàn thành
    setChapterProgresses((prev) => {
      const newProgresses = { ...prev, [chapterIndex]: 100 };
      console.log(`[ChapterList] ✅ Progress hoàn thành: ${prev[chapterIndex] || 0}% → 100%`);
      return newProgresses;
    });
    
    // Dừng progress hook
    const chapterHook = getChapterProgressHook(chapterIndex);
    console.log('[ChapterList] 🛑 Dừng progress hook cho chapter:', chapterIndex);
    chapterHook.stopProgress();
    
    // Tăng số chương đã dịch
    setTranslatedCount((prev) => {
      const newCount = prev + 1;
      console.log('[ChapterList] 📈 Tăng translated count:', prev, '->', newCount);
      return newCount;
    });
    
    console.log(`[ChapterList] ✅ Đã xử lý kết quả dịch chương ${data.chapterNumber} (index: ${chapterIndex})`);
    console.log('🎯 [ChapterList] ===== CALLBACK HOÀN THÀNH ====');
  }, [chapters]);

  // Lắng nghe progress từ socket.io
  const handleSocketChapterProgress = useCallback((data) => {
    console.log('📊 [ChapterList] ===== PROGRESS CALLBACK ĐƯỢC GỌI ====');
    console.log('[ChapterList] 📥 Progress data nhận được:', data);
    console.log('[ChapterList] 🔍 Kiểm tra progress callback có tồn tại:', !!handleSocketChapterProgress);
    console.log('[ChapterList] 🔍 Progress callback type:', typeof handleSocketChapterProgress);
    
    // Tìm chapter index dựa trên chapterNumber
    const chapterIndex = chapters.findIndex(ch => ch.chapterNumber === data.chapterNumber);
    
    console.log('[ChapterList] 🔍 Tìm chapter index cho progress:', {
      chapterNumber: data.chapterNumber,
      foundIndex: chapterIndex,
      totalChapters: chapters.length
    });
    
    if (chapterIndex === -1) {
      console.warn(`[ChapterList] ⚠️ Không tìm thấy chapter ${data.chapterNumber} trong danh sách chapters`);
      return;
    }
    
    console.log(`[ChapterList] 📊 Progress chương ${data.chapterNumber} (index: ${chapterIndex}): ${data.progress}%`);
    
    // 🚫 KHÔNG cập nhật progress từ BE - để progress hook chạy tự nhiên theo ước tính
    console.log(`[ChapterList] 🚫 Bỏ qua progress từ socket - ưu tiên thời gian ước tính`);
    
    // Chỉ cập nhật trạng thái nếu cần
    if (data.status === 'PROCESSING') {
      console.log('[ChapterList] 🔄 Cập nhật status thành PROCESSING cho chapter:', chapterIndex);
      setChapterStatus((prev) => {
        const newStatus = { ...prev, [chapterIndex]: "PROCESSING" };
        console.log('[ChapterList] 📊 Status mới:', newStatus);
        return newStatus;
      });
      setChapterTranslatingStates((prev) => {
        const newStates = { ...prev, [chapterIndex]: true };
        console.log('[ChapterList] 📊 Translating states mới:', newStates);
        return newStates;
      });
    } else if (data.status === 'COMPLETE') {
      console.log('[ChapterList] ✅ Cập nhật status thành COMPLETE cho chapter:', chapterIndex);
      setChapterStatus((prev) => {
        const newStatus = { ...prev, [chapterIndex]: "COMPLETE" };
        console.log('[ChapterList] 📊 Status mới:', newStatus);
        return newStatus;
      });
      setChapterTranslatingStates((prev) => {
        const newStates = { ...prev, [chapterIndex]: false };
        console.log('[ChapterList] 📊 Translating states mới:', newStates);
        return newStates;
      });
    }
    
    console.log('📊 [ChapterList] ===== PROGRESS CALLBACK HOÀN THÀNH ====');
  }, [chapters]);

  // Lắng nghe event chapterStarted từ socket.io
  const handleSocketChapterStarted = useCallback((data) => {
    console.log('🚀 [ChapterList] ===== STARTED CALLBACK ĐƯỢC GỌI ====');
    console.log('[ChapterList] 📥 Started data nhận được:', data);
    console.log('[ChapterList] 🔍 Kiểm tra started callback có tồn tại:', !!handleSocketChapterStarted);
    console.log('[ChapterList] 🔍 Started callback type:', typeof handleSocketChapterStarted);
    
    // Tìm chapter index dựa trên chapterNumber
    const chapterIndex = chapters.findIndex(ch => ch.chapterNumber === data.chapterNumber);
    
    console.log('[ChapterList] 🔍 Tìm chapter index cho started:', {
      chapterNumber: data.chapterNumber,
      foundIndex: chapterIndex,
      totalChapters: chapters.length
    });
    
    if (chapterIndex === -1) {
      console.warn(`[ChapterList] ⚠️ Không tìm thấy chapter ${data.chapterNumber} trong danh sách chapters`);
      return;
    }
    
    console.log(`[ChapterList] 🚀 Chương ${data.chapterNumber} (index: ${chapterIndex}) bắt đầu dịch từ BE (RPM: ${data.modelRpm})`);
    
    // Bắt đầu progress bar ngay khi nhận được sự kiện từ BE
    console.log('[ChapterList] 🔄 Bắt đầu progress cho chapter:', chapterIndex);
    setChapterStatus((prev) => {
      const newStatus = { ...prev, [chapterIndex]: "PROCESSING" };
      console.log('[ChapterList] 📊 Status mới:', newStatus);
      return newStatus;
    });
    
    setChapterTranslatingStates((prev) => {
      const newStates = { ...prev, [chapterIndex]: true };
      console.log('[ChapterList] 📊 Translating states mới:', newStates);
      return newStates;
    });
    
    setChapterProgresses((prev) => {
      const newProgresses = { ...prev, [chapterIndex]: 0 };
      //console.log('[ChapterList] 📊 Progress mới:', newProgresses);
      return newProgresses;
    });
    
    // Bắt đầu progress hook với thông tin từ BE
    const chapterHook = getChapterProgressHook(chapterIndex);
    console.log('[ChapterList] 🚀 Bắt đầu progress hook cho chapter:', chapterIndex);
    chapterHook.startProgress();
    
    console.log(`[ChapterList] ✅ Đã bắt đầu progress cho chương ${data.chapterNumber} (index: ${chapterIndex})`);
    console.log('🚀 [ChapterList] ===== STARTED CALLBACK HOÀN THÀNH ====');
  }, [chapters]);

  const userId = userData?.id; // Lấy userId từ userData thay vì localStorage
  const roomId = userId ? `user:${userId}` : `story:${storyId}`;
  
  console.log('[ChapterList] 🔌 ===== KHỞI TẠO SOCKET HOOK ====');
  
  
  // Bật lại socket để sử dụng real-time progress
  const socketRef = useTranslationSocket(roomId, handleSocketChapterTranslated, handleSocketChapterProgress, handleSocketChapterStarted);
  
  console.log('[ChapterList] 🔌 Socket hook đã được khởi tạo:', {
    socketRef,
    socketConnected: socketRef?.connected,
    socketId: socketRef?.id
  });
  console.log('[ChapterList] 🔌 ===== HOÀN THÀNH KHỞI TẠO SOCKET ====');

  // Debug: Log room ID và socket connection
  useEffect(() => {
    const userId = userData?.id; // Lấy userId từ userData thay vì localStorage
    const roomId = userId ? `user:${userId}` : `story:${storyId}`;
    console.log('[PROGRESS] Room ID:', roomId);
    console.log('[PROGRESS] User ID:', userId);
    console.log('[PROGRESS] Story ID:', storyId);
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
      //console.log('%c[DEBUG] ChapterList re-render vì props:', 'color: orange', changed);
      const currentProps = { chapters, apiKey, model: modelProp, currentIndex, storyId };
      changed.forEach(key => {
        //console.log(`[DEBUG] Giá trị mới của ${key}:`, currentProps[key]);
      });
    }
    prevPropsRef.current = { chapters, apiKey, model: modelProp, currentIndex, storyId };
  });

  // // Log các state chính mỗi lần render
  // useEffect(() => {
  //   console.log('%c[DEBUG] ChapterList state:', 'color: green', {
  //     results,
  //     chapterStatus,
  //     translatedCount,
  //     isTranslatingAll,
  //     isTranslateAllDisabled,
  //     chapterProgresses,
  //     chapterTranslatingStates,
  //   });
  // });

  // // Log từng state riêng biệt khi thay đổi
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] results thay đổi:', results);
  // }, [results]);
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] chapterStatus thay đổi:', chapterStatus);
  // }, [chapterStatus]);
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] translatedCount thay đổi:', translatedCount);
  // }, [translatedCount]);
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] isTranslatingAll thay đổi:', isTranslatingAll);
  // }, [isTranslatingAll]);
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] isTranslateAllDisabled thay đổi:', isTranslateAllDisabled);
  // }, [isTranslateAllDisabled]);
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] chapterProgresses thay đổi:', chapterProgresses);
  // }, [chapterProgresses]);
  // useEffect(() => {
  //   console.log('[DEBUG][STATE] chapterTranslatingStates thay đổi:', chapterTranslatingStates);
  // }, [chapterTranslatingStates]);

  // // Log từng prop riêng biệt khi thay đổi
  // useEffect(() => {
  //   console.log('[DEBUG][PROP] chapters thay đổi:', chapters);
  // }, [chapters]);
  // useEffect(() => {
  //   console.log('[DEBUG][PROP] apiKey thay đổi:', apiKey);
  // }, [apiKey]);
  // useEffect(() => {
  //   console.log('[DEBUG][PROP] modelProp thay đổi:', modelProp);
  // }, [modelProp]);
  // useEffect(() => {
  //   console.log('[DEBUG][PROP] currentIndex thay đổi:', currentIndex);
  // }, [currentIndex]);
  // useEffect(() => {
  //   console.log('[DEBUG][PROP] storyId thay đổi:', storyId);
  // }, [storyId]);
 

 
  // Progress bar component tối ưu hóa bằng React.memo
  const ChapterProgressBar = React.memo(({ progress }) => {
    //console.log(`[PROGRESS-BAR] 🎨 Render progress bar với progress: ${progress}%`);
    
    return (
    <div className="chapter-progress-bar-container">
      <div className="chapter-progress-bar" style={{ width: `${progress}%` }}></div>
      <div className="progress-info">
        <small className="progress-text">
          Đang dịch... {progress.toFixed(0)}%
        </small>
      </div>
    </div>
    );
  });

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
    // console.log(`[ChapterItem] 🎨 Render ChapterItem ${calculatedChapterNumber}:`, {
    //   chapterNumber: ch.chapterNumber,
    //   chapterStatus,
    //   chapterProgress,
    //   chapterTranslatingState,
    //   isTranslated,
    //   duration,
    //   shouldShowProgress: chapterStatus === "PENDING" || chapterStatus === "PROCESSING"
    // });
    
    // Khi render trạng thái chương hoặc xử lý kết quả dịch:
    const isFailed = chapterStatus === 'FAILED' || ch?.hasError || !!ch?.translationError;
          return (
            <li key={ch.chapterNumber} data-chapter-index={idx}>
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
                        ✅ Đã hoàn thành dịch
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

  // Hàm xử lý click pagination
  const handlePageChange = useCallback((newPage) => {
    console.log(`[ChapterList] 🔄 Click pagination: ${currentPage} → ${newPage}`);
    
    // Gọi onPageChange prop để cập nhật trang ở component cha (Translate.jsx)
    onPageChange(newPage);

  }, [currentPage, onPageChange]); // Chỉ phụ thuộc vào currentPage và onPageChange

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
          const currentChapterStatus = chapterStatus[idx];
          
                      
          
          return (
            <ChapterItem
              key={ch.chapterNumber}
              ch={ch}
              idx={idx}
              calculatedChapterNumber={calculatedChapterNumber}
              currentIndex={currentIndex}
              chapterStatus={currentChapterStatus}
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
            <button key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
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
                  onClick={() => handlePageChange(i)}
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
                    onClick={() => handlePageChange(i)}
                  >
                    {String(i).padStart(2, "0")}
                  </button>
                );
              }
              pageButtons.push(<span key="end-ellipsis">...</span>);
              pageButtons.push(
                <button key="last" onClick={() => handlePageChange(totalPages)}>
                  Last
                </button>
              );
            } else if (currentPage > totalPages - (pagesToShowAtEnds - 1)) {
              // 2.3: At the end
              pageButtons.push(
                <button key="first" onClick={() => handlePageChange(1)}>
                  First
                </button>
              );
              pageButtons.push(<span key="start-ellipsis">...</span>);
              for (let i = totalPages - (pagesToShowAtEnds - 1); i <= totalPages; i++) {
                pageButtons.push(
                  <button
                    key={i}
                    className={currentPage === i ? "active" : ""}
                    onClick={() => handlePageChange(i)}
                  >
                    {String(i).padStart(2, "0")}
                  </button>
                );
              }
            } else {
              // 2.2: In the middle
              pageButtons.push(
                <button key="first" onClick={() => handlePageChange(1)}>
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
                    onClick={() => handlePageChange(i)}
                  >
                    {String(i).padStart(2, "0")}
                  </button>
                );
              }
              pageButtons.push(<span key="end-ellipsis">...</span>);
              pageButtons.push(
                <button key="last" onClick={() => handlePageChange(totalPages)}>
                  Last
                </button>
              );
            }
          }

          // Next button
          pageButtons.push(
            <button key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
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
      {errorMessages.general && (
        <div className="general-error">
          <p>{errorMessages.general}</p>
        </div>
      )}
      {/* Thời gian dự kiến dịch trang */}
      <div className="total-estimated-time">
      {queueTiming && (
        <div>
          <p>⏳ Thời gian dự kiến dịch trang này: <b>{queueTiming.estimatedTotalTime}</b></p>
          <p>🔧 Số lượng batch: <b>{queueTiming.totalJobs}</b></p>
          <p>🚀 Queue Timing: {queueTiming.estimatedTotalTime}s</p>
          <p>⚡ Hiệu quả: <b>Giảm {queueTiming.efficiency}%</b> thời gian</p>
            
            
          </div>
        )}
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