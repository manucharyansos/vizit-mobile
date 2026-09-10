import { useQuery } from '@tanstack/react-query';
import { tokenStore } from '@/services/api/client';

export function useExistingBusinessSession() {
  return useQuery({
    queryKey: ['business-existing-session'],
    queryFn: async () => Boolean(await tokenStore.get('business')),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
