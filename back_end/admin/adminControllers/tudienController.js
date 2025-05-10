// controllers/TuDienController.js
const TuDienService = require('../adminServices/TuDienService');

async function getAllTuDien(req, res) {
  try {
    const TuDienList = await TuDienService.getAllTuDien();
    res.json(TuDienList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getTuDienById(req, res) {
  const { id } = req.params;
  try {
    const TuDien = await TuDienService.getTuDienById(id);
    if (!TuDien) {
      return res.status(404).json({ message: 'Từ Hán Việt không tồn tại.' });
    }
    res.json(TuDien);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createTuDien(req, res) {
  const { hanTu, pinyin, nghiaViet } = req.body;
  try {
    const newTuDien = await TuDienService.createTuDien({ hanTu, pinyin, nghiaViet });
    res.status(201).json(newTuDien);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateTuDien(req, res) {
  const { id } = req.params;
  const { hanTu, pinyin, nghiaViet } = req.body;
  try {
    const updatedTuDien = await TuDienService.updateTuDien(id, { hanTu, pinyin, nghiaViet });
    res.json(updatedTuDien);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteTuDien(req, res) {
  const { id } = req.params;
  try {
    await TuDienService.deleteTuDien(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function importTuDien(req, res) {
  const { filePath } = req.body; // Hoặc bạn có thể xử lý upload file
  try {
    const result = await TuDienService.importTuDienFromFile(filePath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllTuDien,
  getTuDienById,
  createTuDien,
  updateTuDien,
  deleteTuDien,
  importTuDien,
};