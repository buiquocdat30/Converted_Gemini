// Hàm dịch 50 trang liên tiếp từ trang đầu tiên (mỗi trang chứa 10 chương)
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from '../config/config';

// Constants
const CHAPTERS_PER_PAGE = 10;
const MAX_PAGES_PER_BATCH = 50; // Dịch tối đa 50 trang

/**
 * Dịch 50 trang liên tiếp từ trang đầu tiên
 * @param {Object} params - Tham số dịch
 * @param {number} params.startPage - Trang bắt đầu (VD: 1, 51, 101)
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
export const translate50Pages = async ({
  startPage,
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
  console.log("📖 [50-PAGES] ===== BẮT ĐẦU DỊCH 50 TRANG =====");
  console.log(`[50-PAGES] 📝 Bắt đầu từ trang: ${startPage}`);
  console.log(`[50-PAGES] 📚 Tổng số chương: ${chapters.length}`);
  console.log(`[50-PAGES] 🔑 Có API key: ${!!apiKey}`);
  console.log(`[50-PAGES] 🤖 Model:`, model?.name || model);

  // Validation checks
  if (!startPage || startPage < 1) {
    const errorMsg = "❌ Trang bắt đầu phải lớn hơn 0";
    console.error("[50-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!chapters || chapters.length === 0) {
    const errorMsg = "❌ Không có chương nào để dịch";
    console.error("[50-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!model) {
    const errorMsg = "❌ Không có model được chọn";
    console.error("[50-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!userData || !userData.id) {
    const errorMsg = "❌ Không có thông tin user";
    console.error("[50-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Tính toán tổng số trang có thể dịch
  const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  const endPage = Math.min(startPage + MAX_PAGES_PER_BATCH - 1, totalPages);
  const actualPagesToTranslate = endPage - startPage + 1;

  console.log(`[50-PAGES] 📊 Thông tin trang:`, {
    startPage: startPage,
    endPage: endPage,
    actualPagesToTranslate: actualPagesToTranslate,
    totalPages: totalPages
  });

  // Kiểm tra nếu trang bắt đầu vượt quá tổng số trang
  if (startPage > totalPages) {
    const errorMsg = `❌ Trang bắt đầu (${startPage}) vượt quá tổng số trang (${totalPages})`;
    console.error("[50-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Tạo mảng pageNumbers từ startPage đến endPage
  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  console.log(`[50-PAGES] 📄 Các trang sẽ dịch:`, pageNumbers);

  // Tính toán tổng số chương cần dịch
  const totalChaptersToTranslate = pageNumbers.reduce((total, pageNum) => {
    const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, chapters.length);
    const chaptersInPage = endIndex - startIndex;
    return total + chaptersInPage;
  }, 0);

  console.log(`[50-PAGES] 📊 Tổng số chương cần dịch: ${totalChaptersToTranslate}`);

  // Kiểm tra API key cho các trang sau trang 2
  const pagesNeedingApiKey = pageNumbers.filter(pageNum => pageNum > 2);
  if (pagesNeedingApiKey.length > 0 && (!apiKey || (Array.isArray(apiKey) && apiKey.length === 0) || apiKey === "")) {
    const errorMsg = `❌ Các trang ${pagesNeedingApiKey.join(', ')} cần API key để dịch`;
    console.error("[50-PAGES]", errorMsg);
    toast.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Hiển thị cảnh báo nếu số lượng lớn
  if (actualPagesToTranslate > 20) {
    const estimatedCost = totalChaptersToTranslate * 0.0001; // Ước tính chi phí
    const estimatedTime = Math.round(totalChaptersToTranslate * 10 / 60); // Ước tính thời gian (phút)
    
    console.warn(`[50-PAGES] ⚠️ Cảnh báo: Sẽ dịch ${actualPagesToTranslate} trang (${totalChaptersToTranslate} chương)`);
    console.warn(`[50-PAGES] 💰 Ước tính chi phí: $${estimatedCost.toFixed(4)}`);
    console.warn(`[50-PAGES] ⏱️ Ước tính thời gian: ${estimatedTime} phút`);
    
    toast.warning(`⚠️ Sẽ dịch ${actualPagesToTranslate} trang (${totalChaptersToTranslate} chương). Kiểm tra API key và chi phí!`);
  }

  try {
    const results = {
      success: true,
      totalPages: actualPagesToTranslate,
      totalChapters: totalChaptersToTranslate,
      pageResults: {},
      timing: null,
      errors: []
    };

    // Chuẩn bị dữ liệu cho tất cả các trang
    const modelToSend = model;
    console.log('[50-PAGES] 📤 Gửi model object lên backend:', modelToSend);
    
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
      console.log(`[50-PAGES] 🔑 Thêm ${requestData.userKeys.length} API keys vào request`);
    } else {
      console.log("[50-PAGES] 🔑 Không có API key, sẽ dùng default key");
    }

    console.log("[50-PAGES] 📤 Request data:", {
      pageNumbers: requestData.pageNumbers,
      chaptersCount: requestData.chapters.length,
      model: requestData.model,
      storyId: requestData.storyId,
      hasUserKeys: !!requestData.userKeys,
      userKeysCount: requestData.userKeys?.length || 0
    });

    console.log("[50-PAGES] 🌐 Gửi request đến backend...");
    const token = localStorage.getItem("auth-token");
    const res = await axios.post(API_URL + "/translate/50-pages", requestData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("[50-PAGES] 📥 Response từ 50 Pages API:", {
      success: res.data.success,
      totalPages: res.data.totalPages,
      successfulPages: res.data.successfulPages,
      totalJobs: res.data.totalJobs,
      message: res.data.message,
      timing: res.data.timing,
      errors: res.data.errors?.length || 0
    });

    if (res.data.success) {
      console.log(`[50-PAGES] ✅ Đã thêm ${res.data.successfulPages} trang (${res.data.totalJobs} chương) vào queue thành công`);
      
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
        console.log(`[50-PAGES] 📊 Thông tin timing:`, {
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

    console.log(`[50-PAGES] 📊 Kết quả tổng thể:`, {
      totalPages: results.totalPages,
      successfulPages: successfulPages,
      failedPages: results.totalPages - successfulPages,
      totalJobs: totalJobs,
      errors: results.errors.length
    });

    if (results.errors.length > 0) {
      console.warn(`[50-PAGES] ⚠️ Có ${results.errors.length} trang bị lỗi:`, results.errors);
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

    console.log("📖 [50-PAGES] ===== HOÀN THÀNH DỊCH 50 TRANG =====");
    return results;

  } catch (error) {
    console.error(`[50-PAGES] ❌ Lỗi tổng thể khi dịch 50 trang:`, error);
    
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

    const errorMsg = `Lỗi khi dịch 50 trang: ${error.message}`;
    setErrorMessages((prev) => ({ ...prev, general: `❌ ${errorMsg}` }));
    toast.error(`❌ ${errorMsg}`);
    
    return { success: false, error: errorMsg };
  }
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

/**
 * Helper function để tính toán các trang từ startPage với giới hạn 50 trang
 * @param {number} startPage - Trang bắt đầu
 * @param {number} totalPages - Tổng số trang có sẵn
 * @returns {Object} Thông tin về các trang sẽ dịch
 */
