// routes/defaultKeyRoutes.js
const express = require('express');
const router = express.Router();
const defaultKeyController = require('../adminControllers/defaultKeyController'); // Đảm bảo đường dẫn này chính xác

router.get('/', defaultKeyController.getAllDefaultKeys);
router.post('/', defaultKeyController.createDefaultKey);
router.get('/:id', defaultKeyController.getDefaultKeyById);
router.put('/:id', defaultKeyController.updateDefaultKey);
router.delete('/:id', defaultKeyController.deleteDefaultKey);

module.exports = router;