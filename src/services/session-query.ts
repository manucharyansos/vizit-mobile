import { queryOptions } from '@tanstack/react-query';
import { tokenStore } from '@/services/api/client';
import { sessionQueryKey, type SessionAudience } from '@/services/session-cache';

export function sessionQueryOptions(audience: SessionAudience) {
  return queryOptions({
    queryKey: sessionQueryKey(audience),
    queryFn: async () => Boolean(await tokenStore.get(audience)),
    // SecureStore does not need a network connection, including during logout.
    networkMode: 'always',
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
