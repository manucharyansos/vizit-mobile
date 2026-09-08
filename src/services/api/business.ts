import { businessAuthClient, tokenStore } from './client';
import { revokePushDevice, synchronizePushDevice } from '../notifications';

export type BusinessUser = { id: number; name: string; email: string; role?: string; needs_onboarding?: boolean };
export type CalendarBooking = { id: number; starts_at: string; ends_at: string; status: string; client_name?: string; client_phone?: string; customer_name?: string; service?: { id: number; name: string }; staff?: { id: number; name: string } };
export type BusinessClient = { id: number; name: string; phone?: string; email?: string; bookings_count?: number; last_booking_at?: string };
export type BusinessClientDetail = BusinessClient & { notes?: string | null; group_name?: string | null; birth_date?: string | null; is_vip?: boolean; is_blacklisted?: boolean; total_spent?: number; next_booking_at?: string | null; recent_bookings?: CalendarBooking[]; crm?: { completed_count?: number; cancelled_count?: number; no_show_count?: number; avg_ticket?: number; favorite_service_name?: string | null; favorite_staff_name?: string | null } };
export type BusinessService = { id: number; name: string; description?: string | null; duration_minutes: number; price: number; currency: string; is_active: boolean; booking_mode?: 'individual' | 'group'; capacity?: number };
export type BusinessStaff = { id: number; name: string; email: string; phone?: string; role: 'owner' | 'manager' | 'staff'; is_active: boolean; is_bookable?: boolean; show_in_public_team?: boolean };
export type ScheduleDay = { weekday: number; is_closed: boolean; start: string | null; end: string | null; break_start: string | null; break_end: string | null };
export type BusinessTask = { id: number; title: string; description?: string | null; status: 'open' | 'in_progress' | 'completed' | 'canceled'; priority: 'low' | 'medium' | 'high' | 'urgent'; due_at?: string | null; assignee?: { id: number; name: string } | null };
export type GiftCard = { id: number; code: string; initial_amount: number; balance: number; currency: string; status: string; issued_to_name?: string | null };
export type WaitlistEntry = { id: number; customer_name: string; customer_phone: string; desired_date: string; status: 'waiting' | 'offered' | 'booked' | 'cancelled' | 'expired'; service?: { name: string } | null };
export type BusinessLocation = { id: number; name?: string | null; address?: string | null; city?: string | null; district?: string | null; phone?: string | null; latitude?: number | null; longitude?: number | null; is_primary: boolean; is_active: boolean };
export type LocalImageFile = { uri: string; name: string; mimeType: string };
export type BusinessRegistration = { business_name: string; business_phone: string; business_address: string; latitude: number; longitude: number; vertical: 'services' | 'healthcare'; name: string; email: string; password: string; password_confirmation: string; plan_code?: string };

