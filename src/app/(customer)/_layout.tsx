import { useQuery } from '@tanstack/react-query';
import { router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from '@/components/vizit-icon';
import { tokenStore } from '@/services/api/client';

export default function CustomerLayout() {
  const { t, theme } = useApp();
  const insets = useSafeAreaInsets();
  const clientSession = useQuery({
    queryKey: ['client-existing-session'],
    queryFn: async () => Boolean(await tokenStore.get('client')),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.plum, tabBarInactiveTintColor: theme.muted, tabBarShowLabel: false, tabBarItemStyle: { paddingTop: 9 }, tabBarStyle: { height: 62 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.surfaceRaised, borderTopColor: theme.border, borderTopWidth: 1 } }}>
    <Tabs.Screen name="discover" options={{ title: t('discover'), tabBarIcon: ({ color }) => <VizitIcon ios="house.fill" android="home" color={color} size={25} /> }} />
    <Tabs.Screen name="bookings" options={{ title: t('bookings'), tabBarIcon: ({ color }) => <VizitIcon ios="calendar" android="calendar_month" color={color} size={23} /> }} />
    <Tabs.Screen
      name="profile"
      options={{ title: t('profile'), tabBarIcon: ({ color }) => <VizitIcon ios="person" android="person" color={color} size={23} /> }}
      listeners={{
        tabPress: (event) => {
          if (!clientSession.isLoading && !clientSession.data) {
            event.preventDefault();
            router.push('/login');
          }
        },
      }}
    />
  </Tabs>;
}
