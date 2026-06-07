import { api } from './api';
import { TokenResponse, User } from '../types';

export const register = async (data: {
  name: string;
  email: string;
  password: string;
}): Promise<TokenResponse> => (await api.post('/api/auth/register', data)).data;

export const login = async (data: {
  email: string;
  password: string;
}): Promise<TokenResponse> => (await api.post('/api/auth/login', data)).data;

export const getMe = async (): Promise<User> => (await api.get('/api/auth/me')).data;
