import { useNavigation } from 'expo-router';
import type { NavigationProp, ParamListBase } from 'expo-router/react-navigation';
import { useCallback } from 'react';
import { authNavigationState, type AuthDestination } from '@/services/auth-navigation';

export function useAuthNavigation() {
  // In SDK 57, the container has an internal navigator above our app layout.
  // Reset the layout that owns login and both workspaces, including from tabs.
  const navigation = useNavigation<NavigationProp<ParamListBase>>('/');
  return useCallback((destination: AuthDestination) => navigation.reset(authNavigationState(destination)), [navigation]);
}
