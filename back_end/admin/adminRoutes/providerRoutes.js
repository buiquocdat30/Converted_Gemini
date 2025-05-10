// routes/providerRoutes.js
const express = require('express');
const router = express.Router();
const providerController = require('../adminControllers/providerController');

router.get('/', providerController.getAllProviders);
router.get('/:id', providerController.getProviderById);
router.post('/', providerController.createProvider);
router.put('/:id', providerController.updateProvider);
router.delete('/:id', providerController.deleteProvider);

module.exports = router;