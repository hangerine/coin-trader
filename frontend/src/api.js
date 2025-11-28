import axios from 'axios';

// Auto-detect API URL based on current host
const getApiBaseUrl = () => {
    // If environment variable is set, use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL + '/api';
    }
    
    // Auto-detect: if running on iptime.org, use same host with port 8000
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname.includes('iptime.org') || hostname.includes('localhost') === false) {
        // Use same hostname but port 8000 for backend
        return `${protocol}//${hostname}:8000/api`;
    }
    
    // Default: localhost
    return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

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
