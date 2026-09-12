import { useQuery } from '@tanstack/react-query';
import { router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
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

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: theme.accentText,
    tabBarInactiveTintColor: theme.faint,
    tabBarActiveBackgroundColor: theme.accentSubtle,
    tabBarShowLabel: true,
    tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 1 },
    tabBarIconStyle: { marginTop: 3 },
    tabBarItemStyle: { marginHorizontal: 4, marginVertical: 7, borderRadius: ui.radius.medium },
    tabBarStyle: {
      height: 68 + insets.bottom,
      paddingHorizontal: 8,
      paddingBottom: Math.max(insets.bottom, 7),
      backgroundColor: theme.surfaceRaised,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -5 },
      elevation: 10,
    },
  }}>
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
