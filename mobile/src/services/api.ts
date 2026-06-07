import axios from 'axios';
import { getToken, removeToken } from './storage';

// Set EXPO_PUBLIC_API_URL in your .env file, e.g. EXPO_PUBLIC_API_URL=http://192.168.1.x:8000
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Attach stored JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the stored token so the AuthContext can redirect to Login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
    }
    return Promise.reject(error);
  },
);
