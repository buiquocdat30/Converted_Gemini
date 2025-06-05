const express = require('express');
const { translateText } = require('../controllers/translateController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Thêm middleware xác thực cho route translate
router.post('/', authMiddleware, translateText);

module.exports = router;
