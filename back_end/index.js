const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// Import routes
const uploadRoute = require("./routes/uploadRoute");
const translateRoute = require("./routes/translateRoute");
const converteRoute = require("./routes/converteRoute");
const authRoute = require("./routes/authRoute");
const userRoute = require("./routes/userRoute");
const userApiKeyRoute = require("./routes/userApiKeyRoute");
const userLibraryRoute = require("./routes/userLibraryRoute");
const publicModelRoute = require("./routes/publicModelRoute");
const glossaryRoute = require("./routes/glossaryRoute");
const adminRoutes = require("./admin/adminRoutes/adminRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000; // Đổi port để tránh conflict

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000", 
    "http://127.0.0.1:5173"
  ],
  credentials: true
}));
app.use("/data/upload", express.static(path.join(__dirname, "data/upload")));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Route
// Route upload file
app.use("/upload", uploadRoute);
// Route translate
app.use("/translate", translateRoute);
// Route auth
app.use("/auth", authRoute);
// Route converte
app.use("/converte", converteRoute);
// Route models
app.use("/models", publicModelRoute);
// Route user keys
app.use("/user/keys", userApiKeyRoute);
// Route user library 
app.use("/user/library", userLibraryRoute);
// Route user glossary
app.use("/user/glossary", glossaryRoute);
// Route user
app.use("/user", userRoute);
// Route admin
app.use("/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`[SERVER] Express server chạy trên http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[SERVER] Đang đóng Express server...');
  process.exit(0);
});
