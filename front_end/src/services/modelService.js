import axios from 'axios';
import { API_URL } from '../config/config';

export const modelService = {
    // Lấy tất cả providers
    getProviders: async () => {
        try {
            const response = await axios.get(`${API_URL}/models/providers`);
            console.log("📦 Response từ API providers:", response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching providers:', error);
            throw error;
        }
    },

    // Lấy tất cả models
    getModels: async () => {
        try {
            const response = await axios.get(`${API_URL}/models`);
            console.log("📦 Response từ API models:", response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching models:', error);
            throw error;
        }
    },

    // Lấy models theo provider
    getModelsByProvider: async (providerId) => {
        try {
            console.log("🔍 Đang lấy models cho provider:", providerId);
            // Lấy tất cả providers trước
            const providersResponse = await axios.get(`${API_URL}/models/providers`);
            console.log("📦 Danh sách providers:", providersResponse.data);

            // Tìm provider cần lấy models
            const provider = providersResponse.data.find(p => p.id === providerId);
            if (!provider) {
                console.error("❌ Không tìm thấy provider với ID:", providerId);
                return [];
            }

            console.log("✅ Tìm thấy provider:", provider);
            console.log("📚 Models của provider:", provider.models);

            return provider.models || [];
        } catch (error) {
            console.error('❌ Error fetching models by provider:', error);
            throw error;
        }
    },

    // Lấy thông tin chi tiết của một model
    getModelInfo: async (modelValue) => {
        try {
            const response = await axios.get(`${API_URL}/models/${modelValue}`);
            console.log("📦 Response từ API model info:", response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching model info:', error);
            throw error;
        }
    },

    // Lấy danh sách tất cả models
    getModelsList: async () => {
        try {
            const response = await axios.get(`${API_URL}/models/list/all`);
            console.log("📦 Response từ API models list:", response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching models list:', error);
            throw error;
        }
    }
}; 