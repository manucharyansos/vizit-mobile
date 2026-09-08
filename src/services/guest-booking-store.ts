import * as SecureStore from 'expo-secure-store';

const lastCodeKey = 'vizit.guest-booking.last-code.v1';
const tokenKey = (code: string) => `vizit.guest-booking.${code.trim().toUpperCase()}`;

export const guestBookingStore = {
  async save(code: string, manageToken: string) {
    const normalized = code.trim().toUpperCase();
    await Promise.all([SecureStore.setItemAsync(lastCodeKey, normalized), SecureStore.setItemAsync(tokenKey(normalized), manageToken)]);
  },
  async restoreLast() {
    const code = await SecureStore.getItemAsync(lastCodeKey);
    if (!code) return null;
    const token = await SecureStore.getItemAsync(tokenKey(code));
    return token ? { code, token } : null;
  },
  async clear(code: string) {
    await Promise.all([SecureStore.deleteItemAsync(lastCodeKey), SecureStore.deleteItemAsync(tokenKey(code))]);
  },
};
