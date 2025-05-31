// routes/providerRoutes.js
const express = require('express');
const router = express.Router();
const providerController = require('../adminControllers/providerController');

router.get('/', providerController.getAllProviders);
router.post('/', providerController.createProvider);
router.get('/:id', providerController.getProviderById);
router.put('/:id', providerController.updateProvider);
router.delete('/:id', providerController.deleteProvider);

module.exports = router;