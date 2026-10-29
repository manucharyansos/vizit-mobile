import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { AppProvider, useApp } from '@/providers/app-provider';
import { NoticeProvider } from '@/providers/notice-provider';
import { useNotificationNavigation } from '@/hooks/use-notification-navigation';
import { appQueryClient } from '@/services/query-client';
import { installArmenianDateFallback } from '@/services/intl-hy-fallback';
import { trackAppOpen, trackScreen } from '@/services/site-analytics';

installArmenianDateFallback();

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { mode, ready, theme, locale } = useApp();
  const pathname = usePathname();
  useNotificationNavigation();
  useEffect(() => {
    trackAppOpen(locale);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') trackAppOpen(locale); });
    return () => subscription.remove();
    // Count launches and returns to the foreground, not language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready) trackScreen(pathname, locale); }, [pathname, ready, locale]);
  useEffect(() => { if (ready) void SplashScreen.hideAsync(); }, [ready]);
  useEffect(() => { if (Platform.OS === 'android') NavigationBar.setStyle(mode === 'dark' ? 'light' : 'dark'); }, [mode]);
  if (!ready) return null;
  return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} /></>;
}

export default function RootLayout() {
  return <QueryClientProvider client={appQueryClient}><AppProvider><NoticeProvider><Navigator /></NoticeProvider></AppProvider></QueryClientProvider>;
}
