# Session Storage cho Key và Model Selection

## Tổng quan

Tính năng này cho phép lưu trữ trạng thái chọn key và model trong session storage, giúp người dùng không phải chọn lại key và model mỗi khi chuyển trang hoặc refresh.

## Tính năng

### 1. Lưu trữ trạng thái Key Selection
- **selectedKeys**: Danh sách các key đã được chọn (checkbox)
- **currentKey**: Key hiện tại đang được sử dụng
- Trạng thái được lưu trong `sessionStorage` và tự động khôi phục khi mở lại ứng dụng

### 2. Lưu trữ trạng thái Model Selection
- **selectedModel**: Model AI đã được chọn
- Trạng thái được lưu trong `sessionStorage` và tự động khôi phục khi mở lại ứng dụng

### 3. Tự động reset khi đóng ứng dụng
- Khi đóng tab/window, session storage sẽ được xóa
- Khi mở lại ứng dụng, trạng thái sẽ reset về mặc định

## Cách hoạt động

### SessionContext
```javascript
// Khởi tạo state từ sessionStorage
const [selectedKeys, setSelectedKeys] = useState(() => {
  const saved = sessionStorage.getItem('selectedKeys');
  return saved ? JSON.parse(saved) : [];
});

// Tự động lưu khi state thay đổi
useEffect(() => {
  sessionStorage.setItem('selectedKeys', JSON.stringify(selectedKeys));
}, [selectedKeys]);
```

### Sử dụng trong Components

#### ConverteKeyInput
- Sử dụng `useSession()` hook để truy cập session state
- Tự động đồng bộ trạng thái chọn key với session storage
- Khi user chọn/bỏ chọn key, trạng thái được lưu ngay lập tức

#### ModelSelector
- Sử dụng `useSession()` hook để truy cập session state
- Tự động đồng bộ trạng thái chọn model với session storage
- Khi user thay đổi model, trạng thái được lưu ngay lập tức

#### UploadForm & TranslatorApp
- Đồng bộ session state với local state
- Sử dụng session state làm giá trị mặc định khi khởi tạo

## Cấu trúc Session Storage

```javascript
sessionStorage = {
  'selectedKeys': ['key1', 'key2', 'key3'], // Array các key đã chọn
  'currentKey': 'key1', // Key hiện tại đang sử dụng
  'selectedModel': 'gemini-2.0-flash' // Model đã chọn
}
```

## API của SessionContext

### State
- `selectedKeys`: Array các key đã chọn
- `currentKey`: Key hiện tại đang sử dụng
- `selectedModel`: Model đã chọn

### Functions
- `updateSelectedKeys(keys)`: Cập nhật danh sách key đã chọn
- `updateCurrentKey(key)`: Cập nhật key hiện tại
- `updateSelectedModel(model)`: Cập nhật model đã chọn
- `clearSession()`: Xóa toàn bộ session storage

## Lợi ích

1. **Trải nghiệm người dùng tốt hơn**: Không cần chọn lại key và model mỗi khi chuyển trang
2. **Tiết kiệm thời gian**: Trạng thái được lưu tự động
3. **Bảo mật**: Session storage chỉ tồn tại trong phiên làm việc
4. **Tự động reset**: Khi đóng ứng dụng, trạng thái được xóa sạch

## Lưu ý

- Session storage chỉ tồn tại trong một phiên làm việc (tab/window)
- Khi đóng tab hoặc refresh trang, session storage vẫn được giữ nguyên
- Khi đóng hoàn toàn trình duyệt, session storage sẽ bị xóa
- Trạng thái được đồng bộ real-time giữa các component

## Troubleshooting

### Nếu trạng thái không được lưu
1. Kiểm tra xem SessionProvider đã được wrap đúng cách chưa
2. Kiểm tra console để xem có lỗi JavaScript không
3. Kiểm tra sessionStorage trong DevTools

### Nếu trạng thái không được khôi phục
1. Kiểm tra xem sessionStorage có dữ liệu không
2. Kiểm tra logic khởi tạo state trong SessionContext
3. Kiểm tra useEffect dependencies 