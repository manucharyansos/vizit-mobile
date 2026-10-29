import { AppState } from 'react-native';
import { publicClient } from './api/client';

/**
 * Anonymous usage events for the Vizit admin "Visits" page. Nothing that
 * identifies a person is sent; the API hashes visitors per day.
 */
type AppEvent = { event: 'app_open' | 'screen_view' | 'booking_created'; path?: string; locale?: string };

const queue: AppEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let lastPath = '';

function flush() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!queue.length) return;
  const events = queue.splice(0, 20);
  void publicClient.post('/v1/public/analytics/events', { source: 'mobile', device: 'mobile', events }).catch(() => undefined);
}

function push(item: AppEvent, now = false) {
  if (__DEV__) return;
  queue.push(item);
  if (now || queue.length >= 10) flush();
  else if (!timer) timer = setTimeout(flush, 5000);
}

export function trackAppOpen(locale?: string) {
  push({ event: 'app_open', locale }, true);
}

export function trackScreen(path: string, locale?: string) {
  // Dynamic segments keep their value, e.g. /business/salon-name, so popular businesses are visible.
  if (!path || path === lastPath) return;
  lastPath = path;
  push({ event: 'screen_view', path: path.slice(0, 255), locale });
}

export function trackAppBooking(path: string) {
  push({ event: 'booking_created', path }, true);
}

AppState.addEventListener('change', (state) => {
  if (state === 'background') flush();
});
