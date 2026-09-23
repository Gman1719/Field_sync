// src/config/api.js - Centralized API URL configuration
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_URL = API_BASE;

export default API_BASE;
