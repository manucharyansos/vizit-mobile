import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { APP_TIME_ZONE, localDateKey } from '@/services/date-time';

const copy = {
  hy: ['Գլխավոր', 'Բիզնեսի ընդհանուր պատկերը', 'Այսօր', 'Ամրագրումներ', 'Հաճախորդներ', 'Աշխատակիցներ', 'Ծառայություններ', 'Չհաջողվեց բեռնել տվյալները', 'Կրկին փորձել'],
  ru: ['Главная', 'Обзор бизнеса', 'Сегодня', 'Записи', 'Клиенты', 'Сотрудники', 'Услуги', 'Не удалось загрузить данные', 'Повторить'],
  en: ['Dashboard', 'Business overview', 'Today', 'Bookings', 'Clients', 'Team', 'Services', 'Could not load dashboard', 'Try again'],
};

function readNumber(root: Record<string, unknown>, path: string): number | null {
  const value = path.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, root);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function BusinessDashboard() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const query = useQuery<Record<string, unknown>>({
    queryKey: ['business-dashboard'],
    queryFn: businessApi.dashboard,
    retry: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  // Keep the client count trustworthy even when an older API deployment omits counts.clients.
  const clients = useQuery({
    queryKey: ['business-clients'],
    queryFn: businessApi.clients,
    retry: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  const date = localDateKey();
  const dateLabel = new Intl.DateTimeFormat(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: APP_TIME_ZONE,
  }).format(new Date(`${date}T12:00:00+04:00`));

  const data = query.data;
  const dashboardClientCount = data ? readNumber(data, 'counts.clients') : null;
  const clientCount = clients.data ? clients.data.length : dashboardClientCount;
  const cards = data ? [
    [c[3], readNumber(data, 'today.total'), 'calendar_month'],
    [c[4], clientCount, 'group'],
    [c[5], readNumber(data, 'counts.staff'), 'badge'],
    [c[6], readNumber(data, 'counts.services'), 'grid_view'],
  ] as const : [];

  const retryAll = () => void Promise.all([query.refetch(), clients.refetch()]);
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heading}><View style={[styles.icon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="chart.bar.fill" android="dashboard" color={theme.plum} size={25} /></View><View><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text><Text style={{ color: theme.muted }}>{c[1]}</Text></View></View>
      <View style={[styles.todayStrip, { backgroundColor: theme.plumSoft, borderColor: theme.border }]}><View style={styles.todayCopy}><Text style={[styles.todayLabel, { color: theme.muted }]}>{c[2]}</Text><Text style={[styles.todayDate, { color: theme.text }]}>{dateLabel}</Text></View><Pressable onPress={() => router.push('/(business)/new-booking' as never)} style={[styles.quickAdd, { backgroundColor: theme.plum }]}><VizitIcon ios="plus" android="add" color="#FFF" size={23} /></Pressable></View>
      {query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><VizitIcon ios="exclamationmark.triangle.fill" android="error_outline" color={theme.danger} size={26} /><Text style={[styles.errorTitle, { color: theme.text }]}>{c[7]}</Text><Text style={[styles.errorText, { color: theme.muted }]}>{apiErrorMessage(query.error)}</Text><Pressable onPress={retryAll} style={[styles.retry, { backgroundColor: theme.plum }]}><Text style={styles.retryText}>{c[8]}</Text></Pressable></View> : <View style={styles.grid}>{cards.map(([label, value, icon]) => <View key={label} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><VizitIcon ios="chart.bar.fill" android={icon} color={theme.gold} size={23} /><Text style={[styles.value, { color: theme.text }]}>{value == null ? '—' : value}</Text><Text style={[styles.label, { color: theme.muted }]}>{label}</Text></View>)}</View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, gap: 22 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 13 }, icon: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 27, fontWeight: '900' },
  todayStrip: { minHeight: 92, borderRadius: 12, borderWidth: 1, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, todayCopy: { flex: 1 }, todayLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }, todayDate: { fontSize: 18, fontWeight: '900', marginTop: 6, textTransform: 'capitalize' }, quickAdd: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, card: { width: '48%', minHeight: 135, padding: 16, borderRadius: 11, borderWidth: 1, justifyContent: 'space-between' }, value: { fontSize: 30, fontWeight: '900', marginTop: 15 }, label: { fontSize: 13, fontWeight: '700' },
  error: { borderWidth: 1, borderRadius: 11, padding: 18, alignItems: 'center', gap: 8 }, errorTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' }, errorText: { fontSize: 12, textAlign: 'center' }, retry: { minHeight: 45, paddingHorizontal: 20, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 5 }, retryText: { color: '#FFF', fontWeight: '900' },
});