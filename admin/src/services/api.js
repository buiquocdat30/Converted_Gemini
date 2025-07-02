import axios from "axios";

const API_BASE_URL = "http://localhost:8000/admin";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Default Keys API
export const defaultKeysAPI = {
  getAll: () => api.get("/default-keys"),
  create: (data) => api.post("/default-keys", data),
  update: (id, data) => api.put(`/default-keys/${id}`, data),
  delete: (id) => api.delete(`/default-keys/${id}`),
  getUsage: (id) => api.get(`/default-keys/${id}/usage`),
};

// Providers API
export const providersAPI = {
  getAll: () => api.get("/providers"),
  create: (data) => api.post("/providers", data),
  update: (id, data) => api.put(`/providers/${id}`, data),
  delete: (id) => api.delete(`/providers/${id}`),
};

// Models API
export const modelsAPI = {
  getAll: () => api.get("/models"),
  create: (data) => api.post("/models", data),
  update: (id, data) => api.put(`/models/${id}`, data),
  delete: (id) => api.delete(`/models/${id}`),
  getByProvider: (providerId) => api.get(`/providers/${providerId}/models`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getKeys: (id) => api.get(`/users/${id}/keys`),
  getUsage: (id) => api.get(`/users/${id}/usage`),
};

export default api;
