import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, StateCard, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: ['Վերլուծություն', 'Այսօր ամրագրումներ', 'Այսօր եկամուտ', '7 օր՝ ամրագրումներ', '7 օր՝ եկամուտ', 'Միջին կտրոն', 'Ավարտման տոկոս', 'Չհաջողվեց բեռնել վերլուծությունը', 'Կրկին փորձել', 'Արդյունքներ և դինամիկա'],
  ru: ['Аналитика', 'Записи сегодня', 'Доход сегодня', 'Записи за 7 дней', 'Доход за 7 дней', 'Средний чек', 'Завершение', 'Не удалось загрузить аналитику', 'Повторить', 'Результаты и динамика'],
  en: ['Analytics', 'Bookings today', 'Revenue today', '7-day bookings', '7-day revenue', 'Average ticket', 'Completion rate', 'Could not load analytics', 'Try again', 'Performance and momentum'],
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
    { label: c[1], value: metric(query.data, 'today.bookings'), suffix: '', ios: 'calendar' as const, android: 'calendar_month' as const },
    { label: c[2], value: metric(query.data, 'today.revenue'), suffix: ` ${currency}`, ios: 'banknote.fill' as const, android: 'payments' as const },
    { label: c[3], value: metric(query.data, 'last_7_days.bookings'), suffix: '', ios: 'calendar.badge.clock' as const, android: 'date_range' as const },
    { label: c[4], value: metric(query.data, 'last_7_days.revenue'), suffix: ` ${currency}`, ios: 'chart.line.uptrend.xyaxis' as const, android: 'trending_up' as const },
    { label: c[5], value: metric(query.data, 'metrics_30d.avg_ticket'), suffix: ` ${currency}`, ios: 'creditcard.fill' as const, android: 'credit_card' as const },
    { label: c[6], value: metric(query.data, 'metrics_30d.completion_rate'), suffix: '%', ios: 'checkmark.circle.fill' as const, android: 'check_circle' as const },
  ] : [];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Vizit Business" title={c[0]} subtitle={c[9]} />
        {query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
          <StateCard title={c[7]} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c[8]} onPress={() => query.refetch()} tone="secondary" />} />
        ) : (
          <View style={styles.grid}>
            {metrics.map(({ label, value, suffix, ios, android }, index) => (
              <Surface key={label} style={[styles.card, index < 2 && styles.featureCard]} elevated>
                <View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios={ios} android={android} color={theme.accentText} size={20} /></View><Text style={[styles.index, { color: theme.faint }]}>0{index + 1}</Text></View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { color: theme.text }]}>{value == null ? '—' : `${value.toLocaleString()}${suffix}`}</Text>
                <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
              </Surface>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: 38, gap: 20 },
  loader: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', minHeight: 142, padding: 14, justifyContent: 'space-between' },
  featureCard: { minHeight: 158 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  index: ui.type.eyebrow,
  value: { fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.45, marginTop: 14 },
  label: { ...ui.type.caption, marginTop: 6 },
});
