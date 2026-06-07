import { Platform } from 'react-native';
import { api } from './api';
import { User } from '../types';

export const updateMe = async (data: {
  name?: string;
  primary_color?: string;
}): Promise<User> => (await api.patch('/api/users/me', data)).data;

export const changePassword = async (data: {
  current_password: string;
  new_password: string;
}): Promise<void> => {
  await api.post('/api/users/me/change-password', data);
};

export const uploadAvatar = async (uri: string, mimeType: string): Promise<User> => {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // On web: fetch the URI → real Blob, let the browser set Content-Type with boundary
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, 'avatar.jpg');
    return (
      await api.post('/api/users/me/avatar', form, {
        headers: { 'Content-Type': undefined },
      })
    ).data;
  } else {
    // React Native: { uri, type, name } shorthand handled by RN's XHR
    form.append('file', { uri, type: mimeType, name: 'avatar.jpg' } as any);
    return (
      await api.post('/api/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  }
};
