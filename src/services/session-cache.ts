import type { QueryKey } from '@tanstack/react-query';

export type SessionAudience = 'client' | 'business';

export const sessionQueryKey = (audience: SessionAudience) => [`${audience}-existing-session`] as const;

const businessKeys = new Set(['calendar', 'calendar-blocks', 'staff-schedule', 'waitlist', 'waitlist-availability', 'marketing-campaigns', 'marketing-deliveries']);

export function belongsToSession(key: QueryKey, audience: SessionAudience): boolean {
  const name = String(key[0] ?? '');
  return audience === 'client' ? name.startsWith('client-') : name.startsWith('business-') || businessKeys.has(name);
}

/** Keep the observed session query alive while clearing the account's private data. */
export function isSessionDataQuery(key: QueryKey, audience: SessionAudience): boolean {
  return belongsToSession(key, audience) && key[0] !== sessionQueryKey(audience)[0];
}
