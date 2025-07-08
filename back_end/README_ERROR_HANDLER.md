# Error Handler Service - Hướng dẫn sử dụng

## Tổng quan

`ErrorHandlerService` là một service chuyên phân tích và xử lý các loại lỗi khác nhau từ Google Generative AI (Gemini API). Service này giúp phân biệt các loại lỗi và đưa ra thông báo phù hợp cho người dùng.

## Các loại lỗi được hỗ trợ

### 1. Lỗi Quota/Rate Limit
- **QUOTA_EXCEEDED**: Vượt quá giới hạn sử dụng API
- **RATE_LIMIT**: Vượt quá giới hạn request/phút
- **DAILY_LIMIT**: Vượt quá giới hạn sử dụng hàng ngày

### 2. Lỗi Authentication
- **INVALID_API_KEY**: API key không hợp lệ
- **API_KEY_DISABLED**: API key bị vô hiệu hóa
- **API_KEY_EXPIRED**: API key đã hết hạn

### 3. Lỗi Model
- **MODEL_NOT_FOUND**: Model không tồn tại
- **MODEL_DEPRECATED**: Model đã bị loại bỏ
- **MODEL_UNSUPPORTED**: Model không được hỗ trợ

### 4. Lỗi Content
- **CONTENT_TOO_LONG**: Nội dung quá dài
- **CONTENT_VIOLATION**: Nội dung vi phạm chính sách
- **CONTENT_FILTERED**: Nội dung bị lọc

### 5. Lỗi Network
- **NETWORK_ERROR**: Lỗi kết nối mạng
- **TIMEOUT**: Request bị timeout
- **SERVER_ERROR**: Lỗi server

### 6. Lỗi khác
- **UNKNOWN_ERROR**: Lỗi không xác định
- **VALIDATION_ERROR**: Lỗi validation

## Cách sử dụng

### 1. Khởi tạo service

```javascript
const ErrorHandlerService = require('./services/errorHandlerService');
const errorHandler = new ErrorHandlerService();
```

### 2. Phân tích lỗi

```javascript
try {
  // Gọi Gemini API
  const result = await model.generateContent(prompt);
} catch (error) {
  // Phân tích lỗi
  const errorInfo = errorHandler.analyzeError(error);
  
  console.log('Loại lỗi:', errorInfo.type);
  console.log('Có thể retry:', errorInfo.retryable);
  console.log('Thông báo cho user:', errorInfo.userMessage);
  console.log('Giải pháp:', errorInfo.solution);
}
```

### 3. Tạo thông báo lỗi

```javascript
// Thông báo chi tiết cho developer
const devMessage = errorHandler.createDeveloperMessage(errorInfo);

// Thông báo đơn giản cho user
const userMessage = errorHandler.createUserMessage(errorInfo);
```

### 4. Kiểm tra retry

```javascript
const retryInfo = errorHandler.shouldRetry(errorInfo, retryCount);
if (retryInfo.shouldRetry) {
  // Chờ delay rồi retry
  await delay(retryInfo.delay);
  // Thử lại
}
```

### 5. Log lỗi

```javascript
const errorInfo = errorHandler.logError(error, {
  model: 'gemini-2.0-flash',
  key: 'AIzaSyC...',
  type: 'content',
  storyId: '123',
  textLength: 1000
});
```

## Ví dụ sử dụng trong translateService

```javascript
const translateText = async (text, keyInfo, modelAI, type = "content", storyId = null) => {
  try {
    // Gọi Gemini API
    const result = await model.generateContent(prompt);
    // Xử lý kết quả...
  } catch (error) {
    // Sử dụng ErrorHandlerService để phân tích lỗi
    const errorInfo = errorHandler.logError(error, {
      model: currentModelAI,
      key: key.substring(0, 8) + "...",
      type: type,
      storyId: storyId,
      textLength: text?.length || 0
    });

    // Trả về thông tin lỗi rõ ràng
    return {
      translated: null,
      usage: null,
      isUnchanged: false,
      error: errorInfo.userMessage,
      errorDetails: errorHandler.createDeveloperMessage(errorInfo),
      hasError: true,
      retryable: errorInfo.retryable,
      errorType: errorInfo.type,
      solution: errorInfo.solution
    };
  }
};
```

## Test Error Handler

Chạy script test để kiểm tra khả năng phân biệt các loại lỗi:

```bash
cd back_end
node test_error_handler.js
```

Script test sẽ kiểm tra:
- Phân tích các loại lỗi khác nhau
- Tạo thông báo lỗi phù hợp
- Logic retry
- Error logging

## Cấu trúc dữ liệu trả về

### errorInfo object
```javascript
{
  type: 'QUOTA_EXCEEDED',           // Loại lỗi
  code: '429',                      // HTTP status code
  message: 'Too Many Requests',     // Message gốc
  details: {},                      // Chi tiết lỗi (JSON)
  retryable: false,                 // Có thể retry hay không
  userMessage: 'Đã vượt quá giới hạn...', // Thông báo cho user
  solution: 'Kiểm tra quota...'     // Giải pháp
}
```

### devMessage object
```javascript
{
  type: 'QUOTA_EXCEEDED',
  code: '429',
  message: 'Too Many Requests',
  details: {},
  retryable: false,
  timestamp: '2024-01-01T00:00:00.000Z',
  userMessage: 'Đã vượt quá giới hạn...',
  solution: 'Kiểm tra quota...'
}
```

### userMessage object
```javascript
{
  message: 'Đã vượt quá giới hạn sử dụng API...',
  solution: 'Kiểm tra quota và billing tại Google AI Studio',
  retryable: false
}
```

## Lưu ý quan trọng

1. **Retry Logic**: Chỉ retry các lỗi có thể khắc phục (network, timeout, rate limit)
2. **User Message**: Luôn cung cấp thông báo thân thiện với user
3. **Solution**: Đưa ra hướng dẫn cụ thể để khắc phục lỗi
4. **Logging**: Log đầy đủ thông tin để debug

## Cập nhật và mở rộng

Để thêm loại lỗi mới:

1. Thêm vào `ERROR_TYPES` trong constructor
2. Cập nhật `GOOGLE_ERROR_CODES` mapping
3. Thêm logic phân tích trong `analyzeErrorMessage()`
4. Thêm case xử lý trong `setErrorProperties()`
5. Cập nhật test cases

## Tài liệu tham khảo

- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Error Codes](https://ai.google.dev/gemini-api/docs/errors)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) 