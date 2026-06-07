import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@upkeep/token';

export const getToken = (): Promise<string | null> => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): Promise<void> => AsyncStorage.setItem(TOKEN_KEY, token);
export const removeToken = (): Promise<void> => AsyncStorage.removeItem(TOKEN_KEY);
