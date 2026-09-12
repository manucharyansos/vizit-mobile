import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, PageHeader, PremiumButton, StateCard, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const definitions = {
  staff: { hy: 'Աշխատակիցներ և գրաֆիկ', ru: 'Сотрудники и график', en: 'Team and schedules', load: businessApi.staff },
  tasks: { hy: 'Առաջադրանքներ', ru: 'Задачи', en: 'Tasks', load: businessApi.tasks },
  analytics: { hy: 'Վերլուծություն', ru: 'Аналитика', en: 'Analytics', load: businessApi.analytics },
  'gift-cards': { hy: 'Նվեր քարտեր', ru: 'Подарочные карты', en: 'Gift cards', load: businessApi.giftCards },
  loyalty: { hy: 'Հավատարմություն', ru: 'Лояльность', en: 'Loyalty', load: businessApi.loyalty },
  growth: { hy: 'Սպասման ցուցակ', ru: 'Лист ожидания', en: 'Waitlist', load: businessApi.waitlist },
  billing: { hy: 'Պլան և վճարումներ', ru: 'Тариф и платежи', en: 'Plan and billing', load: businessApi.billing },
  telegram: { hy: 'Telegram ծանուցումներ', ru: 'Telegram-уведомления', en: 'Telegram notifications', load: businessApi.telegram },
} as const;
type ModuleKey = keyof typeof definitions;
const stringify = (value: unknown) => typeof value === 'boolean' ? (value ? '✓' : '—') : value == null ? '—' : String(value);
const rows = (data: unknown): [string, string][] => {
  if (Array.isArray(data)) return data.slice(0, 50).map((item, index): [string, string] => [String((item as Record<string, unknown>)?.name ?? (item as Record<string, unknown>)?.title ?? `#${index + 1}`), stringify((item as Record<string, unknown>)?.status ?? (item as Record<string, unknown>)?.email ?? '')]);
  if (!data || typeof data !== 'object') return [];
  const result: [string, string][] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) if (typeof child !== 'object') result.push([`${key} · ${childKey}`, stringify(child)]);
    } else if (typeof value !== 'object') result.push([key, stringify(value)]);
  }
  return result;
};
export default function BusinessModule() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const { locale, theme } = useApp();
  const key = module as ModuleKey;
  const definition = definitions[key];
  const query = useQuery<unknown>({ queryKey: ['business-module', key], queryFn: async () => definition ? await definition.load() : null, enabled: !!definition, retry: false });
  if (!definition) return null;
  const dataRows = rows(query.data);
  const failed = locale === 'hy' ? 'Չհաջողվեց բեռնել տվյալները' : locale === 'ru' ? 'Не удалось загрузить данные' : 'Could not load data';
  const retry = locale === 'hy' ? 'Կրկին փորձել' : locale === 'ru' ? 'Повторить' : 'Try again';
  const empty = locale === 'hy' ? 'Տվյալներ դեռ չկան' : locale === 'ru' ? 'Данных пока нет' : 'No data yet';
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><View style={styles.header}><PageHeader eyebrow="Vizit Pro" title={definition[locale]} onBack={() => safeBack('/(business)/more')} backLabel={definition[locale]} /></View>{query.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : query.isError ? <View style={styles.state}><StateCard title={failed} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={retry} tone="secondary" onPress={() => void query.refetch()} />} /></View> : dataRows.length ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Surface style={styles.table}>{dataRows.map(([label, value], index) => <View key={`${label}-${index}`}><View style={styles.row}><Text style={[styles.label, { color: theme.text }]}>{label.replaceAll('_', ' ')}</Text><Text style={[styles.value, { color: theme.muted }]}>{value}</Text></View>{index < dataRows.length - 1 ? <Divider /> : null}</View>)}</Surface></ScrollView> : <View style={styles.state}><StateCard title={empty} /></View>}</SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { padding: ui.screenGutter, paddingBottom: 0 },
  loader: { marginVertical: ui.spacing.xl },
  state: { padding: ui.screenGutter },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl },
  table: { paddingVertical: ui.spacing.xxs, paddingHorizontal: ui.spacing.md },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.md },
  label: { ...ui.type.body, flex: 1, fontWeight: '800', textTransform: 'capitalize' },
  value: { ...ui.type.caption, maxWidth: '46%', textAlign: 'right' },
});
