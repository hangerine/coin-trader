import axios from 'axios';

// Auto-detect API URL based on current host
const getApiBaseUrl = () => {
    // If environment variable is set, use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL + '/api';
    }
    
    // Auto-detect: if running on iptime.org, calculate backend port
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const currentPort = window.location.port;
    
    if (hostname.includes('iptime.org') || hostname.includes('localhost') === false) {
        // If frontend is on port 8089, backend is likely on 8088
        // If frontend is on port 5173, backend is likely on 8000
        let backendPort = '8000';
        if (currentPort === '8089') {
            backendPort = '8088';
        } else if (currentPort === '5173' || currentPort === '3000') {
            backendPort = '8000';
        }
        return `${protocol}//${hostname}:${backendPort}/api`;
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
    getCoins: () => axios.get(`${API_BASE_URL}/coins`),
};
