// Hàm dịch các trang cụ thể (mỗi trang chứa 10 chương)
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from '../config/config';

// Constants
const CHAPTERS_PER_PAGE = 10;

/**
 * Dịch các trang cụ thể
 * @param {Object} params - Tham số dịch
 * @param {Array} params.pageNumbers - Mảng số trang cần dịch (VD: [12, 16, 18] hoặc [14, 15, 16, 17, 18, 19])
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
 * @returns {Promise<Object>} Kết quả dịch
 */
export const translateRangePages = async ({
  pageNumbers,
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
}) => {
  console.log("📖 [RANGE-PAGE] ===== BẮT ĐẦU DỊCH CÁC TRANG =====");
  console.log(`[RANGE-PAGE] 📝 Dịch các trang:`, pageNumbers);
  console.log(`[RANGE-PAGE] 📊 Tổng số trang: ${pageNumbers.length}`);
  console.log(`[RANGE-PAGE] 📚 Tổng số chương: ${chapters.length}`);
  console.log(`[RANGE-PAGE] 🔑 Có API key: ${!!apiKey}`);
  console.log(`[RANGE-PAGE] 🤖 Model:`, model?.name || model);

  // Validation checks
  if (!pageNumbers || pageNumbers.length === 0) {
    const errorMsg = "❌ Không có trang nào được chọn để dịch";
    console.error("[RANGE-PAGE]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!chapters || chapters.length === 0) {
    const errorMsg = "❌ Không có chương nào để dịch";
    console.error("[RANGE-PAGE]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!model) {
    const errorMsg = "❌ Không có model được chọn";
    console.error("[RANGE-PAGE]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!userData || !userData.id) {
    const errorMsg = "❌ Không có thông tin user";
    console.error("[RANGE-PAGE]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Tính toán tổng số chương cần dịch
  const totalChaptersToTranslate = pageNumbers.reduce((total, pageNum) => {
    const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, chapters.length);
    const chaptersInPage = endIndex - startIndex;
    return total + chaptersInPage;
  }, 0);

  console.log(`[RANGE-PAGE] 📊 Tổng số chương cần dịch: ${totalChaptersToTranslate}`);

  // Kiểm tra API key cho các trang sau trang 2
  const pagesNeedingApiKey = pageNumbers.filter(pageNum => pageNum > 2);
  if (pagesNeedingApiKey.length > 0 && (!apiKey || (Array.isArray(apiKey) && apiKey.length === 0) || apiKey === "")) {
    const errorMsg = `❌ Các trang ${pagesNeedingApiKey.join(', ')} cần API key để dịch`;
    console.error("[RANGE-PAGE]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const results = {
      success: true,
      totalPages: pageNumbers.length,
      totalChapters: 0,
      pageResults: {},
      timing: null,
      errors: []
    };

    // Chuẩn bị dữ liệu cho tất cả các trang
    const modelToSend = model;
    console.log('[RANGE-PAGE] 📤 Gửi model object lên backend:', modelToSend);
    
    const requestData = {
      pageNumbers: pageNumbers,
      chapters: chapters,
      model: modelToSend,
      storyId: storyId,
      userId: userData.id,
      isBatchTranslation: true
    };

    // Thêm userKeys nếu có
    if (apiKey && !(Array.isArray(apiKey) && apiKey.length === 0) && apiKey !== "") {
      requestData.userKeys = Array.isArray(apiKey) ? apiKey : [apiKey];
      console.log(`[RANGE-PAGE] 🔑 Thêm ${requestData.userKeys.length} API keys vào request`);
    } else {
      console.log("[RANGE-PAGE] 🔑 Không có API key, sẽ dùng default key");
    }

    console.log("[RANGE-PAGE] 📤 Request data:", {
      pageNumbers: requestData.pageNumbers,
      chaptersCount: requestData.chapters.length,
      model: requestData.model,
      storyId: requestData.storyId,
      hasUserKeys: !!requestData.userKeys,
      userKeysCount: requestData.userKeys?.length || 0
    });

    console.log("[RANGE-PAGE] 🌐 Gửi request đến backend...");
    const token = localStorage.getItem("auth-token");
    const res = await axios.post(API_URL + "/translate/range-pages", requestData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("[RANGE-PAGE] 📥 Response từ Range Pages API:", {
      success: res.data.success,
      totalPages: res.data.totalPages,
      successfulPages: res.data.successfulPages,
      totalJobs: res.data.totalJobs,
      message: res.data.message,
      timing: res.data.timing,
      errors: res.data.errors?.length || 0
    });

    if (res.data.success) {
      console.log(`[RANGE-PAGE] ✅ Đã thêm ${res.data.successfulPages} trang (${res.data.totalJobs} chương) vào queue thành công`);
      
      // Cập nhật kết quả từ response
      results.success = res.data.success;
      results.totalPages = res.data.totalPages;
      results.successfulPages = res.data.successfulPages;
      results.totalJobs = res.data.totalJobs;
      results.pageResults = res.data.pageResults || {};
      results.timing = res.data.timing;
      results.errors = res.data.errors || [];

      // Log thông tin timing nếu có
      if (res.data.timing) {
        console.log(`[RANGE-PAGE] 📊 Thông tin timing:`, {
          totalJobs: res.data.timing.totalJobs,
          strategy: res.data.timing.strategy,
          concurrency: res.data.timing.concurrency,
          estimatedTotalTime: `${res.data.timing.estimatedTotalTime}s`,
          efficiency: res.data.timing.efficiency
        });
      }

    } else {
      throw new Error(res.data.message || 'Lỗi khi thêm jobs vào queue');
    }

    // Tính toán kết quả tổng thể
    const successfulPages = results.successfulPages || 0;
    const totalJobs = results.totalJobs || 0;

    console.log(`[RANGE-PAGE] 📊 Kết quả tổng thể:`, {
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      failedPages: results.totalPages - successfulPages,
      totalJobs: totalJobs,
      errors: results.errors.length
    });

    if (results.errors.length > 0) {
      console.warn(`[RANGE-PAGE] ⚠️ Có ${results.errors.length} trang bị lỗi:`, results.errors);
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

    console.log("📖 [RANGE-PAGE] ===== HOÀN THÀNH DỊCH CÁC TRANG =====");
    return results;

  } catch (error) {
    console.error(`[RANGE-PAGE] ❌ Lỗi tổng thể khi dịch các trang:`, error);
    
    // Cập nhật trạng thái lỗi cho tất cả trang
    pageNumbers.forEach(pageNumber => {
      setPageStatus((prev) => ({
        ...prev,
        [pageNumber]: 'FAILED'
      }));

      setPageTranslatingStates((prev) => ({
        ...prev,
        [pageNumber]: false
      }));

      onPageStopProgress?.(pageNumber);
    });

    const errorMsg = `Lỗi khi dịch các trang: ${error.message}`;
    setErrorMessages((prev) => ({ ...prev, general: `❌ ${errorMsg}` }));
    toast.error(`❌ ${errorMsg}`);
    
    return { success: false, error: errorMsg };
  }
};

/**
 * Helper function để tính toán các trang từ range
 * @param {number} startPage - Trang bắt đầu
 * @param {number} endPage - Trang kết thúc
 * @returns {Array<number>} Mảng số trang
 */
export const calculatePageRange = (startPage, endPage) => {
  if (startPage > endPage) {
    throw new Error("Trang bắt đầu không thể lớn hơn trang kết thúc");
  }
  
  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return pages;
};

/**
 * Helper function để tính toán các trang từ danh sách số trang
 * @param {string} pageInput - Input string (VD: "12,16,18" hoặc "14-19")
 * @returns {Array<number>} Mảng số trang
 */
export const parsePageInput = (pageInput) => {
  if (!pageInput || pageInput.trim() === "") {
    return [];
  }

  const pages = new Set();
  const parts = pageInput.split(',').map(part => part.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      // Range format: "14-19"
      const [start, end] = part.split('-').map(num => parseInt(num.trim()));
      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Range không hợp lệ: ${part}`);
      }
      if (start > end) {
        throw new Error(`Range không hợp lệ: ${part} (trang bắt đầu > trang kết thúc)`);
      }
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      // Single page format: "12"
      const pageNum = parseInt(part);
      if (isNaN(pageNum)) {
        throw new Error(`Số trang không hợp lệ: ${part}`);
      }
      pages.add(pageNum);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Helper function để tính toán thông tin trang
 * @param {number} pageNumber - Số trang
 * @param {number} totalChapters - Tổng số chương
 * @returns {Object} Thông tin trang
 */
export const getPageInfo = (pageNumber, totalChapters) => {
  const startIndex = (pageNumber - 1) * CHAPTERS_PER_PAGE;
  const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, totalChapters);
  const chaptersInPage = endIndex - startIndex;
  
  return {
    pageNumber,
    startIndex,
    endIndex,
    chaptersCount: chaptersInPage,
    startChapterNumber: startIndex + 1,
    endChapterNumber: endIndex
  };
};
