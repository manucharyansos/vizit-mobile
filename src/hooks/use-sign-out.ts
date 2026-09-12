import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { clientAccountApi } from '@/services/api/client-account';
import type { TokenAudience } from '@/services/api/client';
import { useAuthNavigation } from './use-auth-navigation';

export function useSignOut(audience: TokenAudience) {
  const navigate = useAuthNavigation();
  const { t } = useApp();
  return useMutation({
    // Local sign-out must run even when React Query's network manager is offline.
    networkMode: 'always',
    mutationFn: audience === 'business' ? businessApi.logout : clientAccountApi.logout,
    onSuccess: () => navigate('login'),
    onError: () => Alert.alert(t('loadError')),
  });
}
