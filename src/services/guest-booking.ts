import { normalizeResource } from './api/normalize';
import type { GuestBookingSummary } from './guest-booking-store';

export type GuestAppointment = {
  id: number;
  starts_at: string;
  ends_at?: string;
  status: string;
  staff_id?: number;
  staff?: { id: number; name: string };
  service?: { name: string };
  items?: { service?: { name: string } }[];
  can_reschedule: boolean;
};
export type GuestBooking = {
  business?: { name: string; slug?: string; address?: string; phone?: string; business_type?: string; timezone?: string };
  business_type?: string;
  client_name?: string;
  telegram_connected: boolean;
  telegram_available?: boolean;
  status: string;
  can_cancel: boolean;
  total_price?: number | null;
  currency?: string;
  bookings: GuestAppointment[];
};

/** Allowlist display data. References, hashes and guest tokens never enter UI models. */
export function normalizeGuestBooking(payload: unknown): GuestBooking {
  const root = normalizeResource<Record<string, any>>(payload) ?? {};
  const rows = Array.isArray(root.bookings) ? root.bookings : [root.primary_booking ?? root.booking ?? root];
  return {
    business: root.business ? { name: root.business.name, slug: root.business.slug, address: root.business.address, phone: root.business.phone, business_type: root.business.business_type, timezone: root.business.timezone } : undefined,
    business_type: root.business?.business_type ?? (payload as { meta?: { business_type?: string } })?.meta?.business_type,
    client_name: root.client_name,
    telegram_connected: root.telegram_connected === true,
    telegram_available: root.telegram_available === true,
    status: String(root.status ?? ''),
    can_cancel: root.can_cancel === true,
    total_price: root.total_price == null ? null : Number(root.total_price),
    currency: root.currency,
    bookings: rows.filter((row) => row && Number(row.id) > 0).map((row) => ({
      id: Number(row.id), starts_at: String(row.starts_at ?? ''), ends_at: row.ends_at,
      status: String(row.status ?? root.status ?? ''), staff_id: row.staff_id,
      staff: row.staff ? { id: Number(row.staff.id), name: String(row.staff.name ?? '') } : undefined,
      service: row.service ? { name: String(row.service.name ?? '') } : undefined,
      items: Array.isArray(row.items) ? row.items.map((item: { service?: { name: string } }) => ({ service: item.service ? { name: item.service.name } : undefined })) : undefined,
      can_reschedule: row.can_reschedule === true,
    })),
  };
}

export function guestSummary(booking: GuestBooking): GuestBookingSummary {
  const first = booking.bookings[0];
  return { bookingIds: booking.bookings.map((row) => row.id), businessName: booking.business?.name, businessSlug: booking.business?.slug, serviceName: booking.bookings.map((row) => row.service?.name ?? row.items?.map((item) => item.service?.name).filter(Boolean).join(', ')).filter(Boolean).join(' · ') || (booking.business_type === 'rentals' ? booking.business?.name : undefined), staffName: first?.staff?.name, startsAt: first?.starts_at, endsAt: first?.ends_at, status: booking.status };
}
