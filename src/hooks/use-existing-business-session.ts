import { useQuery } from '@tanstack/react-query';
import { sessionQueryOptions } from '@/services/session-query';

export function useExistingBusinessSession() {
  return useQuery(sessionQueryOptions('business'));
}
