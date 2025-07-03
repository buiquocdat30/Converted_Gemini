# Quy trình dịch song song & Queue dịch chương

## 1. Tổng quan
- Khi user bấm "Dịch toàn bộ chương trong trang" hoặc dịch từng chương, hệ thống sẽ quản lý trạng thái từng chương và xử lý dịch song song theo batch.
- Mục tiêu: Tăng tốc độ dịch, bảo vệ server, cho phép dừng/hủy dịch, hiển thị trạng thái rõ ràng cho user.

---

## 2. Dịch song song theo batch
- Số chương dịch song song tối đa mỗi batch: **MAX_PARALLEL = 3** (có thể cấu hình).
- Ví dụ: 1 trang có 10 chương → chia thành 4 batch: (3, 3, 3, 1).
- Mỗi batch gửi tối đa 3 request dịch chương lên BE cùng lúc, chờ xong batch này mới gửi batch tiếp theo.
- Có delay nhỏ giữa các batch để tránh quá tải server.

### **Luồng xử lý dịch all:**
1. Tạo queue các chương cần dịch.
2. Lặp theo batch:
   - Lấy tối đa 3 chương ra khỏi queue.
   - Gửi song song 3 request dịch chương.
   - Khi xong batch, cập nhật kết quả, trạng thái, tiến độ tổng.
   - Nếu user bấm dừng, dừng lấy batch mới (các request đang chạy vẫn hoàn thành).
3. Khi hết queue hoặc user dừng, kết thúc.

---

## 3. Trạng thái queue từng chương
- Mỗi chương có trạng thái riêng:
  - `PENDING`: Đã bấm dịch, chờ gửi request hoặc chờ BE phản hồi.
  - `PROCESSING`: Đã gửi request, BE đang xử lý.
  - `COMPLETE`: Dịch xong, đã nhận kết quả thành công.
  - `CANCELLED`: Người dùng chủ động hủy khi đang PENDING/PROCESSING.
  - `FAILED`: Có lỗi khi xử lý (BE trả lỗi hoặc network lỗi).

### **Luồng trạng thái dịch 1 chương:**
- User bấm dịch → `PENDING`
- Gửi request → `PROCESSING`
- BE trả kết quả → `COMPLETE`
- Nếu user bấm hủy khi đang PENDING/PROCESSING → `CANCELLED`
- Nếu có lỗi → `FAILED`

### **Lưu ý:**
- Nếu user hủy khi đã gửi request, kết quả trả về sẽ bị bỏ qua, không cập nhật lên UI.
- Trạng thái được quản lý ở FE, BE không cần biết trạng thái này.

---

## 4. Dừng dịch (Stop/Cancel)
- Khi dịch all: Có thể dừng dịch giữa chừng, batch đang chạy vẫn hoàn thành, batch tiếp theo sẽ không được gửi nữa.
- Khi dịch từng chương: Có thể hủy dịch khi đang PENDING/PROCESSING, trạng thái chuyển sang `CANCELLED`.

---

## 5. Hiển thị UI
- Hiển thị trạng thái từng chương ngay dưới tiêu đề.
- Khi đang PENDING/PROCESSING có nút 🛑 Hủy dịch.
- Khi COMPLETE/FAILED/CANCELLED có thể dịch lại.
- Khi dịch all, hiển thị thời gian ước tính và tiến độ từng chương.

---

## 6. Kỹ thuật & mở rộng
- Có thể thay đổi MAX_PARALLEL để phù hợp với server thực tế.
- Có thể mở rộng queue để ưu tiên, retry, hoặc quản lý nhiều user cùng lúc.
- Có thể log lại thao tác chuyển trạng thái để debug/tracking.

---

## 7. Ví dụ code (FE)
```js
// Quản lý trạng thái từng chương
const [chapterStatus, setChapterStatus] = useState({});
// Khi bấm dịch:
setChapterStatus(prev => ({ ...prev, [index]: 'PENDING' }));
// Khi gửi request:
setChapterStatus(prev => ({ ...prev, [index]: 'PROCESSING' }));
// Khi dịch xong:
setChapterStatus(prev => ({ ...prev, [index]: 'COMPLETE' }));
// Khi user hủy:
setChapterStatus(prev => ({ ...prev, [index]: 'CANCELLED' }));
// Khi lỗi:
setChapterStatus(prev => ({ ...prev, [index]: 'FAILED' }));
```

---

## 8. Tổng kết
- Quy trình queue + dịch song song giúp tăng tốc, kiểm soát tải, nâng cao trải nghiệm user.
- Trạng thái rõ ràng giúp UI minh bạch, dễ debug, dễ mở rộng.
- Có thể áp dụng cho cả dịch từng chương và dịch all chương. 