export const businessApi = {
  async login(email: string, password: string) { const { data } = await businessAuthClient.post('/auth/login', { email, password }); await tokenStore.set('business', data.token); void synchronizePushDevice('business'); return data.user as BusinessUser; },
  async register(payload: BusinessRegistration) { const { data } = await businessAuthClient.post('/auth/register', payload); await tokenStore.set('business', data.token); void synchronizePushDevice('business'); return data.user as BusinessUser; },
  async me() { const { data } = await businessAuthClient.get('/auth/me'); return (data.data ?? data) as BusinessUser; },
  async dashboard() { const { data } = await businessAuthClient.get('/dashboard'); return data.data ?? data; },
  async calendar(from: string, to: string): Promise<CalendarBooking[]> { const { data } = await businessAuthClient.get('/calendar', { params: { from, to } }); return data.data ?? []; },
  async clients(): Promise<BusinessClient[]> { const { data } = await businessAuthClient.get('/clients'); return data.data ?? data.clients ?? []; },
  async createClient(payload: { name: string; phone?: string; email?: string }) { const { data } = await businessAuthClient.post('/clients', payload); return (data.data ?? data) as BusinessClient; },
  async client(id: number): Promise<BusinessClientDetail> { const { data } = await businessAuthClient.get(`/clients/${id}`); return data.data ?? data; },
  async updateClient(id: number, payload: Partial<BusinessClientDetail>) { const { data } = await businessAuthClient.put(`/clients/${id}`, payload); return data.data ?? data; },
  async services(): Promise<BusinessService[]> { const { data } = await businessAuthClient.get('/services'); return data.data ?? data.services ?? []; },
  async staff(): Promise<BusinessStaff[]> { const { data } = await businessAuthClient.get('/staff', { params: { only_active: false } }); return data.data ?? []; },
  async tasks(): Promise<BusinessTask[]> { const { data } = await businessAuthClient.get('/tasks'); return data.data ?? []; },
  async createTask(payload: { title: string; description?: string; priority?: BusinessTask['priority']; assignee_id?: number }) { const { data } = await businessAuthClient.post('/tasks', payload); return data.data ?? data; },
  async updateTask(id: number, payload: Partial<BusinessTask>) { const { data } = await businessAuthClient.patch(`/tasks/${id}`, payload); return data.data ?? data; },
  async deleteTask(id: number) { await businessAuthClient.delete(`/tasks/${id}`); },
  async analytics() { const { data } = await businessAuthClient.get('/analytics/overview'); return data.data ?? data; },
  async giftCards(): Promise<GiftCard[]> { const { data } = await businessAuthClient.get('/gift-cards'); return data.data ?? []; },
  async createGiftCard(payload: { amount: number; issued_to_name?: string; issued_to_phone?: string }) { const { data } = await businessAuthClient.post('/gift-cards', { ...payload, currency: 'AMD' }); return data.data ?? data; },
  async loyalty() { const { data } = await businessAuthClient.get('/loyalty/summary'); return data.data ?? data; },
  async loyaltyProgram() { const { data } = await businessAuthClient.get('/loyalty/program'); return data.data ?? data; },
  async updateLoyaltyProgram(payload: Record<string, unknown>) { const { data } = await businessAuthClient.put('/loyalty/program', payload); return data.data ?? data; },
  async waitlist(): Promise<WaitlistEntry[]> { const { data } = await businessAuthClient.get('/waitlist'); return data.data ?? []; },
  async updateWaitlist(id: number, status: 'waiting' | 'cancelled') { const { data } = await businessAuthClient.patch(`/waitlist/${id}`, { status }); return data.data ?? data; },
  async billing() { const { data } = await businessAuthClient.get('/billing/me'); return data.data ?? data; },
  async telegram(): Promise<{ available: boolean; connected: boolean; bot_url?: string | null }> { const { data } = await businessAuthClient.get('/telegram/connection'); return data.data ?? data; },
  async createTelegramLink(): Promise<{ url: string }> { const { data } = await businessAuthClient.post('/telegram/connection'); return data.data ?? data; },
  async disconnectTelegram() { await businessAuthClient.delete('/telegram/connection'); },
  async settings() { const { data } = await businessAuthClient.get('/business/settings'); return data.data ?? data; },
  async updateSettings(payload: Record<string, unknown>) { const { data } = await businessAuthClient.patch('/business/settings', payload); return data.data ?? data; },
  async uploadImage(file: LocalImageFile, folder = 'businesses') { const form = new FormData(); form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob); form.append('folder', folder); const { data } = await businessAuthClient.post('/media/upload', form); return (data.data ?? data) as { path: string; url: string }; },
  async createLocation(payload: Omit<BusinessLocation, 'id' | 'is_active'> & { is_active?: boolean }) { const { data } = await businessAuthClient.post('/business/locations', payload); return data.data ?? data; },
  async updateLocation(id: number, payload: Partial<BusinessLocation>) { const { data } = await businessAuthClient.patch(`/business/locations/${id}`, payload); return data.data ?? data; },
  async deleteLocation(id: number) { const { data } = await businessAuthClient.delete(`/business/locations/${id}`); return data.data ?? data; },
  async onboardingStatus() { const { data } = await businessAuthClient.get('/business/onboarding-status'); return data.data ?? data; },
  async createService(payload: { name: string; duration_minutes: number; price?: number; currency?: string }) { const { data } = await businessAuthClient.post('/services', { ...payload, is_active: true }); return data.data ?? data; },
  async updateService(id: number, payload: Partial<BusinessService>) { const { data } = await businessAuthClient.put(`/services/${id}`, payload); return data.data ?? data; },
  async deleteService(id: number) { await businessAuthClient.delete(`/services/${id}`); },
  async createStaff(payload: { name: string; email: string; password: string; phone?: string }) { const { data } = await businessAuthClient.post('/staff', { ...payload, role: 'staff', is_bookable: true, show_in_public_team: true }); return data.data ?? data; },
  async updateStaff(id: number, payload: Partial<BusinessStaff>) { const { data } = await businessAuthClient.patch(`/staff/${id}`, payload); return data.data ?? data; },
  async setStaffActive(id: number, active: boolean) { return (await businessAuthClient.patch(`/staff/${id}/${active ? 'activate' : 'deactivate'}`)).data; },
  async staffSchedule(id: number): Promise<{ days: ScheduleDay[] }> { const { data } = await businessAuthClient.get(`/staff/${id}/schedule`, { params: { _t: Date.now() } }); const root = data.data ?? data; return { ...root, days: root.days ?? root ?? [] }; },
  async updateStaffSchedule(id: number, days: ScheduleDay[]) { const { data } = await businessAuthClient.put(`/staff/${id}/schedule`, { days }); return data.data ?? data; },
  async completeOnboarding() { return (await businessAuthClient.post('/business/complete-onboarding')).data; },
  async createBooking(payload: { service_id: number; staff_id: number; location_id?: number; starts_at: string; client_name: string; client_phone: string; client_email?: string; client_id?: number; notes?: string }) { const { data } = await businessAuthClient.post('/bookings', { ...payload, status: 'confirmed', source: 'admin' }); return data.data ?? data; },
  async updateStatus(id: number, status: 'confirm' | 'done' | 'no-show' | 'cancel') { const { data } = await businessAuthClient.patch(`/bookings/${id}/${status}`); return data.data ?? data; },
  async requestAccountDeletion(reason?: string) { try { return (await businessAuthClient.post('/mobile/account-deletion-request', { reason })).data; } finally { await tokenStore.remove('business'); } },
  async logout() { try { await revokePushDevice('business'); try { await businessAuthClient.post('/auth/logout'); } catch { /* Expired or already-revoked sessions are already logged out. */ } } finally { await tokenStore.remove('business'); } },
};
