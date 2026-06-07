import { api } from './api';
import { Component } from '../types';

export const getComponents = async (bikeId: string): Promise<Component[]> =>
  (await api.get(`/api/bikes/${bikeId}/components`)).data;

export const createComponent = async (bikeId: string, data: {
  name: string;
  category: string;
  installed_at?: string;
  installed_km?: number;
  notes?: string;
}): Promise<Component> => (await api.post(`/api/bikes/${bikeId}/components`, data)).data;

export const updateComponent = async (componentId: string, data: Partial<{
  name: string;
  category: string;
  installed_at: string;
  installed_km: number;
  notes: string;
  purchase_url: string;
}>): Promise<Component> => (await api.put(`/api/components/${componentId}`, data)).data;

export const deleteComponent = async (componentId: string): Promise<void> =>
  api.delete(`/api/components/${componentId}`);
