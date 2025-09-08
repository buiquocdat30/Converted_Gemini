// Hàm dịch toàn bộ các trang chưa dịch
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from '../config/config';

// Constants
const CHAPTERS_PER_PAGE = 10;

/**
 * Dịch toàn bộ các trang chưa dịch
 * @param {Object} params - Tham số dịch
 * @param {Array} params.chapters - Toàn bộ danh sách chương
 * @param {string|Array} params.apiKey - API key hoặc mảng API keys
 * @param {Object} params.model - Model object
 * @param {string} params.storyId - ID của story
 * @param {Function} params.setResults - Callback để set kết quả dịch
 * @param {Function} params.setTranslatedCount - Callback để set số chương đã dịch
 * @param {Function} params.setErrorMessages - Callback để set thông báo lỗi
 * @param {Function} params.onTranslationResult - Callback khi có kết quả dịch
 * @param {Function} params.onPageStartProgress - Callback khi bắt đầu dịch trang
 * @param {Function} params.onPageStopProgress - Callback khi dừng dịch trang
 * @param {Function} params.onUpdateTotalProgress - Callback để cập nhật tổng tiến độ
 * @param {Function} params.getPageStatus - Callback để lấy trạng thái trang
 * @param {Function} params.onBatchCancel - Callback khi hủy batch
 * @param {Object} params.userData - Thông tin user
 * @param {Function} params.setPageProgresses - Callback để set tiến độ của từng trang
 * @param {Function} params.setPageTranslatingStates - Callback để set trạng thái dịch của từng trang
 * @param {Function} params.setPageStatus - Callback để set trạng thái trang
 * @param {Function} params.getChapterStatus - Callback để lấy trạng thái chương
 * @param {boolean} params.forceTranslate - Có dịch lại các trang đã dịch không (default: false)
 * @param {number} params.maxPagesPerBatch - Số trang tối đa dịch cùng lúc (default: 5)
 * @returns {Promise<Object>} Kết quả dịch
 */
