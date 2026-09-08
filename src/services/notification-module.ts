import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');
let modulePromise: Promise<NotificationsModule> | null = null;
let handlerConfigured = false;

export function supportsNativePush() {
  return Platform.OS !== 'web' && Constants.expoGoConfig == null;
}

export async function getNotifications(): Promise<NotificationsModule | null> {
  // Since SDK 53 Android remote notifications are unavailable in Expo Go.
  // Avoid even evaluating expo-notifications there because the package throws on import.
  if (!supportsNativePush()) return null;
  modulePromise ??= import('expo-notifications');
  const notifications = await modulePromise;
  if (!handlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
    });
    handlerConfigured = true;
  }
  return notifications;
}
