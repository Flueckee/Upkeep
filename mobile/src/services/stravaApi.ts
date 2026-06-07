import * as WebBrowser from 'expo-web-browser';
import { api } from './api';
import { StravaStatus, StravaGearItem } from '../types';

const DEEP_LINK = 'upkeep://strava-connected';

export const getStravaStatus = async (): Promise<StravaStatus> =>
  (await api.get('/api/integrations/strava/status')).data;

export const getStravaGear = async (): Promise<StravaGearItem[]> =>
  (await api.get('/api/integrations/strava/gear')).data;

export interface MappingItem {
  gear_id: string;
  bike_id?: string | null;
  ignore?: boolean;
}

export const saveStravaMappings = async (
  mappings: MappingItem[],
  default_bike_id: string | null,
): Promise<StravaStatus> =>
  (await api.put('/api/integrations/strava/mappings', { mappings, default_bike_id })).data;

export const disconnectStrava = async (): Promise<void> => {
  await api.delete('/api/integrations/strava');
};

/**
 * Launch the Strava OAuth flow. Fetches the authorize URL from the backend,
 * opens it in an in-app browser, and resolves once the backend redirects back
 * to the app's deep link. Returns true if the flow completed (not dismissed).
 */
export const connectStrava = async (): Promise<boolean> => {
  const { authorize_url } = (await api.get('/api/integrations/strava/authorize-url')).data as {
    authorize_url: string;
  };
  const result = await WebBrowser.openAuthSessionAsync(authorize_url, DEEP_LINK);
  return result.type === 'success';
};
