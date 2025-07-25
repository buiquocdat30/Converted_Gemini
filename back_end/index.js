const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
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
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('[SOCKET] User connected:', socket.id);
  socket.on('join', (roomId) => {
    socket.join(roomId);
    let extra = '';
    try {
      // Nếu FE truyền roomId là object JSON, parse và log chi tiết
      let info = roomId;
      if (typeof roomId === 'string' && (roomId.startsWith('{') || roomId.startsWith('['))) {
        info = JSON.parse(roomId);
      }
      if (typeof info === 'object') {
        extra = ` | userId: ${info.userId || ''} | storyId: ${info.storyId || ''} | chapterId: ${info.chapterId || ''}`;
        if (info.chapters) {
          extra += ` | chapters: ${Array.isArray(info.chapters) ? info.chapters.length : JSON.stringify(info.chapters)}`;
        }
      }
    } catch (e) {
      extra = ' | roomId parse error';
    }
    console.log(`[SOCKET] Socket ${socket.id} joined room ${roomId}${extra}`);
  });
  socket.on('disconnect', () => {
    console.log('[SOCKET] User disconnected:', socket.id);
  });
});

// Export io để worker dùng
module.exports.io = io;

const PORT = process.env.PORT || 5000;

app.use(cors());
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

server.listen(PORT, () => {
  console.log(`[SERVER] Server is running on http://localhost:${PORT}`);
});
