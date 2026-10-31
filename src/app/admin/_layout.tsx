import { useQuery } from '@tanstack/react-query';
import { Href, Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '@/providers/app-provider';
import { adminApi, adminTokenStore } from '@/services/api/admin';

/** Only a signed-in super admin reaches these screens; anyone else goes to the login page. */
export default function AdminLayout() {
  const { theme } = useApp();
  const session = useQuery({
    queryKey: ['admin-session'],
    queryFn: async () => ((await adminTokenStore.get()) ? adminApi.me() : null),
    retry: false,
    staleTime: 5 * 60_000,
  });
  if (session.isPending) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.accent} /></View>;
  if (!session.data || session.data.role !== 'super_admin') return <Redirect href={'/login' as Href} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />;
}
