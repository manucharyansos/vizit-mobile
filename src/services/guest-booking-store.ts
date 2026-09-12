import * as SecureStore from 'expo-secure-store';

const lastCodeKey = 'vizit.guest-booking.last-code.v1';
const tokenKey = (code: string) => `vizit.guest-booking.${code.trim().toUpperCase()}`;
const clientReferenceKey = (bookingId: number) => `vizit.client-booking.reference.${bookingId}.v1`;
const clientReferenceIndexKey = 'vizit.client-booking.reference-index.v1';
const normalizeCode = (code: string) => code.trim().toUpperCase();
const guestIndexKey = 'vizit.guest-booking.index.v2';
const summaryKey = (code: string) => `vizit.guest-booking.summary.${normalizeCode(code)}.v2`;
const requestedCodeKey = 'vizit.guest-booking.open.v2';
const paymentKey = (paymentId: string) => `vizit.guest-booking.payment.${paymentId}.v2`;

export type GuestBookingSummary = {
  bookingIds?: number[];
  businessName?: string;
  businessSlug?: string;
  serviceName?: string;
  staffName?: string;
  startsAt?: string;
  status?: string;
};
export type SavedGuestBooking = { code: string; summary: GuestBookingSummary };

// SecureStore has no key enumeration. Maintain an index for every new guest
// booking, with small pages so a long history never becomes one oversized value.
let pendingWrite: Promise<unknown> = Promise.resolve();
function serialize<T>(write: () => Promise<T>): Promise<T> {
  const next = pendingWrite.then(write, write);
  pendingWrite = next.catch(() => undefined);
  return next;
}
async function guestCodes(): Promise<string[]> {
  const pages = Number(await SecureStore.getItemAsync(guestIndexKey)) || 0;
  const result: string[] = [];
  for (let page = 0; page < pages; page++) {
    const raw = await SecureStore.getItemAsync(`${guestIndexKey}.${page}`);
    try {
      const values: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(values)) result.push(...values.filter((value): value is string => typeof value === 'string' && Boolean(value)));
    } catch { /* Keep other pages readable if one stored page is corrupt. */ }
  }
  return Array.from(new Set(result.map(normalizeCode)));
}
async function saveGuestCodes(codes: string[]) {
  const pages = Math.ceil(codes.length / 20);
  for (let page = 0; page < pages; page++) {
    await SecureStore.setItemAsync(`${guestIndexKey}.${page}`, JSON.stringify(codes.slice(page * 20, (page + 1) * 20)));
  }
  await SecureStore.setItemAsync(guestIndexKey, String(pages));
}

async function migrateLastGuestCode(codes: string[]): Promise<string[]> {
  const last = await SecureStore.getItemAsync(lastCodeKey);
  if (!last || codes.includes(normalizeCode(last))) return codes;
  const ids = await clientReferenceIndex();
  const accountReferences = await Promise.all(ids.map((id) => SecureStore.getItemAsync(clientReferenceKey(id))));
  if (accountReferences.includes(last)) return codes;
  return [normalizeCode(last), ...codes];
}

