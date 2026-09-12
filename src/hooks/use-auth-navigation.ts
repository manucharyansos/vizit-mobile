import { useNavigationContainerRef } from 'expo-router';
import { useCallback } from 'react';
import { authNavigationState, type AuthDestination } from '@/services/auth-navigation';

export function useAuthNavigation() {
  const navigation = useNavigationContainerRef();
  return useCallback((destination: AuthDestination) => navigation.resetRoot(authNavigationState(destination)), [navigation]);
}
