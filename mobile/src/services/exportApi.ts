import { api } from './api';
import { getToken } from './storage';

export { getToken };

/**
 * Returns the full URL to the PDF export endpoint.
 * Used with Expo FileSystem.downloadAsync (which needs the full URL + auth header).
 */
export function pdfExportUrl(bikeId: string, componentIds?: string[]): string {
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  const params = componentIds?.length
    ? `?component_ids=${componentIds.join(',')}`
    : '';
  return `${base}/api/bikes/${bikeId}/export/pdf${params}`;
}
