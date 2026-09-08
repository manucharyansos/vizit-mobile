import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from '@/components/vizit-icon';

export default function CustomerLayout() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#378ADD', tabBarInactiveTintColor: '#63839F', tabBarShowLabel: false, tabBarItemStyle: { paddingTop: 9 }, tabBarStyle: { height: 62 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: '#0A2133', borderTopColor: '#173B57', borderTopWidth: 1 } }}>
    <Tabs.Screen name="discover" options={{ title: t('discover'), tabBarIcon: ({ color }) => <VizitIcon ios="house.fill" android="home" color={color} size={25} /> }} />
    <Tabs.Screen name="bookings" options={{ title: t('bookings'), tabBarIcon: ({ color }) => <VizitIcon ios="calendar" android="calendar_month" color={color} size={23} /> }} />
    <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color }) => <VizitIcon ios="person" android="person" color={color} size={23} /> }} />
  </Tabs>;
}
