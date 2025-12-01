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

// Create axios instance
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor to add token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/'; // Simple redirect to login
        }
        return Promise.reject(error);
    }
);

export const api = {
    // Auth
    login: (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        return axiosInstance.post('/auth/token', formData);
    },
    signup: (email, password, phone) => axiosInstance.post('/auth/signup', { email, password, phone_number: phone }),
    changePassword: (oldPassword, newPassword) => axiosInstance.put('/auth/password', { old_password: oldPassword, new_password: newPassword }),
    deleteUser: (password) => axiosInstance.delete('/auth/user', { data: { password } }),
    getMe: () => axiosInstance.get('/auth/me'),
    updatePhone: (phone) => axiosInstance.put('/auth/phone', { phone_number: phone }),
    recoverId: (phone) => axiosInstance.post('/auth/recover/id', { phone_number: phone }),
    recoverPassword: (email, phone, newPassword) => axiosInstance.post('/auth/recover/password', { email, phone_number: phone, new_password: newPassword }),

    // Market Data
    getMarketCurrent: () => axiosInstance.get(`/market/current`),
    getMarketHistory: () => axiosInstance.get(`/market/history`),
    getTrades: () => axiosInstance.get(`/trades`),
    getPrices: () => axiosInstance.get(`/prices`),
    getCoins: () => axiosInstance.get(`/coins`),

    // Protected
    getKeys: () => axiosInstance.get(`/keys`),
    addKey: (data) => axiosInstance.post(`/keys`, data),
    deleteKey: (id) => axiosInstance.delete(`/keys/${id}`),
    trade: (data) => axiosInstance.post(`/trade`, data),
    getBalance: (keyId) => axiosInstance.get(`/balance/${keyId}`),
};
