import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { businessAuthClient, clientAuthClient, TokenAudience } from './api/client';
import { getNotifications } from './notification-module';

export async function requestExpoPushToken() {
  const Notifications = await getNotifications();
  if (!Notifications) throw new Error('Push notifications require a development build');
  if (!Device.isDevice) throw new Error('Push notifications require a physical device');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('bookings', { name: 'Bookings', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], lightColor: '#252A56' });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Notification permission denied');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS projectId is required before push-token registration');
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

const pushTokenKeys: Record<TokenAudience, string> = {
  client: 'vizit.push.client.v1',
  business: 'vizit.push.business.v1',
};

const audienceClient = (audience: TokenAudience) => audience === 'client' ? clientAuthClient : businessAuthClient;

export async function synchronizePushDevice(audience: TokenAudience) {
  try {
    const expoPushToken = await requestExpoPushToken();
    const localeCode = Localization.getLocales()[0]?.languageCode;
    const locale = localeCode === 'hy' || localeCode === 'ru' || localeCode === 'en' ? localeCode : 'hy';
    await audienceClient(audience).post('/mobile/devices', {
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version,
      locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    await SecureStore.setItemAsync(pushTokenKeys[audience], expoPushToken);
    return true;
  } catch {
    // Push setup must never make authentication fail (simulator, denied permission, or missing EAS id).
    return false;
  }
}

export async function revokePushDevice(audience: TokenAudience) {
  const expoPushToken = await SecureStore.getItemAsync(pushTokenKeys[audience]);
  if (!expoPushToken) return;
  try {
    await audienceClient(audience).delete('/mobile/devices/current', { data: { expo_push_token: expoPushToken } });
  } catch {
    // Device removal is best-effort. An expired token must never block sign-out.
  } finally {
    await SecureStore.deleteItemAsync(pushTokenKeys[audience]);
  }
}
