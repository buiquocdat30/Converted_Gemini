const express = require('express');
const { converteText } = require('../controllers/converteController');
const router = express.Router();


router.post('/', converteText);

module.exports = router;
