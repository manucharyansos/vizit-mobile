import { Href, router } from 'expo-router';
import { useEffect } from 'react';
import { getNotifications } from '@/services/notification-module';

type NotificationData = Record<string, unknown>;

function destination(data: NotificationData): Href {
  const audience = data.audience === 'business' ? 'business' : 'client';
  if (audience === 'business') return '/(business)/today';
  if (typeof data.business_slug === 'string' && data.type === 'business.recommendation') return { pathname: '/business/[slug]', params: { slug: data.business_slug } };
  return '/(customer)/bookings';
}

export function useNotificationNavigation() {
  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | undefined;
    void getNotifications().then(async (Notifications) => {
      if (!mounted || !Notifications) return;
      const response = await Notifications.getLastNotificationResponseAsync();
      if (mounted && response) {
        router.push(destination(response.notification.request.content.data ?? {}));
        void Notifications.clearLastNotificationResponseAsync();
      }
      const subscription = Notifications.addNotificationResponseReceivedListener((next) => router.push(destination(next.notification.request.content.data ?? {})));
      removeListener = () => subscription.remove();
      if (!mounted) removeListener();
    }).catch(() => undefined);
    return () => { mounted = false; removeListener?.(); };
  }, []);
}
