const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { handleUpload } = require('../controllers/uploadController');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), handleUpload);

module.exports = router;
