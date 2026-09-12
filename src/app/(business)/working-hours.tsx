import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, ScheduleDay } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const defaultDay = (weekday: number): ScheduleDay => ({ weekday, is_closed: weekday === 7, start: weekday === 7 ? null : '09:00', end: weekday === 7 ? null : '18:00', break_start: null, break_end: null });
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const normalizeTime = (value: string | null) => value?.slice(0, 5) ?? null;

const copy = {
  hy: {
    title: 'Աշխատանքային ժամեր', subtitle: 'Կարգավորեք բիզնեսի շաբաթական գրաֆիկը', open: 'Աշխատում է', closed: 'Փակ', from: 'Սկիզբ', to: 'Ավարտ', breakFrom: 'Դադարից', breakTo: 'Դադար մինչև', save: 'Պահպանել', saved: 'Գրաֆիկը պահպանված է', error: 'Չհաջողվեց պահպանել գրաֆիկը', loadError: 'Չհաջողվեց բեռնել գրաֆիկը', retry: 'Կրկին փորձել', invalid: 'Ժամերը գրեք HH:MM ձևաչափով, օրինակ՝ 09:00։',
    days: ['Երկուշաբթի', 'Երեքշաբթի', 'Չորեքշաբթի', 'Հինգշաբթի', 'Ուրբաթ', 'Շաբաթ', 'Կիրակի'],
  },
  ru: {
    title: 'Рабочие часы', subtitle: 'Настройте недельный график бизнеса', open: 'Работает', closed: 'Закрыто', from: 'Начало', to: 'Конец', breakFrom: 'Перерыв с', breakTo: 'Перерыв до', save: 'Сохранить', saved: 'График сохранён', error: 'Не удалось сохранить график', loadError: 'Не удалось загрузить график', retry: 'Повторить', invalid: 'Введите время в формате HH:MM, например 09:00.',
    days: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
  },
  en: {
    title: 'Working hours', subtitle: 'Set the weekly business schedule', open: 'Open', closed: 'Closed', from: 'Start', to: 'End', breakFrom: 'Break from', breakTo: 'Break to', save: 'Save', saved: 'Schedule saved', error: 'Could not save schedule', loadError: 'Could not load schedule', retry: 'Try again', invalid: 'Enter times as HH:MM, for example 09:00.',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
};

function completeWeek(input: ScheduleDay[] | undefined): ScheduleDay[] {
  const byDay = new Map((input ?? []).map((day) => [Number(day.weekday), day]));
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = index + 1;
    const existing = byDay.get(weekday);
    if (!existing) return defaultDay(weekday);
    return {
      weekday,
      is_closed: !!existing.is_closed,
      start: normalizeTime(existing.start),
      end: normalizeTime(existing.end),
      break_start: normalizeTime(existing.break_start),
      break_end: normalizeTime(existing.break_end),
    };
  });
}

