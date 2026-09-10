import { useQuery } from '@tanstack/react-query';
import { Href, Redirect, Tabs, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { tokenStore } from '@/services/api/client';

export default function BusinessLayout() {
  const { locale, theme } = useApp();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const routeName = segments[segments.length - 1];
  const isAuthScreen = routeName === 'login' || routeName === 'register';

  const storedToken = useQuery({
    queryKey: ['business-token-guard'],
    queryFn: () => tokenStore.get('business'),
    retry: false,
    staleTime: 0,
  });
  const hasStoredToken = Boolean(storedToken.data);

  const session = useQuery({
    queryKey: ['business-session-guard'],
    queryFn: businessApi.me,
    enabled: storedToken.isSuccess && hasStoredToken,
    retry: false,
    staleTime: 0,
  });

  if (storedToken.isLoading || (hasStoredToken && session.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.plum} />
      </View>
    );
  }

  const authenticated = hasStoredToken && session.isSuccess;

  if (!isAuthScreen && !authenticated) {
    return <Redirect href={'/(business)/login' as Href} />;
  }

  if (isAuthScreen && authenticated) {
    return <Redirect href={(session.data?.needs_onboarding ? '/(business)/admin' : '/(business)/today') as Href} />;
  }

  const labels = {
    hy: ['Գլխավոր', 'Օրացույց', 'Հաճախորդներ', 'Ավելին'],
    ru: ['Главная', 'Календарь', 'Клиенты', 'Ещё'],
    en: ['Home', 'Calendar', 'Clients', 'More'],
  }[locale];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.plum,
        tabBarInactiveTintColor: theme.muted,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 9 },
        tabBarStyle: isAuthScreen
          ? { display: 'none' }
          : {
              height: 62 + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 8),
              backgroundColor: theme.surfaceRaised,
              borderTopColor: theme.border,
              borderTopWidth: 1,
            },
      }}
    >
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="register" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="staff-schedule" options={{ href: null }} />
      <Tabs.Screen name="working-hours" options={{ href: null }} />
      <Tabs.Screen name="calendar-blocks" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="telegram" options={{ href: null }} />
      <Tabs.Screen name="gift-cards" options={{ href: null }} />
      <Tabs.Screen name="loyalty" options={{ href: null }} />
      <Tabs.Screen name="growth" options={{ href: null }} />
      <Tabs.Screen name="billing" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="[module]" options={{ href: null }} />
      <Tabs.Screen name="new-booking" options={{ href: null }} />
      <Tabs.Screen name="client-detail" options={{ href: null }} />
      <Tabs.Screen name="locations" options={{ href: null }} />
      <Tabs.Screen name="profile-media" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ title: labels[0], tabBarIcon: ({ color }) => <VizitIcon ios="chart.bar.fill" android="dashboard" color={color} size={23} /> }} />
      <Tabs.Screen name="today" options={{ title: labels[1], tabBarIcon: ({ color }) => <VizitIcon ios="calendar" android="calendar_month" color={color} size={23} /> }} />
      <Tabs.Screen name="clients" options={{ title: labels[2], tabBarIcon: ({ color }) => <VizitIcon ios="person.2.fill" android="group" color={color} size={23} /> }} />
      <Tabs.Screen name="more" options={{ title: labels[3], tabBarIcon: ({ color }) => <VizitIcon ios="ellipsis.circle.fill" android="more_horiz" color={color} size={24} /> }} />
    </Tabs>
  );
}
