import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, StateCard, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { APP_TIME_ZONE, localDateKey } from '@/services/date-time';

const copy = {
  hy: ['Գլխավոր', 'Բիզնեսի ընդհանուր պատկերը', 'Այսօր', 'Ամրագրումներ', 'Հաճախորդներ', 'Աշխատակիցներ', 'Ծառայություններ', 'Չհաջողվեց բեռնել տվյալները', 'Կրկին փորձել', 'Նոր ամրագրում'],
  ru: ['Главная', 'Обзор бизнеса', 'Сегодня', 'Записи', 'Клиенты', 'Сотрудники', 'Услуги', 'Не удалось загрузить данные', 'Повторить', 'Новая запись'],
  en: ['Dashboard', 'Business overview', 'Today', 'Bookings', 'Clients', 'Team', 'Services', 'Could not load dashboard', 'Try again', 'New booking'],
};

function readNumber(root: Record<string, unknown>, path: string): number | null {
  const value = path.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, root);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function BusinessDashboard() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const query = useQuery<Record<string, unknown>>({ queryKey: ['business-dashboard'], queryFn: businessApi.dashboard, retry: false, refetchOnMount: 'always', staleTime: 0 });
  const clients = useQuery({ queryKey: ['business-clients'], queryFn: businessApi.clients, retry: false, refetchOnMount: 'always', staleTime: 0 });
  const date = localDateKey();
  const dateLabel = new Intl.DateTimeFormat(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: APP_TIME_ZONE }).format(new Date(`${date}T12:00:00+04:00`));
  const data = query.data;
  const dashboardClientCount = data ? readNumber(data, 'counts.clients') : null;
  const clientCount = clients.data ? clients.data.length : dashboardClientCount;
  const cards = data ? [
    { label: c[3], value: readNumber(data, 'today.total'), icon: 'calendar_month' as const, ios: 'calendar' as const },
    { label: c[4], value: clientCount, icon: 'group' as const, ios: 'person.2.fill' as const },
    { label: c[5], value: readNumber(data, 'counts.staff'), icon: 'badge' as const, ios: 'person.crop.rectangle.stack.fill' as const },
    { label: c[6], value: readNumber(data, 'counts.services'), icon: 'grid_view' as const, ios: 'square.grid.2x2.fill' as const },
  ] : [];
  const retryAll = () => void Promise.all([query.refetch(), clients.refetch()]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Vizit Business"
          title={c[0]}
          subtitle={c[1]}
          action={<IconButton accessibilityLabel={c[9]} ios="plus" android="add" onPress={() => router.push('/(business)/new-booking' as never)} tone="primary" />}
        />

        <Surface style={[styles.todayStrip, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          <View style={[styles.todayIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}><VizitIcon ios="calendar" android="calendar_month" color={theme.onPrimary} size={23} /></View>
          <View style={styles.todayCopy}><Text style={[styles.todayLabel, { color: theme.onPrimary }]}>{c[2]}</Text><Text style={[styles.todayDate, { color: theme.onPrimary }]}>{dateLabel}</Text></View>
          <VizitIcon ios="arrow.up.right" android="north_east" color={theme.onPrimary} size={20} />
        </Surface>

        {query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
          <StateCard title={c[7]} message={apiErrorMessage(query.error)} tone="danger" icon={{ ios: 'exclamationmark.triangle.fill', android: 'error_outline' }} action={<PremiumButton title={c[8]} onPress={retryAll} tone="secondary" />} />
        ) : (
          <View style={styles.grid}>
            {cards.map(({ label, value, icon, ios }, index) => (
              <Surface key={label} style={styles.card} elevated>
                <View style={styles.metricTop}>
                  <View style={[styles.metricIcon, { backgroundColor: index === 0 ? theme.accentSoft : theme.accentSubtle }]}><VizitIcon ios={ios} android={icon} color={theme.accentText} size={20} /></View>
                  <Text style={[styles.metricIndex, { color: theme.faint }]}>0{index + 1}</Text>
                </View>
                <Text style={[styles.value, { color: theme.text }]}>{value == null ? '—' : value.toLocaleString()}</Text>
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
  content: { padding: ui.screenGutter, gap: 20, paddingBottom: 34 },
  todayStrip: { minHeight: 94, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todayCopy: { flex: 1 },
  todayLabel: { ...ui.type.eyebrow, opacity: 0.72 },
  todayDate: { fontSize: 17, lineHeight: 22, fontWeight: '800', marginTop: 5, textTransform: 'capitalize' },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { flexBasis: '47%', flexGrow: 1, minHeight: 150, padding: 15, justifyContent: 'space-between' },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricIndex: { ...ui.type.eyebrow },
  value: { fontSize: 29, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, marginTop: 14 },
  label: { ...ui.type.caption, marginTop: 5 },
});
