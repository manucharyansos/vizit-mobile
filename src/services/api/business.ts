import { businessAuthClient, tokenStore } from './client';
import { debugEmptyList, normalizeList, normalizeResource } from './normalize';
import { revokePushDevice, synchronizePushDevice } from '../notifications';

export type BusinessUser = { id: number; name: string; email?: string; role?: string; audience?: 'business'; business_id?: number; business_name?: string; business_slug?: string; needs_onboarding?: boolean };
export type CalendarBooking = { id: number; starts_at: string; ends_at: string; status: string; client_name?: string; client_phone?: string; customer_name?: string; service?: { id: number; name: string }; staff?: { id: number; name: string } };
export type BusinessClient = { id: number; name: string; phone?: string; email?: string; bookings_count?: number; last_booking_at?: string };
export type BusinessClientDetail = BusinessClient & { notes?: string | null; group_name?: string | null; birth_date?: string | null; is_vip?: boolean; is_blacklisted?: boolean; total_spent?: number; next_booking_at?: string | null; recent_bookings?: CalendarBooking[]; crm?: { completed_count?: number; cancelled_count?: number; no_show_count?: number; avg_ticket?: number; favorite_service_name?: string | null; favorite_staff_name?: string | null } };
export type BusinessService = { id: number; name: string; description?: string | null; duration_minutes: number; price: number; currency: string; is_active: boolean; booking_mode?: 'individual' | 'group'; capacity?: number; location_id?: number | null; location?: BusinessLocation | null };
export type BusinessStaff = { id: number; name: string; email: string; phone?: string; role: 'owner' | 'manager' | 'staff'; is_active: boolean; is_bookable?: boolean; show_in_public_team?: boolean; location_id?: number | null; location?: BusinessLocation | null };
export type ScheduleDay = { weekday: number; is_closed: boolean; start: string | null; end: string | null; break_start: string | null; break_end: string | null };
export type BusinessTask = { id: number; title: string; description?: string | null; status: 'open' | 'in_progress' | 'completed' | 'canceled'; priority: 'low' | 'medium' | 'high' | 'urgent'; due_at?: string | null; assignee?: { id: number; name: string } | null };
export type GiftCard = { id: number; code: string; initial_amount: number; balance: number; currency: string; status: string; issued_to_name?: string | null };
export type WaitlistEntry = { id: number; customer_name: string; customer_phone: string; desired_date: string; status: 'waiting' | 'offered' | 'booked' | 'cancelled' | 'expired'; service?: { name: string } | null };
export type BusinessLocation = { id: number; name?: string | null; address?: string | null; city?: string | null; district?: string | null; phone?: string | null; latitude?: number | null; longitude?: number | null; is_primary: boolean; is_active: boolean };
export type BusinessSettings = {
  id?: number;
  name?: string;
  slug?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  short_description?: string;
  description?: string;
  logo_url?: string | null;
  cover_url?: string | null;
  is_public_profile_enabled?: boolean;
  is_marketplace_visible?: boolean;
  timezone?: string;
  work_start?: string;
  work_end?: string;
  locations?: BusinessLocation[];
  location_limit?: number;
  [key: string]: unknown;
};
export type BusinessOnboardingStatus = { business_id?: number; business_name?: string; business_type?: string; is_onboarding_completed?: boolean; onboarding_step?: 'services' | 'schedule' | 'settings' | 'completed' };
export type LocalImageFile = { uri: string; name: string; mimeType: string };
export type BusinessRegistration = { business_name: string; business_phone: string; business_address: string; business_city?: string; business_district?: string; latitude: number; longitude: number; vertical: 'services' | 'healthcare'; business_category_id?: number; business_category_slug?: string; custom_category_name?: string; name: string; email: string; password: string; password_confirmation: string; plan_code?: string };

function assertBusinessAudience(data: { user?: { audience?: unknown } }) {
  if (data.user?.audience && data.user.audience !== 'business') throw new Error('Invalid business token audience');
}

function normalizeBusinessSettings(payload: unknown): BusinessSettings {
  const raw = normalizeResource<Record<string, unknown>>(payload);
  const text = (key: string): string | undefined => typeof raw[key] === 'string' ? raw[key] as string : undefined;
  return {
    ...raw,
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: text('name'),
    slug: text('slug'),
    phone: text('phone'),
    address: text('address'),
    city: text('city'),
    district: text('district'),
    short_description: text('short_description'),
    description: text('description'),
    timezone: text('timezone'),
    work_start: text('work_start'),
    work_end: text('work_end'),
    logo_url: typeof raw.logo_url === 'string' ? raw.logo_url : null,
    cover_url: typeof raw.cover_url === 'string' ? raw.cover_url : null,
    locations: normalizeList<BusinessLocation>(raw.locations, ['locations']),
    location_limit: typeof raw.location_limit === 'number' ? raw.location_limit : undefined,
  };
}

