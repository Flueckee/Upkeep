import { api } from './api';
import { ServiceInterval } from '../types';

export const createInterval = async (componentId: string, data: {
  interval_type: string;
  interval_days?: number;
  interval_km?: number;
  reminder_days_before?: number;
}): Promise<ServiceInterval> =>
  (await api.post(`/api/components/${componentId}/interval`, data)).data;

export const updateInterval = async (intervalId: string, data: Partial<{
  interval_type: string;
  interval_days: number;
  interval_km: number;
  reminder_days_before: number;
}>): Promise<ServiceInterval> =>
  (await api.put(`/api/intervals/${intervalId}`, data)).data;

export const deleteInterval = async (intervalId: string): Promise<void> =>
  api.delete(`/api/intervals/${intervalId}`);
