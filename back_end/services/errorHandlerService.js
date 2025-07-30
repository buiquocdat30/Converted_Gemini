/**
 * Error Handler Service cho Gemini API
 * Phân biệt và xử lý các loại lỗi khác nhau từ Google Generative AI
 */

class ErrorHandlerService {
  constructor() {
    // Định nghĩa các loại lỗi
    this.ERROR_TYPES = {
      // Lỗi quota/rate limit
      QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
      RATE_LIMIT: 'RATE_LIMIT',
      DAILY_LIMIT: 'DAILY_LIMIT',
      
      // Lỗi authentication
      INVALID_API_KEY: 'INVALID_API_KEY',
      API_KEY_DISABLED: 'API_KEY_DISABLED',
      API_KEY_EXPIRED: 'API_KEY_EXPIRED',
      
      // Lỗi model
      MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
      MODEL_DEPRECATED: 'MODEL_DEPRECATED',
      MODEL_UNSUPPORTED: 'MODEL_UNSUPPORTED',
      
      // Lỗi content
      CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',
      CONTENT_VIOLATION: 'CONTENT_VIOLATION',
      CONTENT_FILTERED: 'CONTENT_FILTERED',
      
      // Lỗi network
      NETWORK_ERROR: 'NETWORK_ERROR',
      TIMEOUT: 'TIMEOUT',
      SERVER_ERROR: 'SERVER_ERROR',
      
      // Lỗi khác
      UNKNOWN_ERROR: 'UNKNOWN_ERROR',
      VALIDATION_ERROR: 'VALIDATION_ERROR'
    };

    // Mapping các error codes từ Google API
    this.GOOGLE_ERROR_CODES = {
      // Quota errors
      '429': this.ERROR_TYPES.RATE_LIMIT,
      'RESOURCE_EXHAUSTED': this.ERROR_TYPES.QUOTA_EXCEEDED,
      
      // Authentication errors
      '401': this.ERROR_TYPES.INVALID_API_KEY,
      '403': this.ERROR_TYPES.API_KEY_DISABLED,
      
      // Model errors
      '404': this.ERROR_TYPES.MODEL_NOT_FOUND,
      '400': this.ERROR_TYPES.VALIDATION_ERROR,
      
      // Server errors
      '500': this.ERROR_TYPES.SERVER_ERROR,
      '502': this.ERROR_TYPES.NETWORK_ERROR,
      '503': this.ERROR_TYPES.SERVER_ERROR,
      '504': this.ERROR_TYPES.TIMEOUT
    };
  }

  /**
   * Phân tích lỗi từ Gemini API response
   * @param {Error} error - Lỗi từ GoogleGenerativeAI
   * @returns {Object} Thông tin lỗi đã phân loại
   */
  analyzeError(error) {
    console.log("🔍 Phân tích lỗi:", {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    });

    const errorInfo = {
      type: this.ERROR_TYPES.UNKNOWN_ERROR,
      code: null,
      message: error.message || 'Lỗi không xác định',
      details: {},
      retryable: false,
      userMessage: 'Đã xảy ra lỗi không xác định',
      solution: 'Vui lòng thử lại sau'
    };

    try {
      // Phân tích message để tìm error code
      const statusMatch = error.message.match(/\[(\d+)\s+([^\]]+)\]/);
      if (statusMatch) {
        const statusCode = statusMatch[1];
        const statusText = statusMatch[2];
        errorInfo.code = statusCode;
        errorInfo.message = statusText;

        // Xác định loại lỗi dựa trên status code
        if (this.GOOGLE_ERROR_CODES[statusCode]) {
          errorInfo.type = this.GOOGLE_ERROR_CODES[statusCode];
        }
      }

      // Phân tích chi tiết lỗi từ message
      this.analyzeErrorMessage(error.message, errorInfo);

      // Phân tích JSON error details nếu có
      this.analyzeErrorDetails(error.message, errorInfo);

      // Set retryable và user message
      this.setErrorProperties(errorInfo);

    } catch (parseError) {
      console.error("❌ Lỗi khi phân tích error:", parseError);
    }

