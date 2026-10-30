import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, PremiumInput, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, type ServiceDiscountSettings } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

type Row = { count: string; percent: string };

const copy = {
  hy: { title: 'Զեղչեր', subtitle: 'Ընտրիր, թե որ զեղչն ես ուզում՝ մեկը, երկուսն էլ կամ ոչ մեկը, և ինքդ դիր քանակն ու տոկոսը։ Եթե երկուսն էլ կիրառելի են, գործում է մեծը։',
    visits: 'Կրկնվող հաճախորդների համար', visitsHelp: 'Քանի ավարտված այցից հետո ինչ զեղչ տալ։ Չեղարկված և չեկած այցերը չեն հաշվվում։', visitCount: 'Ավարտված այցեր',
    bundle: 'Մեկ այցում մի քանի ծառայություն', bundleHelp: 'Քանի ծառայություն միասին ամրագրելիս ինչ զեղչ տալ։', serviceCount: 'Ծառայություններ',
    percent: 'Զեղչ, %', add: 'Ավելացնել մակարդակ', remove: 'Հեռացնել', save: 'Պահպանել', saved: 'Զեղչերը պահպանված են', on: 'Միացված', off: 'Անջատված',
    offHelp: 'Հաճախորդները չեն տեսնի և չեն ստանա այս զեղչը։ Մակարդակները կպահպանվեն։', invalid: 'Միացված զեղչը պետք է ունենա առնվազն մեկ մակարդակ։ Քանակները չպետք է կրկնվեն, տոկոսը՝ 1-ից 90։',
    failed: 'Չհաջողվեց', loadFailed: 'Չհաջողվեց բեռնել զեղչերը', retry: 'Կրկին փորձել' },
  ru: { title: 'Скидки', subtitle: 'Выберите, какую скидку давать — одну, обе или ни одной, — и сами задайте количество и процент. Если подходят обе, действует большая.',
    visits: 'Для постоянных клиентов', visitsHelp: 'Какая скидка после скольких завершённых визитов. Отмены и неявки не считаются.', visitCount: 'Завершённых визитов',
    bundle: 'Несколько услуг за визит', bundleHelp: 'Какая скидка при записи на несколько услуг сразу.', serviceCount: 'Услуг',
    percent: 'Скидка, %', add: 'Добавить уровень', remove: 'Удалить', save: 'Сохранить', saved: 'Скидки сохранены', on: 'Включено', off: 'Выключено',
    offHelp: 'Клиенты не увидят и не получат эту скидку. Уровни сохранятся.', invalid: 'У включённой скидки должен быть хотя бы один уровень. Количества не должны повторяться, процент — от 1 до 90.',
    failed: 'Не удалось', loadFailed: 'Не удалось загрузить скидки', retry: 'Повторить' },
  en: { title: 'Discounts', subtitle: 'Choose which discount you want — one, both or none — and set the count and percent yourself. If both apply, the larger one is used.',
    visits: 'For returning clients', visitsHelp: 'Which discount after how many completed visits. Cancellations and no-shows do not count.', visitCount: 'Completed visits',
    bundle: 'Several services in one visit', bundleHelp: 'Which discount when several services are booked together.', serviceCount: 'Services',
    percent: 'Discount, %', add: 'Add level', remove: 'Remove', save: 'Save', saved: 'Discounts saved', on: 'On', off: 'Off',
    offHelp: 'Clients will not see or get this discount. Your levels are kept.', invalid: 'An enabled discount needs at least one level. Counts must not repeat and the percent must be 1–90.',
    failed: 'Action failed', loadFailed: 'Could not load discounts', retry: 'Try again' },
};

const isValidRow = (row: Row, min: number) => Number(row.count) >= min && Number(row.percent) >= 1 && Number(row.percent) <= 90;
const valid = (on: boolean, rows: Row[], min: number) => !on || (rows.length > 0 && rows.every((row) => isValidRow(row, min)) && new Set(rows.map((row) => Number(row.count))).size === rows.length);
// Levels of a switched-off type are kept, minus half-typed rows the server would reject.
const keep = (on: boolean, rows: Row[], min: number) => on ? rows : rows.filter((row, index) => isValidRow(row, min) && rows.findIndex((other) => Number(other.count) === Number(row.count)) === index);

