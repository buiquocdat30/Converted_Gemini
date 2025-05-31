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
      return res.status(404).json({ message: 'Default key không tồn tại.' });
    }
    res.json(defaultKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createDefaultKey(req, res) {
  const defaultKeyData = req.body;
  try {
    const newDefaultKey = await defaultKeyService.createDefaultKey(defaultKeyData);
    res.status(201).json(newDefaultKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateDefaultKey(req, res) {
  const { id } = req.params;
  const defaultKeyData = req.body;
  try {
    const updatedDefaultKey = await defaultKeyService.updateDefaultKey(id, defaultKeyData);
    if (!updatedDefaultKey) {
      return res.status(404).json({ message: 'Default key không tồn tại để cập nhật.' });
    }
    res.json(updatedDefaultKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteDefaultKey(req, res) {
  const { id } = req.params;
  try {
    const deletedDefaultKey = await defaultKeyService.deleteDefaultKey(id);
    if (!deletedDefaultKey) {
      return res.status(404).json({ message: 'Default key không tồn tại để xóa.' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getDefaultKeysByModel(req, res) {
  const { modelId } = req.params;
  try {
    const defaultKeys = await defaultKeyService.getDefaultKeysByModel(modelId);
    res.json(defaultKeys);
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
  getDefaultKeysByModel
};