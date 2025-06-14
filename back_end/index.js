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
const { serverAdapter } = require('./services/queueManager');

//quản lý admin-panel
const providerRoutes = require("./admin/adminRoutes/providerRoutes");
const modelRoutes = require("./admin/adminRoutes/modelRoutes");
const defaultKeyRoutes = require("./admin/adminRoutes/defaultKeyRoutes");
const tudienRoutes = require("./admin/adminRoutes/tudienRoutes");
const userRoutes = require("./admin/adminRoutes/userRoutes");
const apiKeyRoutes = require("./admin/adminRoutes/apiKeyRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

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

//quản lý admin-panel
app.use("/admin/providers", providerRoutes);
app.use("/admin/models", modelRoutes);
app.use("/admin/default-keys", defaultKeyRoutes);
app.use("/admin/han-viet", tudienRoutes);
app.use("/admin/users", userRoutes);
app.use("/admin/api-keys", apiKeyRoutes);

// Mount Bull Board UI
app.use('/admin/queues', serverAdapter.getRouter());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Bull Board UI available at http://localhost:${PORT}/admin/queues`);
});
