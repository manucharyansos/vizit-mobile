import { useNavigationContainerRef } from 'expo-router';
import { useCallback } from 'react';
import { signedInNavigationState, type SignedInDestination } from '@/services/auth-navigation';

export function useAuthNavigation() {
  const navigation = useNavigationContainerRef();
  return useCallback((destination: SignedInDestination) => navigation.resetRoot(signedInNavigationState(destination)), [navigation]);
}
