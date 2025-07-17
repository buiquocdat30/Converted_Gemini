const express = require('express');
const router = express.Router();

// Import các controller
const userController = require('../adminControllers/userController');
const modelController = require('../adminControllers/modelController');
const providerController = require('../adminControllers/providerController');
const defaultKeyController = require('../adminControllers/defaultKeyController');
const apiKeyController = require('../adminControllers/apiKeyController');
const tudienController = require('../adminControllers/tudienController');

// --- USER ROUTES ---
router.get('/users', userController.getAllUsers);
router.post('/users', userController.createUser);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
if (userController.getUserKeys) router.get('/users/:id/keys', userController.getUserKeys);
if (userController.getUserUsage) router.get('/users/:id/usage', userController.getUserUsage);

// --- MODEL ROUTES ---
router.get('/models', modelController.getAllModels);
router.post('/models', modelController.createModel);
router.put('/models/:id', modelController.updateModel);
router.delete('/models/:id', modelController.deleteModel);
if (modelController.getModelsByProvider) router.get('/providers/:providerId/models', modelController.getModelsByProvider);

// --- PROVIDER ROUTES ---
router.get('/providers', providerController.getAllProviders);
router.post('/providers', providerController.createProvider);
router.put('/providers/:id', providerController.updateProvider);
router.delete('/providers/:id', providerController.deleteProvider);

// --- DEFAULT KEY ROUTES ---
router.get('/default-keys', defaultKeyController.getAllDefaultKeys);
router.post('/default-keys', defaultKeyController.createDefaultKey);
router.put('/default-keys/:id', defaultKeyController.updateDefaultKey);
router.delete('/default-keys/:id', defaultKeyController.deleteDefaultKey);
if (defaultKeyController.getDefaultKeyUsage) router.get('/default-keys/:id/usage', defaultKeyController.getDefaultKeyUsage);

// --- API KEY ROUTES ---
if (apiKeyController.getAllApiKeys) router.get('/api-keys', apiKeyController.getAllApiKeys);
if (apiKeyController.createApiKey) router.post('/api-keys', apiKeyController.createApiKey);
if (apiKeyController.updateApiKey) router.put('/api-keys/:id', apiKeyController.updateApiKey);
if (apiKeyController.deleteApiKey) router.delete('/api-keys/:id', apiKeyController.deleteApiKey);

// --- TỪ ĐIỂN ROUTES ---
if (tudienController.getAllTudien) router.get('/tudien', tudienController.getAllTudien);
if (tudienController.createTudien) router.post('/tudien', tudienController.createTudien);
if (tudienController.updateTudien) router.put('/tudien/:id', tudienController.updateTudien);
if (tudienController.deleteTudien) router.delete('/tudien/:id', tudienController.deleteTudien);

module.exports = router; 