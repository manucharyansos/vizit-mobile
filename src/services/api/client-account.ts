import { clientAuthClient, tokenStore } from './client';
import { revokePushDevice, synchronizePushDevice } from '../notifications';

export type ClientUser = { id: number; name: string; email?: string; phone?: string; email_verified_at?: string | null; requires_email_verification?: boolean };
export type ClientBooking = { id: number; booking_code: string; starts_at: string; ends_at?: string; status: string; business?: { name: string; slug?: string }; service?: { name: string }; staff?: { name: string } };

export const clientAccountApi = {
  async login(identity: string, password: string) { const { data } = await clientAuthClient.post('/client/auth/login', { identity, password }); await tokenStore.set('client', data.token); void synchronizePushDevice('client'); return data.user as ClientUser; },
  async register(payload: { name: string; email?: string | null; phone?: string | null; password: string; password_confirmation: string }) { const { data } = await clientAuthClient.post('/client/auth/register', payload); await tokenStore.set('client', data.token); void synchronizePushDevice('client'); return data.user as ClientUser; },
  async forgotPassword(email: string) { return (await clientAuthClient.post('/client/auth/forgot-password', { email })).data; },
  async resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }) { return (await clientAuthClient.post('/client/auth/reset-password', payload)).data; },
  async me() { const { data } = await clientAuthClient.get('/client/auth/me'); return (data.user ?? data.data ?? data) as ClientUser; },
  async bookings(): Promise<ClientBooking[]> { const { data } = await clientAuthClient.get('/client/cabinet/bookings'); return data.data ?? data.bookings ?? []; },
  async resendVerification() { return (await clientAuthClient.post('/client/auth/email/verification-notification')).data; },
  async requestAccountDeletion(reason?: string) { try { return (await clientAuthClient.post('/mobile/account-deletion-request', { reason })).data; } finally { await tokenStore.remove('client'); } },
  async logout() { try { await revokePushDevice('client'); try { await clientAuthClient.post('/client/auth/logout'); } catch { /* Expired or already-revoked sessions are already logged out. */ } } finally { await tokenStore.remove('client'); } },
};
