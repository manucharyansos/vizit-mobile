import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AppProvider, useApp } from '@/providers/app-provider';
import { NoticeProvider } from '@/providers/notice-provider';
import { useNotificationNavigation } from '@/hooks/use-notification-navigation';
import { appQueryClient } from '@/services/query-client';

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { mode, ready, theme } = useApp();
  useNotificationNavigation();
  useEffect(() => { if (ready) void SplashScreen.hideAsync(); }, [ready]);
  useEffect(() => { if (Platform.OS === 'android') NavigationBar.setStyle(mode === 'dark' ? 'light' : 'dark'); }, [mode]);
  if (!ready) return null;
  return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} /></>;
}

export default function RootLayout() {
  return <QueryClientProvider client={appQueryClient}><AppProvider><NoticeProvider><Navigator /></NoticeProvider></AppProvider></QueryClientProvider>;
}
