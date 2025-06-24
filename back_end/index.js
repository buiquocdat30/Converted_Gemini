const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const uploadRoute = require("./routes/uploadRoute");
const translateRoute = require("./routes/translateRoute");
const converteRoute = require("./routes/converteRoute");
const authRoute = require("./routes/authRoute");
const userRoute = require("./routes/userRoute");
const userApiKeyRoute = require("./routes/userApiKeyRoute");
const userLibraryRoute = require("./routes/userLibraryRoute");
const publicModelRoute = require("./routes/publicModelRoute");
const path = require("path");

// Admin routes mới
const adminRoutes = require("./admin/adminRoutes/adminRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Phục vụ các file tĩnh từ thư mục data/upload
app.use("/data/upload", express.static(path.join(__dirname, "data/upload")));

// Tăng giới hạn kích thước của payload cho phép
app.use(bodyParser.json({ limit: "100mb" }));
// Giới hạn 50MB cho JSON body
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Route upload file
app.use("/upload", uploadRoute);

//translate
app.use("/translate", translateRoute);

//user authentication
app.use("/auth", authRoute);

//coverte file
app.use("/converte", converteRoute);

// Public API routes
app.use("/models", publicModelRoute);

// Quản lý tài nguyên của user
app.use("/user/keys", userApiKeyRoute); // API keys của user
app.use("/user/library", userLibraryRoute); // Thư viện truyện của user

//quản lý user
app.use("/user", userRoute);

// Admin routes mới
app.use("/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
