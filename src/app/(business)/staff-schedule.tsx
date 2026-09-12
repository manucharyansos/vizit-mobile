import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, ScheduleDay } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const names = { hy: ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'], ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
const copy = {
  hy: { title: 'Աշխատանքային գրաֆիկ', open: 'Աշխատում է', closed: 'Փակ', save: 'Պահպանել գրաֆիկը', saved: 'Գրաֆիկը պահպանված է', error: 'Չհաջողվեց պահպանել', loadError: 'Չհաջողվեց բեռնել աշխատակցի իրական գրաֆիկը', retry: 'Կրկին փորձել' },
  ru: { title: 'Рабочий график', open: 'Работает', closed: 'Выходной', save: 'Сохранить график', saved: 'График сохранён', error: 'Не удалось сохранить', loadError: 'Не удалось загрузить реальный график сотрудника', retry: 'Повторить' },
  en: { title: 'Working schedule', open: 'Working', closed: 'Closed', save: 'Save schedule', saved: 'Schedule saved', error: 'Could not save', loadError: 'Could not load the team member schedule', retry: 'Try again' },
};
const defaults = (): ScheduleDay[] => Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, is_closed: i > 4, start: '09:00', end: '18:00', break_start: null, break_end: null }));

export default function StaffSchedule() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const staffId = Number(id);
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [edits, setEdits] = useState<Record<number, Partial<ScheduleDay>>>({});
  const query = useQuery({ queryKey: ['staff-schedule', staffId], queryFn: () => businessApi.staffSchedule(staffId), enabled: Number.isInteger(staffId) && staffId > 0, retry: false, refetchOnMount: 'always' });

  const baseDays = useMemo(() => {
    if (!query.isSuccess) return [];
    const remote = Array.isArray(query.data?.days) ? query.data.days : [];
    return remote.length ? defaults().map((fallback) => remote.find((item) => item.weekday === fallback.weekday) ?? fallback) : defaults();
  }, [query.data, query.isSuccess]);
  const days = useMemo(() => baseDays.map((day) => ({ ...day, ...(edits[day.weekday] ?? {}) })), [baseDays, edits]);
  const update = (weekday: number, patch: Partial<ScheduleDay>) => setEdits((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? {}), ...patch } }));
  const valid = days.length === 7 && days.every((day) => day.is_closed || (/^\d{2}:\d{2}$/.test(day.start ?? '') && /^\d{2}:\d{2}$/.test(day.end ?? '') && String(day.end) > String(day.start)));
  const save = useMutation({
    mutationFn: () => businessApi.updateStaffSchedule(staffId, days),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['staff-schedule', staffId] });
      await cache.refetchQueries({ queryKey: ['staff-schedule', staffId], type: 'active' });
      await cache.invalidateQueries({ queryKey: ['calendar'] });
      setEdits({});
      Alert.alert(c.saved);
    },
    onError: (error) => Alert.alert(c.error, apiErrorMessage(error)),
  });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={styles.header}><PageHeader title={c.title} subtitle={name} eyebrow="Vizit Pro" onBack={() => safeBack('/(business)/staff')} backLabel={c.title} /></View>
    {query.isLoading ? <View style={styles.center}><ActivityIndicator color={theme.accent} /></View> : query.isError ? <View style={styles.stateWrap}><StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void query.refetch()} />} /></View> : <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{days.map((day) => <Surface key={day.weekday} style={[styles.day, day.is_closed && { backgroundColor: theme.surface }]}><View style={styles.dayTop}><View style={styles.dayTitle}><View style={[styles.dayBadge, { backgroundColor: day.is_closed ? theme.surfaceRaised : theme.accentSoft }]}><Text style={[styles.dayBadgeText, { color: day.is_closed ? theme.muted : theme.accentText }]}>{day.weekday}</Text></View><Text style={[styles.dayName, { color: theme.text }]}>{names[locale][day.weekday - 1]}</Text></View><View style={styles.closed}><StatusPill label={day.is_closed ? c.closed : c.open} tone={day.is_closed ? 'neutral' : 'success'} /><Switch value={day.is_closed} onValueChange={(is_closed) => update(day.weekday, { is_closed })} trackColor={{ false: theme.accent, true: theme.borderStrong }} thumbColor={theme.surfaceElevated} /></View></View>{!day.is_closed && <View style={styles.times}><TextInput value={day.start ?? ''} onChangeText={(start) => update(day.weekday, { start: start.replace(/[^0-9:]/g, '').slice(0, 5) })} placeholder="09:00" placeholderTextColor={theme.faint} selectionColor={theme.accent} maxLength={5} keyboardType="numbers-and-punctuation" style={[styles.time, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} /><Text style={{ color: theme.faint }}>—</Text><TextInput value={day.end ?? ''} onChangeText={(end) => update(day.weekday, { end: end.replace(/[^0-9:]/g, '').slice(0, 5) })} placeholder="18:00" placeholderTextColor={theme.faint} selectionColor={theme.accent} maxLength={5} keyboardType="numbers-and-punctuation" style={[styles.time, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} /></View>}</Surface>)}<PremiumButton title={c.save} loading={save.isPending} disabled={!valid} onPress={() => save.mutate()} icon={{ ios: 'checkmark', android: 'check' }} /></ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: ui.screenGutter, paddingTop: ui.spacing.xs },
  stateWrap: { padding: ui.screenGutter },
  content: { padding: ui.screenGutter, gap: ui.spacing.sm, paddingBottom: ui.spacing.xxl },
  day: { padding: ui.spacing.sm, gap: ui.spacing.sm },
  dayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ui.spacing.sm },
  dayTitle: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  dayBadge: { width: 36, height: 36, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 12, fontWeight: '900' },
  dayName: ui.type.cardTitle,
  closed: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.xs },
  times: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.xs },
  time: { flex: 1, height: 46, borderWidth: 1, borderRadius: ui.radius.small, textAlign: 'center', fontSize: 15, fontWeight: '800' },
});
