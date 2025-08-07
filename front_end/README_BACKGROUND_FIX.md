# Fix Background Loading Issue

## Vấn đề
Background không được load ngay khi app khởi động, chỉ hiển thị khi vào trang `/user` và phần giao diện.

## Nguyên nhân
- Background chỉ được áp dụng trong component `Users.jsx`
- Khi app khởi động, nếu user đã đăng nhập nhưng chưa vào trang `/user`, background sẽ không được load
- Logic background bị duplicate và không nhất quán

## Giải pháp đã thực hiện

### 1. Thêm logic vào `ConverteContext.jsx`

**Thêm useEffect để áp dụng background ngay khi app khởi động:**
```javascript
// 🚀 Thêm useEffect để áp dụng background ngay khi app khởi động
useEffect(() => {
  if (userData.backgroundImage) {
    const bgImage = `http://localhost:8000/data/upload/background/${userData.backgroundImage}`;
    document.body.style.backgroundImage = `url(${bgImage})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    localStorage.setItem("backgroundImage", bgImage);
    console.log(`[BACKGROUND] Đã áp dụng background: ${bgImage}`);
  } else {
    // Chỉ xóa background nếu user không đăng nhập hoặc không có background
    if (!userData.id) {
      document.body.style.backgroundImage = "";
      localStorage.removeItem("backgroundImage");
      console.log('[BACKGROUND] Đã xóa background vì user không đăng nhập');
    }
  }
}, [userData.backgroundImage, userData.id]);
```

### 2. Cập nhật hàm `onLogout`

**Thêm logic xóa background khi logout:**
```javascript
const onLogout = () => {
  localStorage.removeItem("auth-token");
  setIsLoggedIn(false);
  // 🚀 Xóa background khi logout
  document.body.style.backgroundImage = "";
  localStorage.removeItem("backgroundImage");
  console.log('[BACKGROUND] Đã xóa background khi logout');
  setUserData({
    // ... reset userData
  });
};
```

### 3. Bỏ logic duplicate trong `Users.jsx`

**Xóa useEffect duplicate:**
```javascript
// 🚀 Bỏ logic duplicate background vì đã được xử lý trong ConverteContext.jsx
// Background sẽ được áp dụng tự động khi userData.backgroundImage thay đổi
```

**Cập nhật handleLogout:**
```javascript
const handleLogout = () => {
  onLogout();
  navigate("/");
  // 🚀 Bỏ logic duplicate vì đã được xử lý trong ConverteContext.jsx
  console.log("User logged out");
  alert("Đăng xuất thành công!");
};
```

## Lợi ích

1. **Background load ngay khi app khởi động** nếu user đã đăng nhập
2. **Logic tập trung** trong `ConverteContext.jsx`
3. **Không duplicate** logic giữa các component
4. **Tự động áp dụng** khi user upload background mới
5. **Tự động xóa** khi user logout

## Timeline hoạt động

```
App khởi động → ConverteContext mount → fetchUserData → userData.backgroundImage thay đổi → useEffect trigger → Background được áp dụng
```

## Test cases

1. **Đăng nhập → Background hiển thị ngay**
2. **Upload background mới → Background cập nhật ngay**
3. **Logout → Background bị xóa**
4. **Refresh trang → Background vẫn hiển thị**
5. **Tắt/mở web → Background vẫn hiển thị** 