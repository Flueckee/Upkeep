import { Platform } from 'react-native';
import { api } from './api';
import { MaintenancePhoto } from '../types';

export const getPhotos = async (logId: string): Promise<MaintenancePhoto[]> =>
  (await api.get(`/api/logs/${logId}/photos`)).data;

export const uploadPhoto = async (
  logId: string,
  uri: string,
  mimeType: string,
  caption?: string,
): Promise<MaintenancePhoto> => {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // On web: convert the data-URI / blob-URI to a real Blob so the browser
    // can set Content-Type multipart/form-data with the correct boundary.
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, 'photo.jpg');
    if (caption) form.append('caption', caption);
    // Clear Content-Type so the browser sets multipart/form-data with the correct boundary
    return (await api.post(`/api/logs/${logId}/photos`, form, {
      headers: { 'Content-Type': undefined },
    })).data;
  } else {
    // React Native: use the { uri, type, name } shorthand understood by RN's XHR.
    form.append('file', { uri, type: mimeType, name: 'photo.jpg' } as any);
    if (caption) form.append('caption', caption);
    return (
      await api.post(`/api/logs/${logId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  }
};
