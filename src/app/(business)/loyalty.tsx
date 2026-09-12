import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: ['Հավատարմություն', 'Միացնել միավորների ծրագիրը', 'Մասնակիցներ', 'Չօգտագործված միավորներ', 'Ընդհանուր վաստակած', '30 օրում ժամկետանց', 'Չհաջողվեց', 'Չհաջողվեց բեռնել տվյալները', 'Կրկին փորձել', 'Միացված է', 'Անջատված է'],
  ru: ['Лояльность', 'Включить программу баллов', 'Участники', 'Доступные баллы', 'Всего начислено', 'Истекают за 30 дней', 'Не удалось', 'Не удалось загрузить данные', 'Повторить', 'Включено', 'Выключено'],
  en: ['Loyalty', 'Enable points program', 'Members', 'Outstanding points', 'Lifetime earned', 'Expiring in 30 days', 'Action failed', 'Could not load data', 'Try again', 'Enabled', 'Disabled'],
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

  const enabled = Boolean((program.data as Record<string, unknown> | undefined)?.is_enabled);

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow="Vizit Pro" title={c[0]} subtitle={c[1]} onBack={() => safeBack('/(business)/more')} backLabel={c[0]} />
    {failed ? <StateCard title={c[7]} message={apiErrorMessage(summary.error ?? program.error)} tone="danger" action={<PremiumButton title={c[8]} tone="secondary" onPress={retry} />} /> : null}
    {!failed ? <Surface elevated style={styles.toggle}>
      <View style={styles.toggleCopy}><View style={styles.toggleHeading}><Text style={[styles.toggleText, { color: theme.text }]}>{c[1]}</Text><StatusPill label={enabled ? c[9] : c[10]} tone={enabled ? 'success' : 'neutral'} /></View><Text style={[styles.helper, { color: theme.muted }]}>{c[0]} · Vizit</Text></View>
      {program.isLoading || toggle.isPending ? <ActivityIndicator color={theme.accent} /> : <Switch disabled={!program.data} value={enabled} onValueChange={(value) => toggle.mutate(value)} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceElevated} />}
    </Surface> : null}
    {summary.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : !summary.isError ? <View style={styles.grid}>{items.map(([label, value], index) => <Surface key={label} style={styles.card}><View style={[styles.index, { backgroundColor: index === 3 ? theme.warningSoft : theme.accentSubtle }]}><Text style={[styles.indexText, { color: index === 3 ? theme.warning : theme.accentText }]}>{String(index + 1).padStart(2, '0')}</Text></View><Text style={[styles.value, { color: theme.text }]}>{String(value ?? 0)}</Text><Text style={[styles.label, { color: theme.muted }]}>{label}</Text></Surface>)}</View> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  toggle: { minHeight: 86, padding: ui.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ui.spacing.sm },
  toggleCopy: { flex: 1 },
  toggleHeading: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.xs },
  toggleText: { ...ui.type.cardTitle, flexShrink: 1 },
  helper: { ...ui.type.caption, marginTop: 5 },
  loader: { marginVertical: ui.spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.sm },
  card: { flexBasis: '47%', flexGrow: 1, minHeight: 140, justifyContent: 'space-between' },
  index: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  indexText: { fontSize: 10, fontWeight: '900' },
  value: { fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  label: { ...ui.type.caption, minHeight: 34 },
});
