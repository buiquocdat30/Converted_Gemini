import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/ConverteContext';

const DEFAULT_TIME_PER_WORD = 0.05; // 50ms/từ
const DEFAULT_STORY_TIME = 20; // 20s cho truyện chưa có dữ liệu dịch
const MAX_HISTORY = 10; // 10 chương gần nhất

const useTranslationProgress = (storyId, defaultTime = 15) => {
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [averageTimePerWord, setAverageTimePerWord] = useState(DEFAULT_TIME_PER_WORD);
  const startTime = useRef(null);
  const intervalRef = useRef(null);
  const [currentWordCount, setCurrentWordCount] = useState(1);
  const { stories } = useContext(AuthContext);

  // Tính toán thời gian dịch trung bình cho truyện cụ thể
  const calculateStoryTranslationTime = (storyId) => {
    if (!stories || !Array.isArray(stories)) {
      console.log('[STORY-HISTORY] Không có dữ liệu stories');
      return DEFAULT_STORY_TIME;
    }

    // Tìm truyện cụ thể
    const story = stories.find(s => s.id === storyId);
    if (!story || !story.chapters) {
      console.log(`[STORY-HISTORY] Không tìm thấy truyện ${storyId} hoặc không có chapters`);
      return DEFAULT_STORY_TIME;
    }

    // Lọc các chương đã dịch có timeTranslation
    const translatedChapters = story.chapters.filter(chapter => 
      chapter.translation && 
      chapter.translation.timeTranslation && 
      chapter.translation.timeTranslation > 0
    );

    console.log(`[STORY-HISTORY] Truyện ${storyId}: ${translatedChapters.length} chương đã dịch`);

    if (translatedChapters.length === 0) {
      console.log(`[STORY-HISTORY] Truyện ${storyId}: Chưa có chương nào dịch, dùng default ${DEFAULT_STORY_TIME}s`);
      return DEFAULT_STORY_TIME;
    }

    // Sắp xếp theo thời gian dịch gần nhất (theo chapterNumber)
    const sortedChapters = translatedChapters.sort((a, b) => b.chapterNumber - a.chapterNumber);

    // Lấy 10 chương gần nhất hoặc tất cả nếu < 10
    const recentChapters = sortedChapters.slice(0, Math.min(MAX_HISTORY, sortedChapters.length));

    // Tính trung bình thời gian dịch
    const totalTime = recentChapters.reduce((sum, chapter) => {
      return sum + (chapter.translation.timeTranslation || 0);
    }, 0);

    const averageTime = totalTime / recentChapters.length;

    console.log(`[STORY-HISTORY] Truyện ${storyId}:`, {
      totalChapters: story.chapters.length,
      translatedChapters: translatedChapters.length,
      recentChapters: recentChapters.length,
      averageTime: averageTime.toFixed(1) + 's',
      chapters: recentChapters.map(ch => ({
        chapterNumber: ch.chapterNumber,
        timeTranslation: ch.translation.timeTranslation.toFixed(1) + 's'
      }))
    });

    return averageTime;
  };

  // Cập nhật thời gian trung bình khi stories hoặc storyId thay đổi
  useEffect(() => {
    if (storyId) {
      const averageTime = calculateStoryTranslationTime(storyId);
      setAverageTimePerWord(averageTime / 1000); // Chuyển từ giây sang giây/từ (giả sử 1000 từ)
      console.log(`[STORY-HISTORY] Truyện ${storyId}: Cập nhật thời gian trung bình ${averageTime.toFixed(1)}s`);
    }
  }, [stories, storyId]);

  // Hàm cập nhật lịch sử dịch (không cần localStorage nữa)
  const updateTranslationHistory = (duration, wordCount) => {
    console.log(`[STORY-HISTORY] Cập nhật lịch sử: ${duration.toFixed(1)}s cho ${wordCount} từ`);
    
    // Tính lại thời gian trung bình cho truyện này
    const averageTime = calculateStoryTranslationTime(storyId);
    setAverageTimePerWord(averageTime / 1000);
    
    console.log(`[STORY-HISTORY] Truyện ${storyId}: Thời gian trung bình mới ${averageTime.toFixed(1)}s`);
  };

  // Hàm khởi động tiến độ (truyền vào số từ chương hiện tại)
  const startProgress = (wordCount = 1) => {
    setIsTranslating(true);
    setProgress(0);
    setCurrentWordCount(wordCount);
    startTime.current = Date.now();

    // Tính thời gian dự kiến dựa trên thời gian trung bình của truyện
    const expectedDuration = wordCount * averageTimePerWord || defaultTime;

    console.log(`[STORY-HISTORY] Bắt đầu dịch: ${wordCount} từ, ước tính ${expectedDuration.toFixed(1)}s`);

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
