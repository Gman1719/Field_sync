const rawUrl: string | undefined = import.meta.env.VITE_API_URL;
export const API_URL: string = rawUrl ? rawUrl.replace(/\/+$/, '') : 'http://localhost:5000/api';

export const API_BASE: string = API_URL;

export default API_BASE;
