import { clientAuthClient, tokenStore } from './client';
import { debugEmptyList, normalizeList, normalizeResource } from './normalize';
import { revokePushDevice, synchronizePushDevice } from '../notifications';
import { guestBookingStore } from '../guest-booking-store';

export type ClientUser = { id: number; name: string; email?: string; phone?: string; email_verified_at?: string | null; requires_email_verification?: boolean; audience?: 'client' };
export type ClientBooking = { id: number; starts_at: string; ends_at?: string; status: string; business?: { name: string; slug?: string }; service?: { name: string }; staff?: { name: string } };

type CabinetBooking = ClientBooking & { booking_code?: string };
type CabinetPayload = { upcoming?: CabinetBooking[]; past?: CabinetBooking[] };

function assertClientAudience(data: { user?: { audience?: unknown } }) {
  if (data.user?.audience && data.user.audience !== 'client') throw new Error('Invalid client token audience');
}

const stripInternalReference = ({ booking_code: _bookingCode, ...booking }: CabinetBooking): ClientBooking => booking;

export const clientAccountApi = {
  async login(identity: string, password: string): Promise<ClientUser> {
    const { data } = await clientAuthClient.post('/client/auth/login', { identity, password });
    assertClientAudience(data);
    await guestBookingStore.clearClientBookingReferences();
    await tokenStore.set('client', data.token);
    void synchronizePushDevice('client');
    return data.user as ClientUser;
  },
  async register(payload: { name: string; email?: string | null; phone?: string | null; password: string; password_confirmation: string }): Promise<ClientUser> {
    const { data } = await clientAuthClient.post('/client/auth/register', payload);
    assertClientAudience(data);
    await guestBookingStore.clearClientBookingReferences();
    await tokenStore.set('client', data.token);
    void synchronizePushDevice('client');
    return data.user as ClientUser;
  },
  async forgotPassword(email: string) { return (await clientAuthClient.post('/client/auth/forgot-password', { email })).data; },
  async resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }) { return (await clientAuthClient.post('/client/auth/reset-password', payload)).data; },
  async me(): Promise<ClientUser> {
    const token = await tokenStore.get('client');
    if (!token) throw new Error('No client session');
    const { data } = await clientAuthClient.get('/client/auth/me');
    const user = normalizeResource<ClientUser>(data, ['user']);
    if (user.audience && user.audience !== 'client') throw new Error('Invalid client token audience');
    return user;
  },
  async bookings(): Promise<ClientBooking[]> {
    const response = await clientAuthClient.get('/client/cabinet/bookings');
    const payload = normalizeResource<CabinetPayload>(response.data);
    const upcoming = normalizeList<CabinetBooking>(payload.upcoming, ['upcoming']);
    const past = normalizeList<CabinetBooking>(payload.past, ['past']);
    const raw = [...upcoming, ...past];
    await guestBookingStore.rememberClientBookingReferences(
      raw
        .filter((booking) => typeof booking.booking_code === 'string' && booking.booking_code.trim())
        .map((booking) => ({ bookingId: booking.id, code: booking.booking_code! })),
    );
    const list = raw.map(stripInternalReference);
    debugEmptyList('client.cabinet.bookings', response, list);
    return list;
  },
  async resendVerification() { return (await clientAuthClient.post('/client/auth/email/verification-notification')).data; },
  async requestAccountDeletion(reason?: string) {
    try {
      return (await clientAuthClient.post('/mobile/account-deletion-request', { reason })).data;
    } finally {
      await guestBookingStore.clearClientBookingReferences();
      await tokenStore.remove('client');
    }
  },
  async logout(): Promise<void> {
    try {
      await revokePushDevice('client');
      try { await clientAuthClient.post('/client/auth/logout'); } catch { /* Expired or already-revoked sessions are already logged out. */ }
    } finally {
      await guestBookingStore.clearClientBookingReferences();
      await tokenStore.remove('client');
    }
  },
};
