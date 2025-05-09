// controllers/providerController.js
const providerService = require('../services/providerService');

async function getAllProviders(req, res) {
  try {
    const providers = await providerService.getAllProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getProviderById(req, res) {
  const { id } = req.params;
  try {
    const provider = await providerService.getProviderById(id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider không tồn tại.' });
    }
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createProvider(req, res) {
  const { name } = req.body;
  try {
    const newProvider = await providerService.createProvider(name);
    res.status(201).json(newProvider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateProvider(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updatedProvider = await providerService.updateProvider(id, name);
    res.json(updatedProvider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteProvider(req, res) {
  const { id } = req.params;
  try {
    await providerService.deleteProvider(id);
    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
};