import { useQuery } from '@tanstack/react-query';
import { Href, Tabs, router, useSegments } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
    queryKey: ['business-protected-token'],
    queryFn: () => tokenStore.get('business'),
    enabled: !isAuthScreen,
    retry: false,
    staleTime: 0,
  });
  const hasStoredToken = Boolean(storedToken.data);
  const session = useQuery({
    queryKey: ['business-protected-session'],
    queryFn: businessApi.me,
    enabled: !isAuthScreen && storedToken.isSuccess && hasStoredToken,
    retry: false,
    staleTime: 0,
  });

  if (!isAuthScreen && (storedToken.isLoading || (hasStoredToken && session.isLoading))) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.plum} /></View>;
  }

  if (!isAuthScreen && (!hasStoredToken || session.isError)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <VizitIcon ios="lock.fill" android="lock" color={theme.plum} size={32} />
        <Text style={[styles.gateTitle, { color: theme.text }]}>{locale === 'hy' ? 'Մուտք գործեք բիզնես հաշիվ' : locale === 'ru' ? 'Войдите в бизнес-аккаунт' : 'Sign in to your business account'}</Text>
        <Pressable
          onPress={async () => {
            await tokenStore.remove('business');
            router.replace('/(business)/login' as Href);
          }}
          style={[styles.gateButton, { backgroundColor: theme.plum }]}
        >
          <Text style={styles.gateButtonText}>{locale === 'hy' ? 'Մուտք գործել' : locale === 'ru' ? 'Войти' : 'Sign in'}</Text>
        </Pressable>
      </View>
    );
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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  gateTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  gateButton: { minHeight: 50, paddingHorizontal: 24, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gateButtonText: { color: '#FFFFFF', fontWeight: '900' },
});