export const translateAllPages = async ({
  chapters,
  apiKey,
  model,
  storyId,
  setResults,
  setTranslatedCount,
  setErrorMessages,
  onTranslationResult,
  onPageStartProgress,
  onPageStopProgress,
  onUpdateTotalProgress,
  getPageStatus,
  onBatchCancel,
  userData,
  setPageProgresses,
  setPageTranslatingStates,
  setPageStatus,
  getChapterStatus,
  forceTranslate = false,
  maxPagesPerBatch = 5,
}) => {
  console.log("📖 [ALL-PAGES] ===== BẮT ĐẦU DỊCH TẤT CẢ CÁC TRANG =====");
  console.log(`[ALL-PAGES] 📚 Tổng số chương: ${chapters.length}`);
  console.log(`[ALL-PAGES] 🔑 Có API key: ${!!apiKey}`);
  console.log(`[ALL-PAGES] 🤖 Model:`, model?.name || model);
  console.log(`[ALL-PAGES] 🔄 Force translate: ${forceTranslate}`);
  console.log(`[ALL-PAGES] 📊 Max pages per batch: ${maxPagesPerBatch}`);

  // Validation checks nghiêm ngặt
  if (!chapters || chapters.length === 0) {
    const errorMsg = "❌ Không có chương nào để dịch";
    console.error("[ALL-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!model) {
    const errorMsg = "❌ Không có model được chọn";
    console.error("[ALL-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!userData || !userData.id) {
    const errorMsg = "❌ Không có thông tin user";
    console.error("[ALL-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Kiểm tra API key nghiêm ngặt
  if (!apiKey || (Array.isArray(apiKey) && apiKey.length === 0) || apiKey === "") {
    const errorMsg = "❌ Dịch tất cả trang cần API key. Vui lòng nhập API key để tiếp tục.";
    console.error("[ALL-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Tính toán tổng số trang
  const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  console.log(`[ALL-PAGES] 📊 Tổng số trang: ${totalPages}`);

  // Phân tích các trang cần dịch
  const pagesToTranslate = [];
  const pageAnalysis = {
    totalPages: totalPages,
    pagesNeedingTranslation: 0,
    pagesAlreadyTranslated: 0,
    pagesWithErrors: 0,
    totalChaptersToTranslate: 0,
    estimatedCost: 0,
    estimatedTime: 0
  };

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, chapters.length);
    const chaptersInPage = chapters.slice(startIndex, endIndex);
    
    // Kiểm tra trạng thái của các chương trong trang
    let needsTranslation = false;
    let hasErrors = false;
    let translatedCount = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const chapter = chapters[i];
      const chapterStatus = getChapterStatus?.(i);
      
      if (chapterStatus === 'COMPLETE' && chapter?.translatedContent) {
        translatedCount++;
      } else if (chapterStatus === 'FAILED' || chapter?.hasError) {
        hasErrors = true;
      }
      
      if (!chapter?.translatedContent || forceTranslate) {
        needsTranslation = true;
      }
    }

    if (needsTranslation) {
      pagesToTranslate.push({
        pageNumber: pageNum,
        startIndex: startIndex,
        endIndex: endIndex,
        chaptersCount: chaptersInPage.length,
        translatedCount: translatedCount,
        hasErrors: hasErrors
      });
      pageAnalysis.pagesNeedingTranslation++;
      pageAnalysis.totalChaptersToTranslate += chaptersInPage.length;
    } else {
      pageAnalysis.pagesAlreadyTranslated++;
    }

    if (hasErrors) {
      pageAnalysis.pagesWithErrors++;
    }
  }

  console.log(`[ALL-PAGES] 📊 Phân tích trang:`, pageAnalysis);
  console.log(`[ALL-PAGES] 📄 Các trang cần dịch:`, pagesToTranslate.map(p => p.pageNumber));

  // Kiểm tra nếu không có trang nào cần dịch
  if (pagesToTranslate.length === 0) {
    const message = forceTranslate ? "Tất cả các trang đã được dịch!" : "Tất cả các trang đã được dịch hoàn chỉnh!";
    console.log(`[ALL-PAGES] ✅ ${message}`);
    toast.success(`✅ ${message}`);
    return { 
      success: true, 
      message: message,
      pageAnalysis: pageAnalysis,
      pagesToTranslate: []
    };
  }

  // Ước tính chi phí và thời gian
  const avgCharsPerChapter = chapters.reduce((sum, ch) => sum + (ch.rawText?.length || ch.content?.length || 0), 0) / chapters.length;
  const estimatedCharsPerPage = avgCharsPerChapter * CHAPTERS_PER_PAGE;
  const estimatedCostPerPage = estimatedCharsPerPage * 0.0001; // Ước tính chi phí
  const estimatedTimePerPage = Math.max(30, estimatedCharsPerPage / 1000); // Ước tính thời gian (giây)

  pageAnalysis.estimatedCost = estimatedCostPerPage * pagesToTranslate.length;
  pageAnalysis.estimatedTime = estimatedTimePerPage * pagesToTranslate.length;

  console.log(`[ALL-PAGES] 💰 Ước tính chi phí: $${pageAnalysis.estimatedCost.toFixed(4)}`);
  console.log(`[ALL-PAGES] ⏱️ Ước tính thời gian: ${Math.round(pageAnalysis.estimatedTime / 60)} phút`);

  // Hiển thị cảnh báo nếu số lượng lớn
  if (pagesToTranslate.length > 10) {
    const confirmMessage = `⚠️ Bạn sắp dịch ${pagesToTranslate.length} trang (${pageAnalysis.totalChaptersToTranslate} chương). 
    Ước tính chi phí: $${pageAnalysis.estimatedCost.toFixed(4)}
    Ước tính thời gian: ${Math.round(pageAnalysis.estimatedTime / 60)} phút
    
    Bạn có chắc chắn muốn tiếp tục?`;
    
    console.warn(`[ALL-PAGES] ⚠️ Cảnh báo: ${confirmMessage}`);
    toast.warning(`⚠️ Sẽ dịch ${pagesToTranslate.length} trang. Kiểm tra API key và chi phí!`);
  }

  try {
    const results = {
      success: true,
      totalPages: pagesToTranslate.length,
      totalChapters: pageAnalysis.totalChaptersToTranslate,
      pageResults: {},
      timing: null,
      errors: [],
      pageAnalysis: pageAnalysis
    };

    // Chuẩn bị dữ liệu cho tất cả các trang
    const modelToSend = model;
    console.log('[ALL-PAGES] 📤 Gửi model object lên backend:', modelToSend);
    
    const requestData = {
      chapters: chapters,
      model: modelToSend,
      storyId: storyId,
      userId: userData.id,
      isBatchTranslation: true,
      forceTranslate: forceTranslate,
      maxPagesPerBatch: maxPagesPerBatch
    };

    // Thêm userKeys
    requestData.userKeys = Array.isArray(apiKey) ? apiKey : [apiKey];
    console.log(`[ALL-PAGES] 🔑 Sử dụng ${requestData.userKeys.length} API keys`);

    console.log("[ALL-PAGES] 📤 Request data:", {
      chaptersCount: requestData.chapters.length,
      model: requestData.model,
      storyId: requestData.storyId,
      forceTranslate: requestData.forceTranslate,
      maxPagesPerBatch: requestData.maxPagesPerBatch,
      userKeysCount: requestData.userKeys.length
    });

    console.log("[ALL-PAGES] 🌐 Gửi request đến backend...");
    const token = localStorage.getItem("auth-token");
    const res = await axios.post(API_URL + "/translate/all-pages", requestData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("[ALL-PAGES] 📥 Response từ All Pages API:", {
      success: res.data.success,
      totalPages: res.data.totalPages,
      successfulPages: res.data.successfulPages,
      totalJobs: res.data.totalJobs,
      message: res.data.message,
      timing: res.data.timing,
      errors: res.data.errors?.length || 0,
      pageAnalysis: res.data.pageAnalysis
    });

    if (res.data.success) {
      console.log(`[ALL-PAGES] ✅ Đã thêm ${res.data.successfulPages} trang (${res.data.totalJobs} chương) vào queue thành công`);
      
      // Cập nhật kết quả từ response
      results.success = res.data.success;
      results.totalPages = res.data.totalPages;
      results.successfulPages = res.data.successfulPages;
      results.totalJobs = res.data.totalJobs;
      results.pageResults = res.data.pageResults || {};
      results.timing = res.data.timing;
      results.errors = res.data.errors || [];
      results.pageAnalysis = res.data.pageAnalysis || pageAnalysis;

      // Log thông tin timing nếu có
      if (res.data.timing) {
        console.log(`[ALL-PAGES] 📊 Thông tin timing:`, {
          totalJobs: res.data.timing.totalJobs,
          strategy: res.data.timing.strategy,
          concurrency: res.data.timing.concurrency,
          estimatedTotalTime: `${res.data.timing.estimatedTotalTime}s`,
          efficiency: res.data.timing.efficiency,
          batches: res.data.timing.batches,
          maxPagesPerBatch: res.data.timing.maxPagesPerBatch
        });
      }

    } else {
      throw new Error(res.data.message || 'Lỗi khi thêm jobs vào queue');
    }

    // Tính toán kết quả tổng thể
    const successfulPages = results.successfulPages || 0;
    const totalJobs = results.totalJobs || 0;

    console.log(`[ALL-PAGES] 📊 Kết quả tổng thể:`, {
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      failedPages: results.totalPages - successfulPages,
      totalJobs: totalJobs,
      totalChapters: results.totalChapters,
      errors: results.errors.length
    });

    if (results.errors.length > 0) {
      console.warn(`[ALL-PAGES] ⚠️ Có ${results.errors.length} trang bị lỗi:`, results.errors);
    }

    // Hiển thị thông báo kết quả
    if (successfulPages === results.totalPages) {
      toast.success(`✅ Đã gửi ${successfulPages} trang (${totalJobs} chương) vào queue thành công!`);
    } else if (successfulPages > 0) {
      toast.warning(`⚠️ Hoàn thành ${successfulPages}/${results.totalPages} trang (${totalJobs} chương). Có ${results.errors.length} trang bị lỗi.`);
    } else {
      toast.error(`❌ Tất cả ${results.totalPages} trang đều bị lỗi!`);
      results.success = false;
    }

    console.log("📖 [ALL-PAGES] ===== HOÀN THÀNH DỊCH TẤT CẢ CÁC TRANG =====");
    return results;

  } catch (error) {
    console.error(`[ALL-PAGES] ❌ Lỗi tổng thể khi dịch tất cả trang:`, error);
    
    // Cập nhật trạng thái lỗi cho tất cả trang
    pagesToTranslate.forEach(pageInfo => {
      setPageStatus((prev) => ({
        ...prev,
        [pageInfo.pageNumber]: 'FAILED'
      }));

      setPageTranslatingStates((prev) => ({
        ...prev,
        [pageInfo.pageNumber]: false
      }));

      onPageStopProgress?.(pageInfo.pageNumber);
    });

    const errorMsg = `Lỗi khi dịch tất cả trang: ${error.message}`;
    setErrorMessages((prev) => ({ ...prev, general: `❌ ${errorMsg}` }));
    toast.error(`❌ ${errorMsg}`);
    
    return { success: false, error: errorMsg };
  }
};

/**
 * Helper function để phân tích trạng thái các trang
 * @param {Array} chapters - Danh sách chương
 * @param {Function} getChapterStatus - Callback để lấy trạng thái chương
 * @returns {Object} Phân tích trạng thái
 */
export const analyzePageStatus = (chapters, getChapterStatus) => {
  const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  const analysis = {
    totalPages: totalPages,
    pagesNeedingTranslation: 0,
    pagesAlreadyTranslated: 0,
    pagesWithErrors: 0,
    pagesWithPartialTranslation: 0,
    totalChaptersToTranslate: 0,
    pageDetails: {}
  };

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, chapters.length);
    const chaptersInPage = chapters.slice(startIndex, endIndex);
    
    let needsTranslation = false;
    let hasErrors = false;
    let translatedCount = 0;
    let errorCount = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const chapter = chapters[i];
      const chapterStatus = getChapterStatus?.(i);
      
      if (chapterStatus === 'COMPLETE' && chapter?.translatedContent) {
        translatedCount++;
      } else if (chapterStatus === 'FAILED' || chapter?.hasError) {
        hasErrors = true;
        errorCount++;
      }
      
      if (!chapter?.translatedContent) {
        needsTranslation = true;
      }
    }

    const pageDetail = {
      pageNumber: pageNum,
      startIndex: startIndex,
      endIndex: endIndex,
      chaptersCount: chaptersInPage.length,
      translatedCount: translatedCount,
      needsTranslation: needsTranslation,
      hasErrors: hasErrors,
      errorCount: errorCount,
      completionRate: (translatedCount / chaptersInPage.length) * 100
    };

    analysis.pageDetails[pageNum] = pageDetail;

    if (needsTranslation) {
      analysis.pagesNeedingTranslation++;
      analysis.totalChaptersToTranslate += chaptersInPage.length;
    } else {
      analysis.pagesAlreadyTranslated++;
    }

    if (hasErrors) {
      analysis.pagesWithErrors++;
    }

    if (translatedCount > 0 && translatedCount < chaptersInPage.length) {
      analysis.pagesWithPartialTranslation++;
    }
  }

  return analysis;
};

/**
 * Helper function để tính toán chi phí ước tính
 * @param {Array} chapters - Danh sách chương
 * @param {number} pagesCount - Số trang cần dịch
 * @returns {Object} Thông tin chi phí
 */
export const calculateEstimatedCost = (chapters, pagesCount) => {
  const avgCharsPerChapter = chapters.reduce((sum, ch) => sum + (ch.rawText?.length || ch.content?.length || 0), 0) / chapters.length;
  const estimatedCharsPerPage = avgCharsPerChapter * CHAPTERS_PER_PAGE;
  const estimatedCostPerPage = estimatedCharsPerPage * 0.0001; // Ước tính chi phí
  const estimatedTimePerPage = Math.max(30, estimatedCharsPerPage / 1000); // Ước tính thời gian (giây)

  return {
    avgCharsPerChapter: Math.round(avgCharsPerChapter),
    estimatedCharsPerPage: Math.round(estimatedCharsPerPage),
    estimatedCostPerPage: estimatedCostPerPage,
    estimatedTimePerPage: estimatedTimePerPage,
    totalEstimatedCost: estimatedCostPerPage * pagesCount,
    totalEstimatedTime: estimatedTimePerPage * pagesCount,
    totalEstimatedTimeMinutes: Math.round(estimatedTimePerPage * pagesCount / 60)
  };
};
