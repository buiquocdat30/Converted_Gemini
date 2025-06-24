const express = require('express');
const router = express.Router();

// Import admin controllers
const defaultKeyController = require('../adminControllers/defaultKeyController');
const providerController = require('../adminControllers/providerController');
const modelController = require('../adminControllers/modelController');
const userController = require('../adminControllers/userController');

// Default Key routes
router.get('/default-keys', defaultKeyController.getAllDefaultKeys);
router.post('/default-keys', defaultKeyController.createDefaultKey);
router.put('/default-keys/:id', defaultKeyController.updateDefaultKey);
router.delete('/default-keys/:id', defaultKeyController.deleteDefaultKey);
router.get('/default-keys/:id/usage', defaultKeyController.getDefaultKeyUsage);

// Provider routes
router.get('/providers', providerController.getAllProviders);
router.post('/providers', providerController.createProvider);
router.put('/providers/:id', providerController.updateProvider);
router.delete('/providers/:id', providerController.deleteProvider);

// Model routes
router.get('/models', modelController.getAllModels);
router.post('/models', modelController.createModel);
router.put('/models/:id', modelController.updateModel);
router.delete('/models/:id', modelController.deleteModel);
router.get('/providers/:providerId/models', modelController.getModelsByProvider);

// User routes
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.get('/users/:id/keys', userController.getUserKeys);
router.get('/users/:id/usage', userController.getUserUsage);

module.exports = router; 