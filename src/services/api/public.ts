import { publicClient } from './client';
import { debugEmptyList, normalizeList, normalizeResource } from './normalize';

export type Location = { id: number; name: string; address?: string | null; lat?: number; lng?: number };
export type PublicBusiness = { business_id: number; name: string; slug: string; category_name?: string | null; address?: string | null; phone?: string | null; description?: string | null; short_description?: string | null; cover_url?: string | null; logo_url?: string | null; locations: Location[] };
export type Service = { id: number; name: string; description?: string | null; duration_minutes: number; price: number; currency: string; image_url?: string | null; location_id?: number | null };
export type Staff = { id: number; name: string; role?: string; avatar_url?: string | null; bio?: string | null; location_id?: number | null };
export type Slot = { starts_at: string; ends_at: string; staff_id: number; staff_name: string; is_recommended?: boolean };

const mediaUrl = (value?: string | null) => value?.startsWith('/') ? `https://api.vizit.am${value}` : value ?? null;

function normalizeBusiness(v: Record<string, unknown>): PublicBusiness {
  const rawLocations = normalizeList<Record<string, unknown>>(v.locations, ['locations']);
  return {
    business_id: Number(v.business_id ?? v.id),
    name: String(v.name ?? ''),
    slug: String(v.slug ?? ''),
    category_name: v.category_name == null ? null : String(v.category_name),
    address: v.address == null ? null : String(v.address),
    phone: v.phone == null ? null : String(v.phone),
    description: v.description == null ? null : String(v.description),
    short_description: v.short_description == null ? null : String(v.short_description),
    cover_url: mediaUrl(v.cover_url as string | null),
    logo_url: mediaUrl(v.logo_url as string | null),
    locations: rawLocations.map((location) => ({
      id: Number(location.id),
      name: String(location.name ?? ''),
      address: location.address == null ? null : String(location.address),
      lat: location.lat == null ? (location.latitude == null ? undefined : Number(location.latitude)) : Number(location.lat),
      lng: location.lng == null ? (location.longitude == null ? undefined : Number(location.longitude)) : Number(location.lng),
    })),
  };
}

function normalizeBusinesses(payload: unknown): PublicBusiness[] {
  return normalizeList<Record<string, unknown>>(payload, ['businesses'])
    .map(normalizeBusiness)
    .filter((business) => business.slug && business.name);
}

export const publicApi = {
  async businesses(params?: { locale?: string; search?: string }) {
    for (const path of ['/v1/public/businesses', '/public/businesses']) {
      try {
        const response = await publicClient.get(path, { params: { ...params, _t: Date.now() } });
        const list = normalizeBusinesses(response.data);
        debugEmptyList('public.businesses', response, list);
        return list;
      } catch (error) {
        if (path.startsWith('/public')) throw error;
      }
    }
    return [];
  },
  business: async (slug: string) => normalizeBusiness(normalizeResource<Record<string, unknown>>((await publicClient.get(`/v1/public/businesses/${slug}`)).data, ['business'])),
  services: async (slug: string, locationId?: number): Promise<Service[]> => {
    const response = await publicClient.get(`/public/businesses/${slug}/services`, { params: { location_id: locationId } });
    const list = normalizeList<Service>(response.data, ['services']).map((item) => ({ ...item, image_url: mediaUrl(item.image_url) }));
    debugEmptyList('public.services', response, list);
    return list;
  },
  staff: async (slug: string, locationId?: number): Promise<Staff[]> => {
    const response = await publicClient.get(`/public/businesses/${slug}/staff`, { params: { location_id: locationId, bookable_only: true } });
    const list = normalizeList<Staff>(response.data, ['staff', 'users']).map((item) => ({ ...item, avatar_url: mediaUrl(item.avatar_url) }));
    debugEmptyList('public.staff', response, list);
    return list;
  },
  availability: async (slug: string, params: { date: string; service_id: number; staff_id?: number; location_id?: number }): Promise<Slot[]> => {
    const response = await publicClient.get(`/public/businesses/${slug}/availability`, { params: { ...params, _t: Date.now() } });
    const list = normalizeList<Slot>(response.data, ['slots', 'availability']);
    debugEmptyList('public.availability', response, list);
    return list;
  },
  createBooking: async (slug: string, payload: Record<string, unknown>) => (await publicClient.post(`/public/businesses/${slug}/bookings`, payload)).data,
  verifyBooking: async (bookingCode: string, otp: string) => (await publicClient.post(`/public/bookings/${bookingCode}/verify`, { otp })).data,
  resendBookingOtp: async (bookingCode: string) => (await publicClient.post(`/public/bookings/${bookingCode}/resend`)).data,
  booking: async (bookingCode: string, guestToken: string) => (await publicClient.get(`/public/bookings/${bookingCode}`, { headers: { 'X-Guest-Token': guestToken } })).data,
  telegramLink: async (bookingCode: string, guestToken: string): Promise<{ url: string }> => normalizeResource<{ url: string }>((await publicClient.post(`/public/bookings/${bookingCode}/telegram-link`, {}, { headers: { 'X-Guest-Token': guestToken } })).data),
  cancelBooking: async (bookingCode: string, guestToken: string) => (await publicClient.post(`/public/bookings/${bookingCode}/cancel`, {}, { headers: { 'X-Guest-Token': guestToken } })).data,
  rescheduleOptions: async (bookingCode: string, guestToken: string, params: { booking_id: number; date: string; staff_id?: number }) => (await publicClient.get(`/public/bookings/${bookingCode}/reschedule-options`, { params, headers: { 'X-Guest-Token': guestToken } })).data,
  rescheduleBooking: async (bookingCode: string, guestToken: string, payload: { booking_id: number; staff_id: number; starts_at: string }) => (await publicClient.post(`/public/bookings/${bookingCode}/reschedule`, payload, { headers: { 'X-Guest-Token': guestToken } })).data,
  createDepositSession: async (bookingCode: string, guestToken: string, payload: { return_url: string; cancel_url: string }) => (await publicClient.post(`/public/bookings/${bookingCode}/payments/idbank/session`, payload, { headers: { 'X-Guest-Token': guestToken } })).data,
  paymentCapabilities: async (bookingCode: string, guestToken: string) => (await publicClient.get(`/public/bookings/${bookingCode}/payments/capabilities`, { headers: { 'X-Guest-Token': guestToken } })).data,
  paymentStatus: async (bookingCode: string, paymentId: string, guestToken: string) => (await publicClient.get(`/public/bookings/${bookingCode}/payments/${paymentId}/status`, { headers: { 'X-Guest-Token': guestToken } })).data,
};
