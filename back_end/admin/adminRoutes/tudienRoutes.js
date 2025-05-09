// routes/TuDienRoutes.js
const express = require('express');
const router = express.Router();
const tudienController = require('../controllers/tudienController');

router.get('/', tudienController.getAllTuDien);
router.get('/:id', tudienController.getTuDienById);
router.post('/', tudienController.createTuDien);
router.put('/:id', tudienController.updateTuDien);
router.delete('/:id', tudienController.deleteTuDien);
router.post('/import', tudienController.importTuDien); // Route để import từ file

module.exports = router;