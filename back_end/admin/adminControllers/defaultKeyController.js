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

async function addKeyToProviderModels(req, res) {
  const { key, providerId, modelValues } = req.body;
  
  if (!key || !providerId || !modelValues || !Array.isArray(modelValues)) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin cần thiết. Cần có: key, providerId, và modelValues (mảng)' 
    });
  }

  try {
    const results = await defaultKeyService.addKeyToProviderModels(key, providerId, modelValues);
    res.status(201).json({
      message: `Đã thêm key cho ${results.length} models`,
      results
    });
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

async function getDefaultKeysByProvider(req, res) {
  const { providerId } = req.params;
  try {
    const defaultKeys = await defaultKeyService.getDefaultKeysByProvider(providerId);
    res.json(defaultKeys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllDefaultKeys,
  getDefaultKeyById,
  createDefaultKey,
  addKeyToProviderModels,
  updateDefaultKey,
  deleteDefaultKey,
  getDefaultKeysByModel,
  getDefaultKeysByProvider
};