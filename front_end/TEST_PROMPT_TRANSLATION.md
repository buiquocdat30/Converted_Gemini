# 🧪 Test Prompt và Luồng Dịch

## 🔍 **Kiểm tra Prompt hiện tại:**

### ✅ **Prompt đã được cấu hình tốt:**

#### **1. Mục tiêu rõ ràng:**
- Dịch toàn bộ văn bản truyện sang tiếng Việt
- Xác định, phân loại và chuyển đổi đúng tên gọi
- Giữ nhất quán trong toàn bộ văn bản

#### **2. Quy tắc chuyển đổi tên gọi chi tiết:**
```
| Ngôn ngữ | Thể loại | Quy tắc |
|---------|----------|--------|
| Trung | Tiên Hiệp, Huyền Huyễn | Hán Việt, biệt danh dịch nghĩa |
| Nhật | Light Novel, Võng Du | Romaji chuẩn, biệt danh dịch nghĩa |
| Hàn | Light Novel, Đô Thị | Romanized, biệt danh dịch nghĩa |
| Anh | Mọi thể loại | Giữ nguyên tên phương Tây |
```

#### **3. Sử dụng glossary:**
- Tự động tải glossary từ database
- Áp dụng tên đã có trong glossary
- Tạo glossary mới từ kết quả dịch

#### **4. Đầu ra sạch sẽ:**
- Không có chú thích, metadata
- Không có ký tự đặc biệt
- Khoảng cách hợp lý
- Đại từ nhân xưng đúng: "ta", "ngươi"

## 🧪 **Test Cases:**

### **Test Case 1: Dịch tên nhân vật Trung Quốc**
**Input:**
```
张伟走进房间，看到李美正在看书。
```

**Expected Output:**
```
Trương Vĩ bước vào phòng, thấy Lý Mỹ đang đọc sách.
```

### **Test Case 2: Dịch tên nhân vật Nhật**
**Input:**
```
灰倉真紅は学校に行きました。
```

**Expected Output:**
```
Haikura Shinku đã đến trường.
```

### **Test Case 3: Dịch với glossary có sẵn**
**Input:**
```
张伟 = Trương Vĩ [Nhân vật] [Trung]
李美 = Lý Mỹ [Nhân vật] [Trung]

张伟和李美一起去公园。
```

**Expected Output:**
```
Trương Vĩ và Lý Mỹ cùng đi công viên.
```

## 🔧 **Cách test:**

### **1. Test qua UI:**
1. Mở `http://localhost:5175/`
2. Upload file truyện có tên nhân vật nước ngoài
3. Dịch 1 chương và kiểm tra kết quả
4. Kiểm tra glossary được tạo

### **2. Test qua API trực tiếp:**
```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "chapters": [{
      "title": "Test Chapter",
      "content": "张伟走进房间，看到李美正在看书。",
      "chapterNumber": 1
    }],
    "userKeys": ["YOUR_API_KEY"],
    "model": "gemini-2.0-flash",
    "storyId": "test-story"
  }'
```

### **3. Kiểm tra log:**
```
📚 Đã tải X items từ glossary cho truyện test-story
📝 Prompt gửi đi: Bạn là "Tên Gọi Chuyên Gia"...
📤 Response từ API: Trương Vĩ bước vào phòng...
✅ Dịch thành công sau Xs với key XXXXXXXX...
```

## 🎯 **Kết quả mong đợi:**

### ✅ **Dịch đúng:**
- Tên nhân vật được dịch theo quy tắc
- Giữ nhất quán trong toàn bộ văn bản
- Không có tên gốc nước ngoài không cần thiết

### ✅ **Glossary hoạt động:**
- Tên mới được phát hiện và lưu
- Tên cũ được sử dụng lại
- Format đúng: `Tên gốc = Tên dịch [Loại] [Ngôn ngữ]`

### ✅ **Đầu ra sạch:**
- Không có phần "THƯ VIỆN TỪ MỚI" trong file xuất
- Không có metadata, chú thích
- Văn bản tự nhiên, dễ đọc

## 🚨 **Vấn đề cần kiểm tra:**

### **1. Glossary extraction:**
- Regex có đúng không: `/📚 THƯ VIỆN TỪ MỚI:\n([\s\S]*?)(?=\n---|$)/`
- Có lưu được vào database không

### **2. Prompt length:**
- Prompt có quá dài không (có thể gây lỗi token limit)
- Có cần tối ưu không

### **3. Error handling:**
- Có xử lý lỗi API đúng không
- Có fallback về text gốc không

## 📊 **Metrics cần theo dõi:**

- Thời gian dịch trung bình
- Tỷ lệ thành công/thất bại
- Số lượng glossary items được tạo
- Chất lượng dịch (độ chính xác tên riêng) 