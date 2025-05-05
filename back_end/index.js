const express = require("express");
const cors = require("cors");
const connectDB = require("./config/prismaConfig");
const bodyParser = require("body-parser");
const uploadRoute = require("./routes/uploadRoute");
const translateRoute = require("./routes/translateRoute");
const authRoute=require("./routes/authRoute")
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Tăng giới hạn kích thước của payload cho phép
app.use(bodyParser.json({ limit: "100mb" }));
// Giới hạn 50MB cho JSON body
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
// Route upload
app.use("/api/upload", uploadRoute);

//translate
app.use("/api/translate", translateRoute);

//user
app.use("/api/auth", authRoute)



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
