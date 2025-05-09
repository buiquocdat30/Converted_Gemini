// controllers/defaultKeyController.js
const defaultKeyService = require('../adminServices/defaultKeyService'); // Đảm bảo đường dẫn này chính xác

async function getAllDefaultKeys(req, res) {
  try {
    const defaultKeys = await defaultKeyService.getAllDefaultKeys();
    res.json(defaultKeys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getDefaultKeyById(req, res) {
  const { id } = req.params;
  try {
    const defaultKey = await defaultKeyService.getDefaultKeyById(id);
    if (!defaultKey) {
      return res.status(404).json({ message: 'DefaultKey không tồn tại.' });
    }
    res.json(defaultKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createDefaultKey(req, res) {
  const { key, modelId } = req.body;
  try {
    const newDefaultKey = await defaultKeyService.createDefaultKey({ key, modelId });
    res.status(201).json(newDefaultKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateDefaultKey(req, res) {
  const { id } = req.params;
  const { key, modelId } = req.body;
  try {
    const updatedDefaultKey = await defaultKeyService.updateDefaultKey(id, { key, modelId });
    if (!updatedDefaultKey) {
        return res.status(404).json({ message: 'DefaultKey không tồn tại để cập nhật.' });
    }
    res.json(updatedDefaultKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteDefaultKey(req, res) {
  const { id } = req.params;
  try {
    const deletedKey = await defaultKeyService.deleteDefaultKey(id);
    if (!deletedKey) {
        return res.status(404).json({ message: 'DefaultKey không tồn tại để xóa.' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllDefaultKeys,
  getDefaultKeyById,
  createDefaultKey,
  updateDefaultKey,
  deleteDefaultKey,
};