export const calculate50PageRange = (startPage, totalPages) => {
  if (startPage < 1) {
    throw new Error("Trang bắt đầu phải lớn hơn 0");
  }
  
  if (startPage > totalPages) {
    throw new Error(`Trang bắt đầu (${startPage}) vượt quá tổng số trang (${totalPages})`);
  }
  
  const endPage = Math.min(startPage + MAX_PAGES_PER_BATCH - 1, totalPages);
  const actualPages = endPage - startPage + 1;
  
  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  return {
    startPage,
    endPage,
    actualPages,
    pageNumbers,
    isFullBatch: actualPages === MAX_PAGES_PER_BATCH
  };
};

/**
 * Helper function để tính toán chi phí ước tính cho 50 trang
 * @param {Array} chapters - Danh sách chương
 * @param {number} startPage - Trang bắt đầu
 * @returns {Object} Thông tin chi phí
 */
export const calculateEstimatedCost = (chapters, startPage) => {
  const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  const endPage = Math.min(startPage + MAX_PAGES_PER_BATCH - 1, totalPages);
  const actualPages = endPage - startPage + 1;
  
  const avgCharsPerChapter = chapters.reduce((sum, ch) => sum + (ch.rawText?.length || ch.content?.length || 0), 0) / chapters.length;
  const estimatedCharsPerPage = avgCharsPerChapter * CHAPTERS_PER_PAGE;
  const estimatedCostPerPage = estimatedCharsPerPage * 0.0001; // Ước tính chi phí
  const estimatedTimePerPage = Math.max(30, estimatedCharsPerPage / 1000); // Ước tính thời gian (giây)

  return {
    actualPages: actualPages,
    estimatedCharsPerPage: Math.round(estimatedCharsPerPage),
    estimatedCostPerPage: estimatedCostPerPage,
    estimatedTimePerPage: estimatedTimePerPage,
    totalEstimatedCost: estimatedCostPerPage * actualPages,
    totalEstimatedTime: estimatedTimePerPage * actualPages,
    totalEstimatedTimeMinutes: Math.round(estimatedTimePerPage * actualPages / 60)
  };
};
