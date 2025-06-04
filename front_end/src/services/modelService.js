import axios from 'axios';
import { API_URL } from '../config/config';

export const modelService = {
    // Lấy tất cả providers
    getProviders: async () => {
        try {
            const response = await axios.get(`${API_URL}/models/providers`);
            console.log("providers",response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching providers:', error);
            throw error;
        }
    },

    // Lấy tất cả models
    getModels: async () => {
        try {
            const response = await axios.get(`${API_URL}/models`);
            
            return response.data;
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    },

    // Lấy models theo provider
    getModelsByProvider: async (providerId) => {
        try {
            const response = await axios.get(`${API_URL}/models/by-provider/${providerId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching models by provider:', error);
            throw error;
        }
    },

    // Lấy thông tin chi tiết của một model
    getModelInfo: async (modelValue) => {
        try {
            const response = await axios.get(`${API_URL}/models/${modelValue}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching model info:', error);
            throw error;
        }
    },

    // Lấy danh sách tất cả models
    getModelsList: async () => {
        try {
            const response = await axios.get(`${API_URL}/models/list/all`);
            return response.data;
        } catch (error) {
            console.error('Error fetching models list:', error);
            throw error;
        }
    }
}; 