export default function DiscountsScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const settings = useQuery({ queryKey: ['business-service-discounts'], queryFn: businessApi.serviceDiscounts, retry: false, refetchOnMount: 'always' });
  const [visitEdits, setVisitEdits] = useState<Row[]>();
  const [bundleEdits, setBundleEdits] = useState<Row[]>();
  const [visitOnEdit, setVisitOn] = useState<boolean>();
  const [bundleOnEdit, setBundleOn] = useState<boolean>();

  const data = settings.data;
  const visits = visitEdits ?? (data?.visit_tiers ?? []).map((tier) => ({ count: String(tier.min_visits), percent: String(tier.percent) }));
  const bundle = bundleEdits ?? (data?.bundle_tiers ?? []).map((tier) => ({ count: String(tier.min_services), percent: String(tier.percent) }));
  // A type without saved levels starts switched off, so a business opts in explicitly.
  const visitOn = visitOnEdit ?? Boolean(data?.visit_enabled !== false && data?.visit_tiers?.length);
  const bundleOn = bundleOnEdit ?? Boolean(data?.bundle_enabled !== false && data?.bundle_tiers?.length);
  const ok = valid(visitOn, visits, 1) && valid(bundleOn, bundle, 2);

  const save = useMutation({
    mutationFn: () => businessApi.saveServiceDiscounts({
      visit_enabled: visitOn,
      bundle_enabled: bundleOn,
      visit_tiers: keep(visitOn, visits, 1).map((row) => ({ min_visits: Number(row.count), percent: Number(row.percent) })),
      bundle_tiers: keep(bundleOn, bundle, 2).map((row) => ({ min_services: Number(row.count), percent: Number(row.percent) })),
    }),
    onSuccess: (saved: ServiceDiscountSettings) => {
      cache.setQueryData(['business-service-discounts'], saved);
      setVisitEdits(undefined); setBundleEdits(undefined); setVisitOn(undefined); setBundleOn(undefined);
      Alert.alert(c.saved);
    },
    onError: (error) => Alert.alert(c.failed, apiErrorMessage(error)),
  });

  const section = (title: string, help: string, countLabel: string, rows: Row[], setRows: (rows: Row[]) => void, on: boolean, setOn: (on: boolean) => void, first: Row) => (
    <Surface elevated style={styles.stack}>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <View style={styles.titleRow}><Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text><StatusPill label={on ? c.on : c.off} tone={on ? 'success' : 'neutral'} /></View>
          <Text style={[styles.caption, { color: theme.muted }]}>{help}</Text>
        </View>
        <Switch accessibilityLabel={title} value={on} onValueChange={(value) => { setOn(value); if (value && !rows.length) setRows([first]); }} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceElevated} />
      </View>
      {!on ? <Text style={[styles.caption, { color: theme.muted }]}>{c.offHelp}</Text> : <>
        {rows.map((row, index) => <View key={index} style={styles.row}>
          <View style={styles.flex}><PremiumInput label={countLabel} value={row.count} keyboardType="number-pad" maxLength={4} onChangeText={(text) => setRows(rows.map((item, n) => n === index ? { ...item, count: text.replace(/\D/g, '') } : item))} /></View>
          <View style={styles.flex}><PremiumInput label={c.percent} value={row.percent} keyboardType="number-pad" maxLength={2} onChangeText={(text) => setRows(rows.map((item, n) => n === index ? { ...item, percent: text.replace(/\D/g, '') } : item))} /></View>
          <PremiumButton title={c.remove} tone="danger" compact onPress={() => setRows(rows.filter((_, n) => n !== index))} />
        </View>)}
        <PremiumButton title={c.add} tone="secondary" disabled={rows.length >= 10} onPress={() => setRows([...rows, { count: String(rows.length ? Number(rows[rows.length - 1].count || 0) + 2 : Number(first.count)), percent: '5' }])} />
      </>}
    </Surface>
  );

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <PageHeader eyebrow="Vizit Pro" title={c.title} subtitle={c.subtitle} onBack={() => safeBack('/(business)/more')} backLabel={c.title} />
    {settings.isError ? <StateCard title={c.loadFailed} message={apiErrorMessage(settings.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void settings.refetch()} />} /> : null}
    {settings.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}
    {data ? <>
      {section(c.visits, c.visitsHelp, c.visitCount, visits, setVisitEdits, visitOn, setVisitOn, { count: '3', percent: '5' })}
      {section(c.bundle, c.bundleHelp, c.serviceCount, bundle, setBundleEdits, bundleOn, setBundleOn, { count: '2', percent: '10' })}
      {!ok ? <Text style={[styles.caption, { color: theme.danger }]}>{c.invalid}</Text> : null}
      <PremiumButton title={c.save} loading={save.isPending} disabled={!ok} onPress={() => save.mutate()} />
    </> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  stack: { gap: ui.spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: ui.spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: ui.spacing.xs },
  cardTitle: { ...ui.type.cardTitle, flexShrink: 1 },
  caption: { ...ui.type.caption, marginTop: 4 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  loader: { marginVertical: ui.spacing.lg },
});
