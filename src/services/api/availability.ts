import { businessAuthClient } from './client';
import { debugEmptyList, normalizeList } from './normalize';

export type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
  staff_id: number;
  staff_name?: string;
  is_recommended?: boolean;
};

export const availabilityApi = {
  async slots(params: { date: string; service_id: number; staff_id?: number; location_id?: number }): Promise<AvailabilitySlot[]> {
    const response = await businessAuthClient.get('/availability', { params: { ...params, _t: Date.now() } });
    const list = normalizeList<AvailabilitySlot>(response.data, ['slots', 'availability']);
    debugEmptyList('business.availability', response, list);
    return list;
  },
};
