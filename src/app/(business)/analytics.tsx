import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: ['Վերլուծություն', 'Այսօր ամրագրումներ', 'Այսօր եկամուտ', '7 օր՝ ամրագրումներ', '7 օր՝ եկամուտ', 'Միջին կտրոն', 'Ավարտման տոկոս', 'Չհաջողվեց բեռնել վերլուծությունը', 'Կրկին փորձել'],
  ru: ['Аналитика', 'Записи сегодня', 'Доход сегодня', 'Записи за 7 дней', 'Доход за 7 дней', 'Средний чек', 'Завершение', 'Не удалось загрузить аналитику', 'Повторить'],
  en: ['Analytics', 'Bookings today', 'Revenue today', '7-day bookings', '7-day revenue', 'Average ticket', 'Completion rate', 'Could not load analytics', 'Try again'],
};

function metric(data: unknown, path: string): number | null {
  const value = path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, data);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function AnalyticsScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const query = useQuery({ queryKey: ['business-analytics'], queryFn: businessApi.analytics, retry: false, refetchOnMount: 'always' });
  const currency = query.data && typeof query.data === 'object' ? String((query.data as Record<string, unknown>).currency ?? 'AMD') : 'AMD';
  const metrics = query.data ? [
    [c[1], metric(query.data, 'today.bookings'), ''],
    [c[2], metric(query.data, 'today.revenue'), ` ${currency}`],
    [c[3], metric(query.data, 'last_7_days.bookings'), ''],
    [c[4], metric(query.data, 'last_7_days.revenue'), ` ${currency}`],
    [c[5], metric(query.data, 'metrics_30d.avg_ticket'), ` ${currency}`],
    [c[6], metric(query.data, 'metrics_30d.completion_rate'), '%'],
  ] as const : [];

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text>{query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '900' }}>{c[7]}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{apiErrorMessage(query.error)}</Text><Pressable onPress={() => query.refetch()}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c[8]}</Text></Pressable></View> : <View style={styles.grid}>{metrics.map(([label, value, suffix]) => <View key={label} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.value, { color: theme.plumStrong }]}>{value == null ? '—' : `${value.toLocaleString()}${suffix}`}</Text><Text style={{ color: theme.muted, fontWeight: '700' }}>{label}</Text></View>)}</View>}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, card: { width: '48%', minHeight: 118, padding: 15, borderRadius: 11, borderWidth: 1, justifyContent: 'space-between' }, value: { fontSize: 23, fontWeight: '900' }, error: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 } });