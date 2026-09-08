import { businessAuthClient } from './client';
import { debugEmptyList, normalizeList, normalizeResource } from './normalize';

export type CalendarBlock = {
  id: number;
  business_id: number;
  staff_id: number | null;
  reason: string | null;
  starts_at: string;
  ends_at: string;
};

export const calendarBlocksApi = {
  async list(from: string, to: string): Promise<CalendarBlock[]> {
    const response = await businessAuthClient.get('/calendar/blocks', { params: { from, to, _t: Date.now() } });
    const list = normalizeList<CalendarBlock>(response.data, ['blocks']);
    debugEmptyList('calendar.blocks', response, list);
    return list;
  },
  async create(payload: { starts_at: string; ends_at: string; reason?: string; staff_id?: number }): Promise<CalendarBlock> {
    const { data } = await businessAuthClient.post('/calendar/blocks', payload);
    return normalizeResource<CalendarBlock>(data, ['block']);
  },
  async remove(id: number): Promise<void> {
    await businessAuthClient.delete(`/calendar/blocks/${id}`);
  },
};
