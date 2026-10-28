import { businessAuthClient, publicClient } from './client';
import { absoluteMediaUrl, type LocalImageFile, type ScheduleDay } from './business';
import { normalizeList, normalizeResource } from './normalize';
import type { RentalBooking, RentalMedia, RentalRates, RentalSettings, RentalSlot, RentalSummary } from '../rentals';

export type RentalCreate = { starts_at: string; duration_minutes: number; client_name: string; client_phone: string; client_email?: string; notes?: string | null };
export const rentalApi = {
  async manualSlots(date: string, duration: number): Promise<RentalSlot[]> {
    return normalizeList<RentalSlot>((await businessAuthClient.get('/rental/availability', { params: { date, duration_minutes: duration } })).data);
  },
  async slots(slug: string, date: string, duration: number): Promise<RentalSlot[]> {
    const { data } = await publicClient.get(`/public/businesses/${encodeURIComponent(slug)}/rental-availability`, { params: { date, duration_minutes: duration, _t: Date.now() } });
    return normalizeList<RentalSlot>(data);
  },
  async publicCreate(slug: string, payload: RentalCreate & { legal_accepted: boolean; terms_version: string; privacy_version: string }) {
    return (await publicClient.post(`/public/businesses/${encodeURIComponent(slug)}/bookings`, { ...payload, source: 'mobile' })).data;
  },
  async settings(): Promise<RentalSettings> {
    const raw = normalizeResource<RentalSettings>((await businessAuthClient.get('/rental/settings')).data);
    return { ...raw, gallery: (raw.gallery ?? []).map((item) => ({ ...item, url: absoluteMediaUrl(item.url) ?? item.url })) };
  },
  async saveSettings(payload: RentalRates): Promise<RentalSettings> { return normalizeResource<RentalSettings>((await businessAuthClient.put('/rental/settings', payload)).data); },
  async bookings(from: string, to: string): Promise<RentalBooking[]> { return normalizeList<RentalBooking>((await businessAuthClient.get('/rental/bookings', { params: { from, to } })).data); },
  async summary(from: string, to: string): Promise<RentalSummary> { return normalizeResource<RentalSummary>((await businessAuthClient.get('/rental/summary', { params: { from, to } })).data); },
  async create(payload: RentalCreate): Promise<RentalBooking> { return normalizeResource<RentalBooking>((await businessAuthClient.post('/rental/bookings', payload)).data); },
  async update(id: number, payload: { status?: string; starts_at?: string; notes?: string | null }) { return normalizeResource<RentalBooking>((await businessAuthClient.patch(`/rental/bookings/${id}`, payload)).data); },
  async schedule(): Promise<ScheduleDay[]> { return normalizeList<ScheduleDay>((await businessAuthClient.get('/rental/schedule')).data, ['days', 'schedule']); },
  async saveSchedule(days: ScheduleDay[]) { return (await businessAuthClient.put('/rental/schedule', { days })).data; },
  async upload(file: LocalImageFile): Promise<RentalMedia> {
    const form = new FormData(); form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const item = normalizeResource<RentalMedia>((await businessAuthClient.post('/rental/gallery', form)).data);
    return { ...item, url: absoluteMediaUrl(item.url) ?? item.url };
  },
  async removeMedia(id: number) { await businessAuthClient.delete(`/rental/gallery/${id}`); },
};
