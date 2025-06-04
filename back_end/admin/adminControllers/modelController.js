// controllers/modelController.js
const modelService = require('../adminServices/modelService'); // Đảm bảo đường dẫn này chính xác

async function getAllModels(req, res) {
  const { providerId } = req.query; // Lấy providerId từ query params nếu có
  try {
    const models = await modelService.getAllModels(providerId);
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getModelsList(req, res) {
  try {
    const modelsList = await modelService.getModelsList();
    res.json(modelsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getModelById(req, res) {
  const { id } = req.params;
  try {
    const model = await modelService.getModelById(id);
    if (!model) {
      return res.status(404).json({ message: 'Model không tồn tại.' });
    }
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createModel(req, res) {
  // Giả sử data cho model được gửi trong req.body
  // Ví dụ: { name: 'GPT-4', providerId: 'some-provider-id', type: 'text-generation', ... }
  const modelData = req.body;
  try {
    const newModel = await modelService.createModel(modelData);
    res.status(201).json(newModel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateModel(req, res) {
  const { id } = req.params;
  const modelData = req.body;
  try {
    const updatedModel = await modelService.updateModel(id, modelData);
    if (!updatedModel) {
        return res.status(404).json({ message: 'Model không tồn tại để cập nhật.' });
    }
    res.json(updatedModel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteModel(req, res) {
  const { id } = req.params;
  try {
    const deletedModel = await modelService.deleteModel(id);
    if (!deletedModel) {
        return res.status(404).json({ message: 'Model không tồn tại để xóa.' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllModels,
  getModelsList,
  getModelById,
  createModel,
  updateModel,
  deleteModel,
};