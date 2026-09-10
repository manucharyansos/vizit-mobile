import * as SecureStore from 'expo-secure-store';

const lastCodeKey = 'vizit.guest-booking.last-code.v1';
const tokenKey = (code: string) => `vizit.guest-booking.${code.trim().toUpperCase()}`;
const clientReferenceKey = (bookingId: number) => `vizit.client-booking.reference.${bookingId}.v1`;
const clientReferenceIndexKey = 'vizit.client-booking.reference-index.v1';
const normalizeCode = (code: string) => code.trim().toUpperCase();

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
  async rememberCode(code: string) {
    const normalized = normalizeCode(code);
    if (normalized) await SecureStore.setItemAsync(lastCodeKey, normalized);
  },
  async restoreLastCode() {
    return SecureStore.getItemAsync(lastCodeKey);
  },
  async rememberClientBookingReferences(entries: { bookingId: number; code: string }[]) {
    const valid = entries
      .map(({ bookingId, code }) => ({ bookingId, code: normalizeCode(code) }))
      .filter(({ bookingId, code }) => Number.isInteger(bookingId) && bookingId > 0 && Boolean(code));
    if (!valid.length) return;
    const existing = await clientReferenceIndex();
    await Promise.all(valid.map(({ bookingId, code }) => SecureStore.setItemAsync(clientReferenceKey(bookingId), code)));
    await saveClientReferenceIndex([...existing, ...valid.map(({ bookingId }) => bookingId)]);
  },
  async rememberClientBookingReference(bookingId: number, code: string) {
    await this.rememberClientBookingReferences([{ bookingId, code }]);
  },
  async restoreClientBookingReference(bookingId: number) {
    if (bookingId <= 0) return null;
    return SecureStore.getItemAsync(clientReferenceKey(bookingId));
  },
  async forgetClientBookingReference(bookingId: number) {
    if (bookingId <= 0) return;
    const existing = await clientReferenceIndex();
    await SecureStore.deleteItemAsync(clientReferenceKey(bookingId));
    await saveClientReferenceIndex(existing.filter((id) => id !== bookingId));
  },
  async clearClientBookingReferences() {
    const ids = await clientReferenceIndex();
    const references = await Promise.all(ids.map((id) => SecureStore.getItemAsync(clientReferenceKey(id))));
    const normalizedReferences = Array.from(new Set(references.filter((code): code is string => Boolean(code)).map(normalizeCode)));
    const lastCode = await SecureStore.getItemAsync(lastCodeKey);
    await Promise.all([
      ...ids.map((id) => SecureStore.deleteItemAsync(clientReferenceKey(id))),
      ...normalizedReferences.map((code) => SecureStore.deleteItemAsync(tokenKey(code))),
      SecureStore.deleteItemAsync(clientReferenceIndexKey),
      ...(lastCode && normalizedReferences.includes(normalizeCode(lastCode)) ? [SecureStore.deleteItemAsync(lastCodeKey)] : []),
    ]);
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
    await Promise.all([SecureStore.deleteItemAsync(lastCodeKey), SecureStore.deleteItemAsync(tokenKey(code))]);
  },
};
