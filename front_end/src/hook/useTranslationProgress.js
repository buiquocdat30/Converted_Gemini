import { useState, useEffect, useRef } from 'react';

// Lưu trữ lịch sử thời gian dịch trong localStorage
const STORAGE_KEY = 'translation_history';
const MAX_HISTORY = 5;

const useTranslationProgress = (defaultTime = 15) => {
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [averageTime, setAverageTime] = useState(defaultTime);
  const startTime = useRef(null);
  const intervalRef = useRef(null);

  // Lấy lịch sử từ localStorage khi khởi tạo
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        if (history.length > 0) {
          const avg = history.reduce((sum, time) => sum + time, 0) / history.length;
          setAverageTime(avg);
        }
      }
    } catch (error) {
      console.error('Lỗi khi đọc lịch sử dịch:', error);
    }
  }, []);

  // Hàm cập nhật lịch sử thời gian
  const updateTranslationHistory = (duration) => {
    try {
      // Lấy lịch sử hiện tại
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      let history = savedHistory ? JSON.parse(savedHistory) : [];

      // Thêm thời gian mới
      history.push(duration);

      // Giới hạn số lượng lịch sử
      if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
      }

      // Lưu lại vào localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

      // Cập nhật thời gian trung bình
      const avg = history.reduce((sum, time) => sum + time, 0) / history.length;
      setAverageTime(avg);

      console.log('📊 Lịch sử thời gian dịch:', history);
      console.log('⏱️ Thời gian trung bình:', avg.toFixed(1), 'giây');
    } catch (error) {
      console.error('Lỗi khi cập nhật lịch sử dịch:', error);
    }
  };

  const startProgress = () => {
    setIsTranslating(true);
    setProgress(0);
    startTime.current = Date.now();

    // Cập nhật tiến độ mỗi 100ms
    intervalRef.current = setInterval(() => {
      const elapsedTime = (Date.now() - startTime.current) / 1000;
      const newProgress = Math.min((elapsedTime / averageTime) * 100, 99);
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
      updateTranslationHistory(duration);
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
    startProgress,
    stopProgress,
    averageTime: averageTime.toFixed(1)
  };
};

export default useTranslationProgress;
