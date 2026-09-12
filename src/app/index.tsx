import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { tokenStore } from '@/services/api/client';
import { useApp } from '@/providers/app-provider';

export default function Index() {
  const { theme } = useApp();
  const session = useQuery({ queryKey: ['launch-session'], queryFn: () => tokenStore.lastAudience(), staleTime: 0, retry: false });
  if (session.isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.accent} /></View>;
  return <Redirect href={session.data === 'business' ? '/(business)/today' : '/(customer)/discover'} />;
}
