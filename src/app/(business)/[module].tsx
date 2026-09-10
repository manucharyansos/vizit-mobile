import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
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
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><View style={styles.header}><Pressable onPress={() => safeBack('/(business)/more')} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable><Text style={[styles.title, { color: theme.text }]}>{definition[locale]}</Text></View>{query.isLoading ? <ActivityIndicator color={theme.plum} /> : <ScrollView contentContainerStyle={styles.content}>{rows(query.data).map(([label, value], index) => <View key={`${label}-${index}`} style={[styles.row, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.label, { color: theme.text }]}>{label.replaceAll('_', ' ')}</Text><Text style={[styles.value, { color: theme.muted }]}>{value}</Text></View>)}</ScrollView>}</SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, header: { minHeight: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, fontSize: 21, fontWeight: '900' }, content: { padding: 16, gap: 8, paddingBottom: 35 }, row: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 5 }, label: { fontWeight: '800', textTransform: 'capitalize' }, value: { fontSize: 13 } });