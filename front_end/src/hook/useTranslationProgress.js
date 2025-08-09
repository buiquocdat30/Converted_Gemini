import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/ConverteContext';

const DEFAULT_STORY_TIME = 30; // 30s cho truyện chưa có dữ liệu dịch
const MAX_HISTORY = 10; // 10 chương gần nhất

const useTranslationProgress = (storyId, defaultTime = 30) => {
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(DEFAULT_STORY_TIME);
  const startTime = useRef(null);
  const intervalRef = useRef(null);
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

  // Cập nhật thời gian ước tính khi stories hoặc storyId thay đổi
  useEffect(() => {
    if (storyId) {
      const averageTime = calculateStoryTranslationTime(storyId);
      setEstimatedDuration(averageTime);
      console.log(`[STORY-HISTORY] Truyện ${storyId}: Cập nhật thời gian ước tính ${averageTime.toFixed(1)}s`);
    }
  }, [stories, storyId]);

  // Hàm cập nhật lịch sử dịch
  const updateTranslationHistory = (duration) => {
    console.log(`[STORY-HISTORY] Cập nhật lịch sử: ${duration.toFixed(1)}s`);
    
    // Tính lại thời gian trung bình cho truyện này
    const averageTime = calculateStoryTranslationTime(storyId);
    setEstimatedDuration(averageTime);
    
    console.log(`[STORY-HISTORY] Truyện ${storyId}: Thời gian ước tính mới ${averageTime.toFixed(1)}s`);
  };

  // Hàm khởi động tiến độ (KHÔNG cần wordCount nữa)
  const startProgress = () => {
    setIsTranslating(true);
    setProgress(0);
    startTime.current = Date.now();

    // Sử dụng thời gian ước tính đã tính sẵn
    const expectedDuration = estimatedDuration || defaultTime;

    console.log(`[STORY-HISTORY] Bắt đầu dịch, ước tính ${expectedDuration.toFixed(1)}s`);

    // Cập nhật tiến độ mượt mà với easing mỗi 100ms
    const tickInterval = 100; // ms
    const easingPower = 3; // ease-out (càng cao càng chậm về cuối)
    intervalRef.current = setInterval(() => {
      const elapsedTime = (Date.now() - startTime.current) / 1000;
      const t = Math.min(elapsedTime / expectedDuration, 1); // 0 → 1
      const eased = 1 - Math.pow(1 - t, easingPower); // ease-out
      const next = Math.min(eased * 100, 99);
      // Đảm bảo không bị tụt tiến độ
      setProgress((prev) => (next < prev ? prev : next));
    }, tickInterval);
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
    startProgress, // KHÔNG cần truyền wordCount nữa
    stopProgress,
    estimatedDuration, // Trả về thời gian ước tính (giây)
  };
};

export default useTranslationProgress;