export default function WorkingHoursScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['business-schedule'], queryFn: businessApi.schedule, retry: false });
  const [edits, setEdits] = useState<Record<number, Partial<ScheduleDay>>>({});

  const baseDays = useMemo(() => query.isSuccess ? completeWeek(query.data) : completeWeek(undefined), [query.data, query.isSuccess]);
  const days = useMemo(() => baseDays.map((day) => ({ ...day, ...(edits[day.weekday] ?? {}) })), [baseDays, edits]);

  const valid = useMemo(() => days.every((day) => {
    if (day.is_closed) return true;
    if (!day.start || !day.end || !timePattern.test(day.start) || !timePattern.test(day.end) || day.end <= day.start) return false;
    const breaks = [day.break_start, day.break_end].filter(Boolean) as string[];
    if (breaks.length === 0) return true;
    return breaks.length === 2
      && breaks.every((time) => timePattern.test(time))
      && String(day.break_start) < String(day.break_end)
      && String(day.break_start) >= String(day.start)
      && String(day.break_end) <= String(day.end);
  }), [days]);

  const updateDay = (weekday: number, patch: Partial<ScheduleDay>) => setEdits((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? {}), ...patch } }));
  const save = useMutation({
    mutationFn: () => businessApi.updateSchedule(days.map((day) => ({ ...day, start: day.is_closed ? null : day.start, end: day.is_closed ? null : day.end, break_start: day.is_closed ? null : day.break_start, break_end: day.is_closed ? null : day.break_end }))),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['business-schedule'] }),
        cache.invalidateQueries({ queryKey: ['business-onboarding'] }),
        cache.invalidateQueries({ queryKey: ['business-availability'] }),
      ]);
      await Promise.all([
        cache.refetchQueries({ queryKey: ['business-schedule'], type: 'active' }),
        cache.refetchQueries({ queryKey: ['business-onboarding'], type: 'active' }),
      ]);
      setEdits({});
      Alert.alert(c.saved);
    },
    onError: (error) => Alert.alert(c.error, apiErrorMessage(error)),
  });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <PageHeader title={c.title} subtitle={c.subtitle} eyebrow="Vizit Pro" onBack={() => safeBack('/(business)/more')} backLabel={c.title} />

      {query.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}
      {query.isError ? <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void query.refetch()} />} /> : null}

      {!query.isLoading && !query.isError ? days.map((day, index) => <Surface key={day.weekday} style={[styles.card, day.is_closed && { backgroundColor: theme.surface }]}>
        <View style={styles.dayHeader}><View style={styles.dayIdentity}><View style={[styles.dayIndex, { backgroundColor: day.is_closed ? theme.surfaceRaised : theme.accentSoft }]}><Text style={[styles.dayIndexText, { color: day.is_closed ? theme.muted : theme.accentText }]}>{index + 1}</Text></View><View style={styles.flex}><Text style={[styles.dayName, { color: theme.text }]}>{c.days[index]}</Text><StatusPill label={day.is_closed ? c.closed : c.open} tone={day.is_closed ? 'neutral' : 'success'} /></View></View><Switch value={!day.is_closed} onValueChange={(open) => updateDay(day.weekday, { is_closed: !open, start: open ? (day.start ?? '09:00') : null, end: open ? (day.end ?? '18:00') : null, break_start: open ? day.break_start : null, break_end: open ? day.break_end : null })} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceElevated} /></View>
        {!day.is_closed ? <>
          <View style={styles.row}><TimeField label={c.from} value={day.start ?? ''} onChange={(start) => updateDay(day.weekday, { start })} /><TimeField label={c.to} value={day.end ?? ''} onChange={(end) => updateDay(day.weekday, { end })} /></View>
          <View style={styles.row}><TimeField label={c.breakFrom} value={day.break_start ?? ''} onChange={(break_start) => updateDay(day.weekday, { break_start: break_start || null })} optional /><TimeField label={c.breakTo} value={day.break_end ?? ''} onChange={(break_end) => updateDay(day.weekday, { break_end: break_end || null })} optional /></View>
        </> : null}
      </Surface>) : null}

      {!valid ? <Surface style={[styles.validationCard, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}><Text style={[styles.validation, { color: theme.danger }]}>{c.invalid}</Text></Surface> : null}
      {!query.isError ? <PremiumButton title={c.save} loading={save.isPending} disabled={!valid} onPress={() => save.mutate()} icon={{ ios: 'checkmark', android: 'check' }} /> : null}
    </ScrollView>
  </SafeAreaView>;

  function TimeField({ label, value, onChange, optional = false }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
    return <View style={styles.fieldWrap}><Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text><TextInput value={value} onChangeText={(text) => onChange(text.replace(/[^0-9:]/g, '').slice(0, 5))} placeholder={optional ? '—' : '09:00'} placeholderTextColor={theme.faint} selectionColor={theme.accent} keyboardType="numbers-and-punctuation" maxLength={5} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} /></View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.sm },
  loader: { marginVertical: ui.spacing.md },
  card: { padding: ui.spacing.sm, gap: ui.spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center' },
  dayIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  dayIndex: { width: 38, height: 38, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center' },
  dayIndexText: { fontSize: 13, fontWeight: '900' },
  flex: { flex: 1, alignItems: 'flex-start', gap: 4 },
  dayName: ui.type.cardTitle,
  row: { flexDirection: 'row', gap: 8 },
  fieldWrap: { flex: 1, gap: 5 },
  label: ui.type.caption,
  input: { height: 46, borderWidth: 1, borderRadius: ui.radius.small, paddingHorizontal: 11, fontSize: 15, fontWeight: '700' },
  validationCard: { minHeight: 0, padding: ui.spacing.sm },
  validation: ui.type.caption,
});
