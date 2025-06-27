import { useState, useEffect, useRef } from 'react';

// Lưu trữ lịch sử thời gian dịch và số từ trong localStorage
const STORAGE_KEY = 'translation_history_v2';
const MAX_HISTORY = 6;
const DEFAULT_TIME_PER_WORD = 0.00806451612; // giây/1 từ (có thể cho admin chỉnh)

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
        const history = JSON.parse(savedHistory);
        if (history.length > 0) {
          // Tính trung bình thời gian dịch 1 từ của tối đa 6 chương gần nhất
          const lastN = history.slice(-MAX_HISTORY);
          const avg =
            lastN.reduce((sum, h) => sum + h.duration / Math.max(h.wordCount, 1), 0) /
            lastN.length;
          setAverageTimePerWord(avg);
        }
      }
    } catch (error) {
      console.error('Lỗi khi đọc lịch sử dịch:', error);
    }
  }, []);

  // Hàm cập nhật lịch sử dịch
  const updateTranslationHistory = (duration, wordCount) => {
    try {
      // Lấy lịch sử hiện tại
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      let history = savedHistory ? JSON.parse(savedHistory) : [];

      // Thêm bản ghi mới
      history.push({ duration, wordCount });

      // Giới hạn số lượng lịch sử
      if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
      }

      // Lưu lại vào localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

      // Tính lại trung bình thời gian dịch 1 từ
      const lastN = history.slice(-MAX_HISTORY);
      const avg =
        lastN.reduce((sum, h) => sum + h.duration / Math.max(h.wordCount, 1), 0) /
        lastN.length;
      setAverageTimePerWord(avg);

      console.log('📊 Lịch sử dịch:', history);
      console.log('⏱️ Trung bình thời gian dịch 1 từ:', avg.toFixed(3), 'giây');
    } catch (error) {
      console.error('Lỗi khi cập nhật lịch sử dịch:', error);
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
    averageTimePerWord: averageTimePerWord.toFixed(3),
  };
};

export default useTranslationProgress;
