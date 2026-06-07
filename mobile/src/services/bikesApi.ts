import { Platform } from 'react-native';
import { api } from './api';
import { Bike, ComponentDue } from '../types';

/** Convert a server-relative path (e.g. /media/originals/x.jpg) to a full URL. */
export function mediaUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}${path}`;
}

export const getBikes = async (): Promise<Bike[]> =>
  (await api.get('/api/bikes')).data;

export const getBike = async (bikeId: string): Promise<Bike> =>
  (await api.get(`/api/bikes/${bikeId}`)).data;

export const createBike = async (data: {
  name: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  total_km?: number;
}): Promise<Bike> => (await api.post('/api/bikes', data)).data;

export const updateBike = async (bikeId: string, data: Partial<{
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
}>): Promise<Bike> => (await api.put(`/api/bikes/${bikeId}`, data)).data;

export const deleteBike = async (bikeId: string): Promise<void> =>
  api.delete(`/api/bikes/${bikeId}`);

export const updateOdometer = async (bikeId: string, total_km: number): Promise<Bike> =>
  (await api.patch(`/api/bikes/${bikeId}/odometer`, { total_km })).data;

export const getDueComponents = async (bikeId: string): Promise<ComponentDue[]> =>
  (await api.get(`/api/bikes/${bikeId}/due`)).data;

export const uploadBikePhoto = async (
  bikeId: string,
  uri: string,
  mimeType: string,
): Promise<Bike> => {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // On web: fetch the data-URI / blob-URI → real Blob, then let the browser
    // set Content-Type automatically (it will include the required boundary).
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, 'bike.jpg');
    // Clear Content-Type so the browser sets multipart/form-data with the correct boundary
    return (await api.post(`/api/bikes/${bikeId}/photo`, form, {
      headers: { 'Content-Type': undefined },
    })).data;
  } else {
    // React Native: the { uri, type, name } shorthand is handled by RN's XHR.
    // We still set the header because axios doesn't auto-detect multipart on native.
    form.append('file', { uri, type: mimeType, name: 'bike.jpg' } as any);
    return (
      await api.post(`/api/bikes/${bikeId}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  }
};
