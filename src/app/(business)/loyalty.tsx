import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: ['Հավատարմություն', 'Միացնել միավորների ծրագիրը', 'Մասնակիցներ', 'Չօգտագործված միավորներ', 'Ընդհանուր վաստակած', '30 օրում ժամկետանց', 'Չհաջողվեց', 'Չհաջողվեց բեռնել տվյալները', 'Կրկին փորձել'],
  ru: ['Лояльность', 'Включить программу баллов', 'Участники', 'Доступные баллы', 'Всего начислено', 'Истекают за 30 дней', 'Не удалось', 'Не удалось загрузить данные', 'Повторить'],
  en: ['Loyalty', 'Enable points program', 'Members', 'Outstanding points', 'Lifetime earned', 'Expiring in 30 days', 'Action failed', 'Could not load data', 'Try again'],
};

const numberValue = (root: Record<string, unknown>, key: string, fallback = 0) => {
  const value = Number(root[key]);
  return Number.isFinite(value) ? value : fallback;
};

export default function LoyaltyScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const summary = useQuery({ queryKey: ['loyalty-summary'], queryFn: businessApi.loyalty, retry: false, refetchOnMount: 'always' });
  const program = useQuery({ queryKey: ['loyalty-program'], queryFn: businessApi.loyaltyProgram, retry: false, refetchOnMount: 'always' });

  const toggle = useMutation({
    mutationFn: (is_enabled: boolean) => {
      const current = (program.data ?? {}) as Record<string, unknown>;
      return businessApi.updateLoyaltyProgram({
        is_enabled,
        currency_unit: numberValue(current, 'currency_unit', 100),
        points_per_currency_unit: numberValue(current, 'points_per_currency_unit', 1),
        redeem_points_step: numberValue(current, 'redeem_points_step', 100),
        redeem_currency_amount: numberValue(current, 'redeem_currency_amount', 100),
        max_redeem_percent: numberValue(current, 'max_redeem_percent', 50),
        allow_gift_card_with_points: Boolean(current.allow_gift_card_with_points),
        points_expire_after_days: numberValue(current, 'points_expire_after_days'),
        min_booking_amount: numberValue(current, 'min_booking_amount'),
        notes: typeof current.notes === 'string' ? current.notes : null,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['loyalty-program'] });
      await cache.refetchQueries({ queryKey: ['loyalty-program'], type: 'active' });
    },
    onError: (e) => Alert.alert(c[6], apiErrorMessage(e)),
  });

  const failed = summary.isError || program.isError;
  const data = summary.data as Record<string, unknown> | undefined;
  const items: [string, unknown][] = [[c[2], data?.members], [c[3], data?.outstanding_points], [c[4], data?.lifetime_earned], [c[5], data?.expiring_in_30_days]];
  const retry = () => void Promise.all([summary.refetch(), program.refetch()]);

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text>{failed ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c[7]}</Text><Pressable onPress={retry}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c[8]}</Text></Pressable></View> : null}<View style={[styles.toggle, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.toggleText, { color: theme.text }]}>{c[1]}</Text>{program.isLoading || toggle.isPending ? <ActivityIndicator color={theme.plum} /> : <Switch disabled={!program.data} value={Boolean((program.data as Record<string, unknown> | undefined)?.is_enabled)} onValueChange={(value) => toggle.mutate(value)} trackColor={{ false: theme.border, true: theme.plum }} />}</View>{summary.isLoading ? <ActivityIndicator color={theme.plum} /> : !summary.isError ? <View style={styles.grid}>{items.map(([label, value]) => <View key={label} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.value, { color: theme.plum }]}>{String(value ?? 0)}</Text><Text style={{ color: theme.muted, fontWeight: '700' }}>{label}</Text></View>)}</View> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, gap: 14 }, title: { fontSize: 28, fontWeight: '900' }, toggle: { minHeight: 68, borderWidth: 1, borderRadius: 11, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, toggleText: { flex: 1, fontWeight: '800' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, card: { width: '48%', minHeight: 110, borderWidth: 1, borderRadius: 11, padding: 14, justifyContent: 'space-between' }, value: { fontSize: 24, fontWeight: '900' }, error: { borderWidth: 1, borderRadius: 9, padding: 13, gap: 7 } });