export const businessApi = {
  async login(email: string, password: string): Promise<BusinessUser> { const { data } = await businessAuthClient.post('/auth/login', { email, password }); assertBusinessAudience(data); await tokenStore.set('business', data.token); void synchronizePushDevice('business'); return data.user as BusinessUser; },
  async register(payload: BusinessRegistration): Promise<BusinessUser> { const { data } = await businessAuthClient.post('/auth/register', payload); assertBusinessAudience(data); await tokenStore.set('business', data.token); void synchronizePushDevice('business'); return data.user as BusinessUser; },
  async me(): Promise<BusinessUser> { const { data } = await businessAuthClient.get('/auth/me'); return normalizeResource<BusinessUser>(data, ['user']); },
  async dashboard(): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.get('/dashboard'); return normalizeResource<Record<string, unknown>>(data); },
  async calendar(from: string, to: string): Promise<CalendarBooking[]> { const response = await businessAuthClient.get('/calendar', { params: { from, to } }); const list = normalizeList<CalendarBooking>(response.data, ['bookings']); debugEmptyList('business.calendar', response, list); return list; },
  async clients(): Promise<BusinessClient[]> { const response = await businessAuthClient.get('/clients'); const list = normalizeList<BusinessClient>(response.data, ['clients']); debugEmptyList('business.clients', response, list); return list; },
  async createClient(payload: { name: string; phone?: string; email?: string }): Promise<BusinessClient> { const { data } = await businessAuthClient.post('/clients', payload); return normalizeResource<BusinessClient>(data, ['client']); },
  async client(id: number): Promise<BusinessClientDetail> { const { data } = await businessAuthClient.get(`/clients/${id}`); return normalizeResource<BusinessClientDetail>(data, ['client']); },
  async updateClient(id: number, payload: Partial<BusinessClientDetail>): Promise<BusinessClientDetail> { const { data } = await businessAuthClient.put(`/clients/${id}`, payload); return normalizeResource<BusinessClientDetail>(data, ['client']); },
  async services(): Promise<BusinessService[]> { const response = await businessAuthClient.get('/services'); const list = normalizeList<BusinessService>(response.data, ['services']); debugEmptyList('business.services', response, list); return list; },
  async staff(): Promise<BusinessStaff[]> { const response = await businessAuthClient.get('/staff', { params: { only_active: false } }); const list = normalizeList<BusinessStaff>(response.data, ['staff', 'users']); debugEmptyList('business.staff', response, list); return list; },
  async tasks(): Promise<BusinessTask[]> { const response = await businessAuthClient.get('/tasks'); const list = normalizeList<BusinessTask>(response.data, ['tasks']); debugEmptyList('business.tasks', response, list); return list; },
  async createTask(payload: { title: string; description?: string; priority?: BusinessTask['priority']; assignee_id?: number }): Promise<BusinessTask> { const { data } = await businessAuthClient.post('/tasks', payload); return normalizeResource<BusinessTask>(data, ['task']); },
  async updateTask(id: number, payload: Partial<BusinessTask>): Promise<BusinessTask> { const { data } = await businessAuthClient.patch(`/tasks/${id}`, payload); return normalizeResource<BusinessTask>(data, ['task']); },
  async deleteTask(id: number): Promise<void> { await businessAuthClient.delete(`/tasks/${id}`); },
  async analytics(): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.get('/analytics/overview'); return normalizeResource<Record<string, unknown>>(data); },
  async giftCards(): Promise<GiftCard[]> { const response = await businessAuthClient.get('/gift-cards'); const list = normalizeList<GiftCard>(response.data, ['gift_cards', 'giftCards']); debugEmptyList('business.giftCards', response, list); return list; },
  async createGiftCard(payload: { amount: number; issued_to_name?: string; issued_to_phone?: string }): Promise<GiftCard> { const { data } = await businessAuthClient.post('/gift-cards', { ...payload, currency: 'AMD' }); return normalizeResource<GiftCard>(data, ['gift_card']); },
  async loyalty(): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.get('/loyalty/summary'); return normalizeResource<Record<string, unknown>>(data); },
  async loyaltyProgram(): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.get('/loyalty/program'); return normalizeResource<Record<string, unknown>>(data); },
  async updateLoyaltyProgram(payload: Record<string, unknown>): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.put('/loyalty/program', payload); return normalizeResource<Record<string, unknown>>(data); },
  async waitlist(): Promise<WaitlistEntry[]> { const response = await businessAuthClient.get('/waitlist'); const list = normalizeList<WaitlistEntry>(response.data, ['waitlist']); debugEmptyList('business.waitlist', response, list); return list; },
  async updateWaitlist(id: number, status: 'waiting' | 'cancelled'): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.patch(`/waitlist/${id}`, { status }); return normalizeResource<Record<string, unknown>>(data); },
  async billing(): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.get('/billing/me'); return normalizeResource<Record<string, unknown>>(data); },
  async telegram(): Promise<{ available: boolean; connected: boolean; bot_url?: string | null }> { const { data } = await businessAuthClient.get('/telegram/connection'); return normalizeResource<{ available: boolean; connected: boolean; bot_url?: string | null }>(data); },
  async createTelegramLink(): Promise<{ url: string }> { const { data } = await businessAuthClient.post('/telegram/connection'); return normalizeResource<{ url: string }>(data); },
  async disconnectTelegram(): Promise<void> { await businessAuthClient.delete('/telegram/connection'); },
  async settings(): Promise<BusinessSettings> { const { data } = await businessAuthClient.get('/business/settings'); return normalizeBusinessSettings(data); },
  async updateSettings(payload: Record<string, unknown>): Promise<BusinessSettings> { const { data } = await businessAuthClient.patch('/business/settings', payload); return normalizeBusinessSettings(data); },
  async uploadImage(file: LocalImageFile, folder = 'businesses'): Promise<{ path: string; url: string }> { const form = new FormData(); form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob); form.append('folder', folder); const { data } = await businessAuthClient.post('/media/upload', form); return normalizeResource<{ path: string; url: string }>(data); },
  async createLocation(payload: Omit<BusinessLocation, 'id' | 'is_active'> & { is_active?: boolean }): Promise<BusinessLocation> { const { data } = await businessAuthClient.post('/business/locations', payload); return normalizeResource<BusinessLocation>(data, ['location']); },
  async updateLocation(id: number, payload: Partial<BusinessLocation>): Promise<BusinessLocation> { const { data } = await businessAuthClient.patch(`/business/locations/${id}`, payload); return normalizeResource<BusinessLocation>(data, ['location']); },
  async deleteLocation(id: number): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.delete(`/business/locations/${id}`); return normalizeResource<Record<string, unknown>>(data); },
  async onboardingStatus(): Promise<BusinessOnboardingStatus> { const { data } = await businessAuthClient.get('/business/onboarding-status'); return normalizeResource<BusinessOnboardingStatus>(data); },
  async schedule(): Promise<ScheduleDay[]> { const response = await businessAuthClient.get('/schedule', { params: { _t: Date.now() } }); const list = normalizeList<ScheduleDay>(response.data, ['days', 'schedule']); debugEmptyList('business.schedule', response, list); return list; },
  async updateSchedule(days: ScheduleDay[]): Promise<{ ok?: boolean }> { const { data } = await businessAuthClient.put('/schedule', { days }); return normalizeResource<{ ok?: boolean }>(data); },
  async createService(payload: { name: string; duration_minutes: number; price?: number; currency?: string; location_id?: number }): Promise<BusinessService> { const { data } = await businessAuthClient.post('/services', { ...payload, is_active: true }); return normalizeResource<BusinessService>(data, ['service']); },
  async updateService(id: number, payload: Partial<BusinessService>): Promise<BusinessService> { const { data } = await businessAuthClient.put(`/services/${id}`, payload); return normalizeResource<BusinessService>(data, ['service']); },
  async deleteService(id: number): Promise<void> { await businessAuthClient.delete(`/services/${id}`); },
  async createStaff(payload: { name: string; email: string; password: string; phone?: string; location_id?: number }): Promise<BusinessStaff> { const { data } = await businessAuthClient.post('/staff', { ...payload, role: 'staff', is_bookable: true, show_in_public_team: true }); return normalizeResource<BusinessStaff>(data, ['staff', 'user']); },
  async updateStaff(id: number, payload: Partial<BusinessStaff>): Promise<BusinessStaff> { const { data } = await businessAuthClient.patch(`/staff/${id}`, payload); return normalizeResource<BusinessStaff>(data, ['staff', 'user']); },
  async setStaffActive(id: number, active: boolean): Promise<unknown> { return (await businessAuthClient.patch(`/staff/${id}/${active ? 'activate' : 'deactivate'}`)).data; },
  async staffSchedule(id: number): Promise<{ days: ScheduleDay[] }> { const { data } = await businessAuthClient.get(`/staff/${id}/schedule`, { params: { _t: Date.now() } }); const root = normalizeResource<Record<string, unknown>>(data); return { ...root, days: normalizeList<ScheduleDay>(root.days ?? root, ['days']) }; },
  async updateStaffSchedule(id: number, days: ScheduleDay[]): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.put(`/staff/${id}/schedule`, { days }); return normalizeResource<Record<string, unknown>>(data); },
  async completeOnboarding(): Promise<Record<string, unknown>> { return (await businessAuthClient.post('/business/complete-onboarding')).data as Record<string, unknown>; },
  async createBooking(payload: { service_id: number; staff_id: number; location_id?: number; starts_at: string; client_name: string; client_phone: string; client_email?: string; client_id?: number; notes?: string }): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.post('/bookings', { ...payload, status: 'confirmed', source: 'admin' }); return normalizeResource<Record<string, unknown>>(data); },
  async updateStatus(id: number, status: 'confirm' | 'done' | 'no-show' | 'cancel'): Promise<Record<string, unknown>> { const { data } = await businessAuthClient.patch(`/bookings/${id}/${status}`); return normalizeResource<Record<string, unknown>>(data); },
  async requestAccountDeletion(reason?: string): Promise<unknown> { try { return (await businessAuthClient.post('/mobile/account-deletion-request', { reason })).data; } finally { await tokenStore.remove('business'); } },
  async logout(): Promise<void> { try { await revokePushDevice('business'); try { await businessAuthClient.post('/auth/logout'); } catch { /* Expired or already-revoked sessions are already logged out. */ } } finally { await tokenStore.remove('business'); } },
};
