import type { Locale } from '@/i18n/translations';

export type RentalUnit = 'minutes' | 'hours' | 'days';
export type RentalDiscount = { min_minutes: number; percent: number };
export type RentalRates = { hourly_price: number | null; min_minutes: number; max_minutes: number; buffer_minutes: number; slot_step_minutes: number; allow_overnight?: boolean; currency?: string; duration_discounts?: RentalDiscount[] };
export type RentalMedia = { id: number; url: string; kind: 'image' | 'video'; caption?: string | null; sort_order: number };
export type RentalSlot = { starts_at: string; ends_at: string; price: number; gross_price?: number; discount_percent?: number; currency: string };
export type RentalSettings = RentalRates & { timezone: string; gallery: RentalMedia[] };
export type RentalBooking = { id: number; starts_at: string; ends_at: string; client_name: string; client_phone: string; client_email?: string | null; notes?: string | null; status: string; final_price: number; paid_amount: number; outstanding_amount: number; currency: string; is_expired?: boolean };
export type RentalSummary = { bookings_count: number; pending_count: number; booked_amount: number; completed_amount: number; net_received: number; refunded_amount: number; outstanding_amount: number; refund_due: number; occupancy_percent: number; currency: string };
export const rentalUnitFactors: Record<RentalUnit, number> = { minutes: 1, hours: 60, days: 1440 };
export const isRentalBusiness = (value?: { business_type?: string | null; vertical?: string | null } | null) => value?.business_type === 'rentals' || value?.vertical === 'rentals';

export function rentalDuration(value: string, unit: RentalUnit): number {
  const raw = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return 0;
  const minutes = Number(raw) * rentalUnitFactors[unit];
  const rounded = Math.round(minutes);
  return Number.isSafeInteger(rounded) && Math.abs(minutes - rounded) < 0.000001 ? rounded : 0;
}

export function validRentalDuration(minutes: number, rates: Pick<RentalRates, 'min_minutes' | 'max_minutes' | 'slot_step_minutes'>): boolean {
  return Number.isInteger(minutes) && rates.slot_step_minutes > 0 && minutes >= rates.min_minutes && minutes <= rates.max_minutes && minutes % rates.slot_step_minutes === 0;
}

export function rentalDateKey(timezone = 'Asia/Yerevan', date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function rentalStamp(date: Date, locale: Locale, timezone: string): string {
  // Some devices lack Armenian ICU data and silently fall back to US dates.
  // Read numeric parts in a stable locale, then use an unambiguous local order.
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value;
  const separator = locale === 'en' ? '/' : '.';
  return `${read('day')}${separator}${read('month')}${separator}${read('year')}, ${read('hour')}:${read('minute')}`;
}

/** Availability uses business-local wall times. Preserve them for POST; never shift them through the phone's zone. */
export function rentalLocalStamp(value: string, locale: Locale): string {
  const local = value.replace('T', ' ').slice(0, 16);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(local)) return value;
  return rentalStamp(new Date(local.replace(' ', 'T') + ':00Z'), locale, 'UTC');
}

export function rentalZonedStamp(value: string, locale: Locale, timezone = 'Asia/Yerevan'): string {
  return rentalStamp(new Date(value), locale, timezone);
}

export function validRentalScheduleDay(day: { is_closed: boolean; start: string | null; end: string | null; break_start?: string | null; break_end?: string | null }): boolean {
  if (day.is_closed) return true;
  const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!day.start || !day.end || !pattern.test(day.start) || !pattern.test(day.end)) return false;
  if (!day.break_start && !day.break_end) return true;
  if (!day.break_start || !day.break_end || !pattern.test(day.break_start) || !pattern.test(day.break_end)) return false;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = minutes(day.start);
  const end = minutes(day.end) + (day.end <= day.start ? 1440 : 0);
  const breakStart = minutes(day.break_start) + (day.break_start < day.start ? 1440 : 0);
  const breakEnd = minutes(day.break_end) + (day.break_end < day.start ? 1440 : 0);
  return breakStart >= start && breakEnd > breakStart && breakEnd <= end;
}

export function rentalDurationLabel(minutes: number, labels: { days: string; hours: string; minutes: string }): string {
  return [[Math.floor(minutes / 1440), labels.days], [Math.floor(minutes % 1440 / 60), labels.hours], [minutes % 60, labels.minutes]].filter(([amount]) => Number(amount) > 0).map(([amount, label]) => `${amount} ${label}`).join(' ') || `0 ${labels.minutes}`;
}

export function selectedRentalSlot(slots: RentalSlot[] | undefined, startsAt: string): RentalSlot | undefined {
  // Slots belong to a query keyed by date and duration. The server owns interval
  // validation, including DST; wall-time subtraction cannot determine elapsed time.
  return slots?.find((slot) => slot.starts_at === startsAt && Number.isFinite(slot.price) && slot.price >= 0 && Boolean(slot.ends_at));
}

export function rentalTransitions(booking: Pick<RentalBooking, 'status' | 'is_expired'>): string[] {
  if (booking.is_expired) return [];
  return ({ pending: ['confirmed', 'cancelled'], confirmed: ['in_progress', 'completed', 'cancelled', 'no_show'], in_progress: ['completed', 'cancelled', 'no_show'] } as Record<string, string[]>)[booking.status] ?? [];
}
