import { useQuery } from '@tanstack/react-query';
import { sessionQueryOptions } from '@/services/session-query';

export function useClientSession() {
  return useQuery(sessionQueryOptions('client'));
}
