import { useQuery } from '@tanstack/react-query';
import { businessApi } from '@/services/api/business';
import { businessPermissions } from '@/services/business-permissions';
export function useBusinessPermissions() {
  const me = useQuery({ queryKey: ['business-me'], queryFn: businessApi.me, retry: false });
  return {
    ...businessPermissions(me.isError ? undefined : me.data?.role),
    user: me.isError ? undefined : me.data,
    isLoading: me.isPending,
    isError: me.isError,
    isFetching: me.isFetching,
    refetch: me.refetch,
  };
}
