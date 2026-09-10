import { useQuery } from '@tanstack/react-query';
import { businessApi } from '@/services/api/business';
import { tokenStore } from '@/services/api/client';

export function useExistingBusinessSession() {
  return useQuery({
    queryKey: ['business-existing-session'],
    queryFn: async () => {
      const token = await tokenStore.get('business');
      if (!token) return null;
      try {
        return await businessApi.me();
      } catch {
        await tokenStore.remove('business');
        return null;
      }
    },
    retry: false,
    staleTime: 0,
  });
}
