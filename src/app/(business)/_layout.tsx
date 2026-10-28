import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { BusinessSessionBoundary } from '@/components/business-session-boundary';
import { useApp } from '@/providers/app-provider';
import { ui } from '@/constants/vizit-theme';

export default function BusinessLayout() {
  return <BusinessSessionBoundary><BusinessTabs /></BusinessSessionBoundary>;
}

function BusinessTabs() {
  const { locale, theme } = useApp();
  const insets = useSafeAreaInsets();

  const labels = {
    hy: ['Գլխավոր', 'Օրացույց', 'Հաճախորդներ', 'Ավելին'],
    ru: ['Главная', 'Календарь', 'Клиенты', 'Ещё'],
    en: ['Home', 'Calendar', 'Clients', 'More'],
  }[locale];

  // Each tab needs 52px (5px padding + 28px icon box + 1px gap + 13px label +
  // 5px padding). 66px minus the border and 6px margins leaves 53px.
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarStyle = {
    height: 66 + bottomInset,
    paddingHorizontal: 4,
    paddingBottom: bottomInset,
    backgroundColor: theme.surfaceRaised,
    borderTopColor: theme.border,
    borderTopWidth: 1,
    shadowColor: theme.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  } as const;

  return (
    <Tabs
      initialRouteName="dashboard"
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentText,
        tabBarInactiveTintColor: theme.faint,
        tabBarActiveBackgroundColor: theme.accentSubtle,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 1 },
        // Four tabs are narrow: no side margins, so "Հաճախորդներ" fits on 360px-wide phones.
        tabBarItemStyle: { marginVertical: 6, borderRadius: ui.radius.medium },
        tabBarStyle,
      }}
    >
      <Tabs.Screen name="login" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="register" options={{ href: null, tabBarStyle: { display: 'none' } }} />
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
