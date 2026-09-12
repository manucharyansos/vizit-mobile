import { useQuery } from '@tanstack/react-query';
import { tokenStore } from '@/services/api/client';

export function useClientSession() {
  return useQuery({
    queryKey: ['client-existing-session'],
    queryFn: async () => Boolean(await tokenStore.get('client')),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
