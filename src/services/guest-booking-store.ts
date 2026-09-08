import * as SecureStore from 'expo-secure-store';

const lastCodeKey = 'vizit.guest-booking.last-code.v1';
const tokenKey = (code: string) => `vizit.guest-booking.${code.trim().toUpperCase()}`;
const clientReferenceKey = (bookingId: number) => `vizit.client-booking.reference.${bookingId}.v1`;
const normalizeCode = (code: string) => code.trim().toUpperCase();

export const guestBookingStore = {
  async rememberCode(code: string) {
    const normalized = normalizeCode(code);
    if (normalized) await SecureStore.setItemAsync(lastCodeKey, normalized);
  },
  async restoreLastCode() {
    return SecureStore.getItemAsync(lastCodeKey);
  },
  async rememberClientBookingReference(bookingId: number, code: string) {
    const normalized = normalizeCode(code);
    if (bookingId > 0 && normalized) await SecureStore.setItemAsync(clientReferenceKey(bookingId), normalized);
  },
  async restoreClientBookingReference(bookingId: number) {
    if (bookingId <= 0) return null;
    return SecureStore.getItemAsync(clientReferenceKey(bookingId));
  },
  async forgetClientBookingReference(bookingId: number) {
    if (bookingId > 0) await SecureStore.deleteItemAsync(clientReferenceKey(bookingId));
  },
  async save(code: string, manageToken: string) {
    const normalized = normalizeCode(code);
    await Promise.all([SecureStore.setItemAsync(lastCodeKey, normalized), SecureStore.setItemAsync(tokenKey(normalized), manageToken)]);
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
