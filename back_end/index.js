const express = require('express');
const cors = require('cors');
const connectDB = require('./config/prismaConfig');
const uploadRoute = require('./routes/uploadRoute');
const translateRoute = require('./routes/translateRoute');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Route upload
app.use('/api/upload', uploadRoute);

//translate
app.use('/api/translate', translateRoute);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
