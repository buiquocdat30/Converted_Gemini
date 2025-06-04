const express = require("express");
const router = express.Router();
const publicModelService = require("../services/publicModelService");

// Lấy tất cả providers (public)
router.get("/providers", async (req, res) => {
    try {
        const providers = await publicModelService.getActiveProviders();
        res.json(providers);
    } catch (error) {
        console.error("Error getting providers:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách providers" });
    }
});

// Lấy tất cả models (public)
router.get("/", async (req, res) => {
    try {
        const models = await publicModelService.getAllModels();
        res.json(models);
    } catch (error) {
        console.error("Error getting models:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách models" });
    }
});

// Lấy models theo provider (public)
router.get("/by-provider/:providerId", async (req, res) => {
    try {
        const { providerId } = req.params;
        const models = await publicModelService.getModelsByProvider(providerId);
        res.json(models);
    } catch (error) {
        console.error("Error getting models by provider:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách models theo provider" });
    }
});

// Lấy thông tin chi tiết của một model (public)
router.get("/:modelValue", async (req, res) => {
    try {
        const { modelValue } = req.params;
        const modelInfo = await publicModelService.getModelInfo(modelValue);
        if (!modelInfo) {
            return res.status(404).json({ error: "Không tìm thấy model" });
        }
        res.json(modelInfo);
    } catch (error) {
        console.error("Error getting model info:", error);
        res.status(500).json({ error: "Lỗi khi lấy thông tin model" });
    }
});

// Lấy danh sách tất cả models (public)
router.get("/list/all", async (req, res) => {
    try {
        const modelsList = await publicModelService.getModelsList();
        res.json(modelsList);
    } catch (error) {
        console.error("Error getting models list:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách models" });
    }
});

module.exports = router; 