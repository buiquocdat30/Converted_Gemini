# 📚 Tính năng Glossary và Xuất File

## 🔍 **Tổng quan**

Hệ thống đã được cải tiến để tự động phát hiện và lưu trữ tên riêng (glossary) từ các đoạn dịch, đồng thời đảm bảo file xuất ra sạch sẽ không chứa thông tin glossary.

## ⚙️ **Cách thức hoạt động**

### 1. **Phát hiện tên riêng tự động**
- AI sẽ tự động phát hiện tên riêng trong quá trình dịch
- Tên riêng được phân loại theo loại (Nhân vật, Địa danh, Tổ chức, v.v.)
- Định dạng: `Tên gốc = Tên dịch [Loại] [Ngôn ngữ]`

### 2. **Lưu trữ glossary**
- Tên riêng được lưu vào database theo từng truyện
- Hệ thống đếm số lần xuất hiện của mỗi tên
- Glossary được sử dụng cho các lần dịch tiếp theo

### 3. **Xuất file sạch sẽ**
- Khi xuất file TXT/EPUB, phần glossary tự động bị loại bỏ
- Chỉ giữ lại tiêu đề chương và nội dung dịch
- File xuất ra hoàn toàn sạch sẽ, phù hợp để đọc

## 🎯 **Lợi ích**

### ✅ **Tính nhất quán**
- Tên riêng được dịch nhất quán xuyên suốt truyện
- Tránh tình trạng dịch khác nhau giữa các chương

### ✅ **Học hỏi tự động**
- Hệ thống tự động học từ các lần dịch trước
- Chất lượng dịch cải thiện theo thời gian

### ✅ **File xuất sạch**
- Không có thông tin kỹ thuật trong file cuối
- Phù hợp để đọc và chia sẻ

## 🔧 **Cấu hình**

### **Prompt được cập nhật**
```
📚 THƯ VIỆN TỪ MỚI:
Sau khi dịch xong, hãy liệt kê các tên riêng mới phát hiện trong đoạn văn này theo format:
Tên gốc = Tên dịch [Loại] [Ngôn ngữ]

Ví dụ:
张伟 = Trương Vĩ [Nhân vật] [Trung]
M都 = M Đô [Địa danh] [Trung]
Haikura Shinku = Haikura Shinku [Nhân vật] [Nhật]

⚠️ LƯU Ý: Phần "THƯ VIỆN TỪ MỚI" này chỉ dùng để tạo thư viện từ mới, KHÔNG được xuất ra file cuối cùng. Chỉ trả về nội dung dịch và phần glossary này.
```

### **Hàm lọc nội dung**
```javascript
export const cleanContentForExport = (content) => {
  if (!content) return "";
  
  // Loại bỏ phần "📚 THƯ VIỆN TỪ MỚI:" và tất cả nội dung sau đó
  const cleanedContent = content.replace(/📚 THƯ VIỆN TỪ MỚI:[\s\S]*$/g, '');
  
  // Loại bỏ các dòng trống thừa ở cuối
  return cleanedContent.trim();
};
```

## 📁 **Các file đã cập nhật**

### **Backend**
- `back_end/services/translateService.js` - Cập nhật prompt
- `back_end/services/glossaryService.js` - Xử lý glossary

### **Frontend**
- `front_end/src/utils/fileHandlers.js` - Thêm hàm lọc nội dung
- `front_end/src/components/TranslateViewer/TranslateViewer.jsx` - Cập nhật xuất file
- `front_end/src/pages/Converte.jsx` - Thêm xuất file cho converter

## 🚀 **Sử dụng**

### **Dịch truyện**
1. Upload file truyện
2. Chọn API key và model
3. Bắt đầu dịch
4. Hệ thống tự động phát hiện và lưu tên riêng

### **Xuất file**
1. Sau khi dịch xong, nhấn "Xuất EPUB" hoặc "Xuất Text"
2. File xuất ra sẽ không chứa phần glossary
3. Chỉ có tiêu đề chương và nội dung dịch

### **Quản lý glossary**
1. Vào trang "Glossary Manager"
2. Chọn truyện để xem glossary
3. Có thể chỉnh sửa, xóa hoặc xuất CSV

## 📊 **Kết quả**

- ✅ Tính nhất quán trong dịch thuật
- ✅ File xuất sạch sẽ, dễ đọc
- ✅ Hệ thống học hỏi tự động
- ✅ Quản lý glossary hiệu quả 