import type { QueryKey } from '@tanstack/react-query';

export type SessionAudience = 'client' | 'business';

const businessKeys = new Set(['calendar', 'calendar-blocks', 'staff-schedule', 'waitlist', 'waitlist-availability', 'marketing-campaigns', 'marketing-deliveries']);

export function belongsToSession(key: QueryKey, audience: SessionAudience): boolean {
  const name = String(key[0] ?? '');
  return audience === 'client' ? name.startsWith('client-') : name.startsWith('business-') || businessKeys.has(name);
}
