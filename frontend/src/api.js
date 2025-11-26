import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export const api = {
    getMarketCurrent: () => axios.get(`${API_BASE_URL}/market/current`),
    getMarketHistory: () => axios.get(`${API_BASE_URL}/market/history`),
    getTrades: () => axios.get(`${API_BASE_URL}/trades`),
    getKeys: () => axios.get(`${API_BASE_URL}/keys`),
    addKey: (data) => axios.post(`${API_BASE_URL}/keys`, data),
    deleteKey: (id) => axios.delete(`${API_BASE_URL}/keys/${id}`),
    trade: (data) => axios.post(`${API_BASE_URL}/trade`, data),
    getBalance: (keyId) => axios.get(`${API_BASE_URL}/balance/${keyId}`),
    getPrices: () => axios.get(`${API_BASE_URL}/prices`),
};