    console.log("📋 Kết quả phân tích lỗi:", errorInfo);
    return errorInfo;
  }

  /**
   * Phân tích message để xác định loại lỗi cụ thể
   */
  analyzeErrorMessage(message, errorInfo) {
    const lowerMessage = message.toLowerCase();

    // Content errors - ưu tiên phân loại cụ thể trước
    if (lowerMessage.includes('content')) {
      if (lowerMessage.includes('too long') || lowerMessage.includes('exceeds limit') || lowerMessage.includes('maximum allowed limit')) {
        errorInfo.type = this.ERROR_TYPES.CONTENT_TOO_LONG;
      } else if (lowerMessage.includes('violation') || lowerMessage.includes('policy')) {
        errorInfo.type = this.ERROR_TYPES.CONTENT_VIOLATION;
      } else if (lowerMessage.includes('filtered') || lowerMessage.includes('blocked')) {
        errorInfo.type = this.ERROR_TYPES.CONTENT_FILTERED;
      }
    }

    // Quota và Rate Limit errors
    if (lowerMessage.includes('quota') || lowerMessage.includes('exceeded')) {
      errorInfo.type = this.ERROR_TYPES.QUOTA_EXCEEDED;
      
      if (lowerMessage.includes('daily')) {
        errorInfo.type = this.ERROR_TYPES.DAILY_LIMIT;
      } else if (lowerMessage.includes('per minute') || lowerMessage.includes('rate')) {
        errorInfo.type = this.ERROR_TYPES.RATE_LIMIT;
      }
    }

    // API Key errors
    if (lowerMessage.includes('api key') || lowerMessage.includes('authentication')) {
      if (lowerMessage.includes('invalid') || lowerMessage.includes('not found')) {
        errorInfo.type = this.ERROR_TYPES.INVALID_API_KEY;
      } else if (lowerMessage.includes('disabled') || lowerMessage.includes('suspended')) {
        errorInfo.type = this.ERROR_TYPES.API_KEY_DISABLED;
      } else if (lowerMessage.includes('expired')) {
        errorInfo.type = this.ERROR_TYPES.API_KEY_EXPIRED;
      }
    }

    // Model errors
    if (lowerMessage.includes('model')) {
      if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
        errorInfo.type = this.ERROR_TYPES.MODEL_NOT_FOUND;
      } else if (lowerMessage.includes('deprecated') || lowerMessage.includes('no longer supported')) {
        errorInfo.type = this.ERROR_TYPES.MODEL_DEPRECATED;
      } else if (lowerMessage.includes('unsupported')) {
        errorInfo.type = this.ERROR_TYPES.MODEL_UNSUPPORTED;
      }
    }

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      errorInfo.type = this.ERROR_TYPES.NETWORK_ERROR;
    }

    // Timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      errorInfo.type = this.ERROR_TYPES.TIMEOUT;
    }

    // Server errors
    if (lowerMessage.includes('server') || lowerMessage.includes('internal')) {
      errorInfo.type = this.ERROR_TYPES.SERVER_ERROR;
    }
  }

  /**
   * Phân tích chi tiết lỗi từ JSON response
   */
  analyzeErrorDetails(message, errorInfo) {
    try {
      // Tìm JSON trong message
      const jsonMatch = message.match(/\[({.*})\]|({.*})/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[2];
        const errorDetails = JSON.parse(jsonStr);
        
        errorInfo.details = errorDetails;

        // Phân tích violations nếu có
        if (errorDetails.violations) {
          errorInfo.details.violations = errorDetails.violations.map(violation => ({
            metric: violation.quotaMetric,
            quotaId: violation.quotaId,
            dimensions: violation.quotaDimensions
          }));
        }

        // Phân tích retry info nếu có
        if (errorDetails.retryDelay) {
          errorInfo.details.retryDelay = errorDetails.retryDelay;
        }

        // Phân tích help links nếu có
        if (errorDetails.links) {
          errorInfo.details.helpLinks = errorDetails.links;
        }
      }
    } catch (parseError) {
      console.warn("⚠️ Không thể parse JSON error details:", parseError);
    }
  }

  /**
   * Set các thuộc tính retryable và user message
   */
  setErrorProperties(errorInfo) {
    switch (errorInfo.type) {
      case this.ERROR_TYPES.QUOTA_EXCEEDED:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Đã vượt quá giới hạn sử dụng API. Vui lòng nâng cấp gói hoặc chờ đến ngày mai.';
        errorInfo.solution = 'Kiểm tra quota và billing tại Google AI Studio';
        break;

      case this.ERROR_TYPES.RATE_LIMIT:
        errorInfo.retryable = true;
        errorInfo.userMessage = 'Đã vượt quá giới hạn request/phút. Vui lòng chờ 30 giây và thử lại.';
        errorInfo.solution = 'Chờ 30 giây trước khi thử lại';
        break;

      case this.ERROR_TYPES.DAILY_LIMIT:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Đã vượt quá giới hạn sử dụng hàng ngày. Vui lòng chờ đến ngày mai.';
        errorInfo.solution = 'Chờ reset quota vào ngày mai';
        break;

      case this.ERROR_TYPES.INVALID_API_KEY:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'API key không hợp lệ hoặc đã bị xóa.';
        errorInfo.solution = 'Kiểm tra và cập nhật API key';
        break;

      case this.ERROR_TYPES.API_KEY_DISABLED:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'API key đã bị vô hiệu hóa.';
        errorInfo.solution = 'Kích hoạt lại API key tại Google AI Studio';
        break;

      case this.ERROR_TYPES.API_KEY_EXPIRED:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'API key đã hết hạn.';
        errorInfo.solution = 'Tạo API key mới tại Google AI Studio';
        break;

      case this.ERROR_TYPES.MODEL_NOT_FOUND:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Model không tồn tại hoặc không được hỗ trợ.';
        errorInfo.solution = 'Kiểm tra tên model và cập nhật nếu cần';
        break;

      case this.ERROR_TYPES.MODEL_DEPRECATED:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Model đã bị loại bỏ và không còn được hỗ trợ.';
        errorInfo.solution = 'Chuyển sang model mới hơn (gemini-2.0-flash)';
        break;

      case this.ERROR_TYPES.MODEL_UNSUPPORTED:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Model không được hỗ trợ trong khu vực này.';
        errorInfo.solution = 'Sử dụng model khác hoặc thay đổi khu vực';
        break;

      case this.ERROR_TYPES.CONTENT_TOO_LONG:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Nội dung quá dài, vượt quá giới hạn của model.';
        errorInfo.solution = 'Chia nhỏ nội dung thành nhiều phần';
        break;

      case this.ERROR_TYPES.CONTENT_VIOLATION:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Nội dung vi phạm chính sách của Google AI.';
        errorInfo.solution = 'Kiểm tra và chỉnh sửa nội dung';
        break;

      case this.ERROR_TYPES.CONTENT_FILTERED:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Nội dung bị lọc bởi hệ thống an toàn.';
        errorInfo.solution = 'Chỉnh sửa nội dung để phù hợp với chính sách';
        break;

      case this.ERROR_TYPES.NETWORK_ERROR:
        errorInfo.retryable = true;
        errorInfo.userMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
        errorInfo.solution = 'Kiểm tra kết nối mạng và thử lại';
        break;

      case this.ERROR_TYPES.TIMEOUT:
        errorInfo.retryable = true;
        errorInfo.userMessage = 'Request bị timeout. Vui lòng thử lại.';
        errorInfo.solution = 'Thử lại sau vài giây';
        break;

      case this.ERROR_TYPES.SERVER_ERROR:
        errorInfo.retryable = true;
        errorInfo.userMessage = 'Lỗi server. Vui lòng thử lại sau.';
        errorInfo.solution = 'Thử lại sau vài phút';
        break;

      case this.ERROR_TYPES.VALIDATION_ERROR:
        errorInfo.retryable = false;
        errorInfo.userMessage = 'Dữ liệu đầu vào không hợp lệ.';
        errorInfo.solution = 'Kiểm tra và sửa dữ liệu đầu vào';
        break;

      default:
        errorInfo.retryable = true;
        errorInfo.userMessage = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
        errorInfo.solution = 'Thử lại sau vài phút';
    }
  }

  /**
   * Tạo thông báo lỗi chi tiết cho developer
   */
  createDeveloperMessage(errorInfo) {
    return {
      type: errorInfo.type,
      code: errorInfo.code,
      message: errorInfo.message,
      details: errorInfo.details,
      retryable: errorInfo.retryable,
      timestamp: new Date().toISOString(),
      userMessage: errorInfo.userMessage,
      solution: errorInfo.solution
    };
  }

  /**
   * Tạo thông báo lỗi đơn giản cho user
   */
  createUserMessage(errorInfo) {
    return {
      message: errorInfo.userMessage,
      solution: errorInfo.solution,
      retryable: errorInfo.retryable
    };
  }

  /**
   * Kiểm tra xem có nên retry không
   */
  shouldRetry(errorInfo, retryCount = 0) {
    if (!errorInfo.retryable) return false;
    
    // Giới hạn số lần retry
    const maxRetries = 3;
    if (retryCount >= maxRetries) return false;

    // Delay tăng dần theo số lần retry
    const delays = [5000, 10000, 15000]; // 5s, 10s, 15s
    return {
      shouldRetry: true,
      delay: delays[retryCount] || delays[delays.length - 1]
    };
  }

  /**
   * Log lỗi với format chuẩn
   */
  logError(error, context = {}) {
    const errorInfo = this.analyzeError(error);
    
    console.error("🚨 LỖI DỊCH:", {
      type: errorInfo.type,
      code: errorInfo.code,
      message: errorInfo.message,
      retryable: errorInfo.retryable,
      context: context,
      timestamp: new Date().toISOString(),
      details: errorInfo.details
    });

    return errorInfo;
  }
}

module.exports = ErrorHandlerService; 