async function clientReferenceIndex(): Promise<number[]> {
  try {
    const raw = await SecureStore.getItemAsync(clientReferenceIndexKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
}

async function saveClientReferenceIndex(ids: number[]) {
  const unique = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (!unique.length) {
    await SecureStore.deleteItemAsync(clientReferenceIndexKey);
    return;
  }
  await SecureStore.setItemAsync(clientReferenceIndexKey, JSON.stringify(unique));
}

export const guestBookingStore = {
  async rememberGuestBooking(code: string, summary: GuestBookingSummary) {
    return serialize(async () => {
      const normalized = normalizeCode(code);
      if (!normalized) return;
      const existing = await migrateLastGuestCode(await guestCodes());
      await SecureStore.setItemAsync(summaryKey(normalized), JSON.stringify(summary));
      await saveGuestCodes([normalized, ...existing.filter((value) => value !== normalized)]);
      await SecureStore.setItemAsync(lastCodeKey, normalized);
      await SecureStore.setItemAsync(requestedCodeKey, normalized);
    });
  },
  async listGuestBookings(): Promise<SavedGuestBooking[]> {
    return serialize(async () => {
      const codes = await migrateLastGuestCode(await guestCodes());
      await saveGuestCodes(codes);
      return Promise.all(codes.map(async (code) => {
        const raw = await SecureStore.getItemAsync(summaryKey(code));
        let summary: GuestBookingSummary = {};
        try { summary = (raw ? JSON.parse(raw) : null) ?? {}; } catch { /* Legacy booking: load its details after verification. */ }
        return { code, summary };
      }));
    });
  },
  async updateGuestSummary(code: string, summary: GuestBookingSummary) {
    return serialize(async () => {
      if ((await guestCodes()).includes(normalizeCode(code))) {
        await SecureStore.setItemAsync(summaryKey(code), JSON.stringify(summary));
      }
    });
  },
  async requestOpen(code: string) {
    await SecureStore.setItemAsync(requestedCodeKey, normalizeCode(code));
    await this.rememberCode(code);
  },
  async consumeRequestedCode() {
    const code = await SecureStore.getItemAsync(requestedCodeKey);
    await SecureStore.deleteItemAsync(requestedCodeKey);
    return code;
  },
  async rememberPayment(paymentId: string, code: string) {
    if (!/^\d+$/.test(paymentId)) throw new Error('Invalid payment id');
    await SecureStore.setItemAsync(paymentKey(paymentId), normalizeCode(code));
  },
  async restorePayment(paymentId: string) {
    if (!/^\d+$/.test(paymentId)) return null;
    const code = await SecureStore.getItemAsync(paymentKey(paymentId));
    return code ? this.restore(code) : null;
  },
  async rememberCode(code: string) {
    const normalized = normalizeCode(code);
    if (normalized) await SecureStore.setItemAsync(lastCodeKey, normalized);
  },
  async restoreLastCode() {
    return SecureStore.getItemAsync(lastCodeKey);
  },
  async rememberClientBookingReferences(entries: { bookingId: number; code: string }[]) {
    return serialize(async () => {
    const valid = entries
      .map(({ bookingId, code }) => ({ bookingId, code: normalizeCode(code) }))
      .filter(({ bookingId, code }) => Number.isInteger(bookingId) && bookingId > 0 && Boolean(code));
    if (!valid.length) return;
    const existing = await clientReferenceIndex();
    await Promise.all(valid.map(({ bookingId, code }) => SecureStore.setItemAsync(clientReferenceKey(bookingId), code)));
    await saveClientReferenceIndex([...existing, ...valid.map(({ bookingId }) => bookingId)]);
    });
  },
  async rememberClientBookingReference(bookingId: number, code: string) {
    await this.rememberClientBookingReferences([{ bookingId, code }]);
  },
  async restoreClientBookingReference(bookingId: number) {
    if (bookingId <= 0) return null;
    return SecureStore.getItemAsync(clientReferenceKey(bookingId));
  },
  async forgetClientBookingReference(bookingId: number) {
    return serialize(async () => {
    if (bookingId <= 0) return;
    const existing = await clientReferenceIndex();
    await SecureStore.deleteItemAsync(clientReferenceKey(bookingId));
    await saveClientReferenceIndex(existing.filter((id) => id !== bookingId));
    });
  },
  async clearClientBookingReferences() {
    return serialize(async () => {
    const ids = await clientReferenceIndex();
    const references = await Promise.all(ids.map((id) => SecureStore.getItemAsync(clientReferenceKey(id))));
    const normalizedReferences = Array.from(new Set(references.filter((code): code is string => Boolean(code)).map(normalizeCode)));
    const guests = await guestCodes();
    const lastCode = await SecureStore.getItemAsync(lastCodeKey);
    await Promise.all([
      ...ids.map((id) => SecureStore.deleteItemAsync(clientReferenceKey(id))),
      ...normalizedReferences.filter((code) => !guests.includes(code)).map((code) => SecureStore.deleteItemAsync(tokenKey(code))),
      SecureStore.deleteItemAsync(clientReferenceIndexKey),
      SecureStore.deleteItemAsync(requestedCodeKey),
      ...(lastCode && normalizedReferences.includes(normalizeCode(lastCode)) && !guests.includes(normalizeCode(lastCode)) ? [SecureStore.deleteItemAsync(lastCodeKey)] : []),
    ]);
    });
  },
  async save(code: string, manageToken: string) {
    const normalized = normalizeCode(code);
    await Promise.all([SecureStore.setItemAsync(lastCodeKey, normalized), SecureStore.setItemAsync(tokenKey(normalized), manageToken)]);
  },
  async restore(code: string) {
    const normalized = normalizeCode(code);
    if (!normalized) return null;
    const token = await SecureStore.getItemAsync(tokenKey(normalized));
    return token ? { code: normalized, token } : null;
  },
  async restoreLast() {
    const code = await SecureStore.getItemAsync(lastCodeKey);
    if (!code) return null;
    const token = await SecureStore.getItemAsync(tokenKey(code));
    return token ? { code, token } : null;
  },
  async clearSession(code: string) {
    await SecureStore.deleteItemAsync(tokenKey(code));
  },
  async clear(code: string) {
    return serialize(async () => {
      const normalized = normalizeCode(code);
      await saveGuestCodes((await guestCodes()).filter((value) => value !== normalized));
      await Promise.all([SecureStore.deleteItemAsync(summaryKey(normalized)), SecureStore.deleteItemAsync(tokenKey(normalized))]);
      if (await SecureStore.getItemAsync(lastCodeKey) === normalized) await SecureStore.deleteItemAsync(lastCodeKey);
    });
  },
};
