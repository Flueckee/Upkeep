import { api } from './api';
import { MaintenanceComment } from '../types';

export const getComments = async (logId: string): Promise<MaintenanceComment[]> =>
  (await api.get(`/api/logs/${logId}/comments`)).data;

export const createComment = async (logId: string, text: string): Promise<MaintenanceComment> =>
  (await api.post(`/api/logs/${logId}/comments`, { text })).data;
