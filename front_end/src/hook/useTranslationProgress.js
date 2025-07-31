import { useState, useEffect, useRef } from 'react';

// Lưu trữ lịch sử thời gian dịch và số từ trong localStorage
const STORAGE_KEY = 'translation_history_v2';
const MAX_HISTORY = 6;
const DEFAULT_TIME_PER_WORD = 0.05; // 50ms/từ (thực tế hơn)

const useTranslationProgress = (defaultTime = 15) => {
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [averageTimePerWord, setAverageTimePerWord] = useState(DEFAULT_TIME_PER_WORD);
  const startTime = useRef(null);
  const intervalRef = useRef(null);
  const [currentWordCount, setCurrentWordCount] = useState(1); // tránh chia 0

  // Lấy lịch sử từ localStorage khi khởi tạo
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const history = JSON.parse(savedHistory); // Mảng các object: { duration, wordCount }

        if (Array.isArray(history) && history.length > 0) {
          // Lọc các bản ghi hợp lệ: duration > 0, duration < 60s/từ, wordCount > 0
          const validHistory = history.filter(h => {
            const perWord = h.duration / Math.max(h.wordCount || 1, 1);
            return (
              h.duration > 0 &&
              h.wordCount > 0 &&
              perWord > 0 &&
              perWord < 60 // loại bỏ bản ghi quá bất thường
            );
          });

          if (validHistory.length > 0) {
            const lastN = validHistory.slice(-MAX_HISTORY);
            const totalDuration = lastN.reduce(
              (sum, h) => sum + (h.duration || 0),
              0
            );
            const totalWords = lastN.reduce(
              (sum, h) => sum + Math.max(h.wordCount || 0, 1),
              0
            );
            const avg = totalDuration / totalWords;
            setAverageTimePerWord(avg);
          } else {
            setAverageTimePerWord(DEFAULT_TIME_PER_WORD);
          }
        } else {
          setAverageTimePerWord(DEFAULT_TIME_PER_WORD);
        }
      } else {
        setAverageTimePerWord(DEFAULT_TIME_PER_WORD);
      }
    }catch (error) {
      console.error('Lỗi khi đọc lịch sử dịch:', error);
      setAverageTimePerWord(DEFAULT_TIME_PER_WORD);
    }
  }, []);

  // Hàm cập nhật lịch sử dịch
  const updateTranslationHistory = (duration, wordCount) => {
    try {
      // Lấy lịch sử hiện tại
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      let history = savedHistory ? JSON.parse(savedHistory) : [];

      // Chỉ lưu bản ghi hợp lệ
      if (
        duration > 0 &&
        wordCount > 0 &&
        duration / wordCount > 0 &&
        duration / wordCount < 60
      ) {
        history.push({ duration, wordCount });
      }

      // Giới hạn số lượng lịch sử
      if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
      }

      // Lưu lại vào localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

      // Tính lại trung bình thời gian dịch 1 từ
      const validHistory = history.filter(h => {
        const perWord = h.duration / Math.max(h.wordCount || 1, 1);
        return (
          h.duration > 0 &&
          h.wordCount > 0 &&
          perWord > 0 &&
          perWord < 60
        );
      });
      if (validHistory.length > 0) {
        const lastN = validHistory.slice(-MAX_HISTORY);
        const totalDuration = lastN.reduce(
          (sum, h) => sum + (h.duration || 0),
          0
        );
        const totalWords = lastN.reduce(
          (sum, h) => sum + Math.max(h.wordCount || 0, 1),
          0
        );
        const avg = totalDuration / totalWords;
        console.log('📊 Lịch sử dịch:', validHistory);
        console.log('⏱️ Trung bình thời gian dịch 1 từ:', avg.toFixed(3), 'giây');
        
        // Đảm bảo avg không quá nhỏ hoặc quá lớn
        const clampedAvg = Math.max(Math.min(avg, 1.0), 0.01); // Giới hạn từ 10ms đến 1s/từ
        setAverageTimePerWord(clampedAvg);
        console.log('🔧 Giá trị cuối cùng:', clampedAvg.toFixed(3), 'giây/từ');
      } else {
        setAverageTimePerWord(DEFAULT_TIME_PER_WORD);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật lịch sử dịch:', error);
      setAverageTimePerWord(DEFAULT_TIME_PER_WORD);
    }
  };

  // Hàm khởi động tiến độ (truyền vào số từ chương hiện tại)
  const startProgress = (wordCount = 1) => {
    setIsTranslating(true);
    setProgress(0);
    setCurrentWordCount(wordCount);
    startTime.current = Date.now();

    // Tính thời gian dự kiến
    const expectedDuration = wordCount * averageTimePerWord || defaultTime;

    // Cập nhật tiến độ mỗi 100ms
    intervalRef.current = setInterval(() => {
      const elapsedTime = (Date.now() - startTime.current) / 1000;
      const newProgress = Math.min((elapsedTime / expectedDuration) * 100, 99);
      setProgress(newProgress);
    }, 100);
  };

  const stopProgress = () => {
    setIsTranslating(false);
    setProgress(100);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Tính thời gian thực tế và cập nhật lịch sử
    if (startTime.current) {
      const duration = (Date.now() - startTime.current) / 1000;
      updateTranslationHistory(duration, currentWordCount);
    }
  };

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    progress,
    isTranslating,
    startProgress, // truyền vào số từ khi bắt đầu dịch: startProgress(wordCount)
    stopProgress,
    averageTimePerWord, // Trả về number thay vì string
  };
};

export default useTranslationProgress;
