import { api } from './api';
import { MaintenanceLog } from '../types';

export const getLogs = async (componentId: string): Promise<MaintenanceLog[]> =>
  (await api.get(`/api/components/${componentId}/logs`)).data;

export const getLog = async (logId: string): Promise<MaintenanceLog> =>
  (await api.get(`/api/logs/${logId}`)).data;

export const createLog = async (componentId: string, data: {
  performed_at: string;
  odometer_km: number;
  description: string;
  cost?: number;
}): Promise<MaintenanceLog> =>
  (await api.post(`/api/components/${componentId}/logs`, data)).data;

// No deleteLog — maintenance log entries are immutable by design.
