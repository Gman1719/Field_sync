const rawUrl: string | undefined = import.meta.env.VITE_API_URL;
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const defaultUrl = isHttps ? '/api' : 'http://localhost:5000/api';

export const API_URL: string = rawUrl ? rawUrl.replace(/\/+$/, '') : defaultUrl;
export const API_BASE: string = API_URL;

export default API_BASE;
