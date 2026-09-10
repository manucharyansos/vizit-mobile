import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi, ScheduleDay } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const names = { hy: ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'], ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
const copy = {
  hy: { title: 'Աշխատանքային գրաֆիկ', closed: 'Փակ', save: 'Պահպանել գրաֆիկը', saved: 'Գրաֆիկը պահպանված է', error: 'Չհաջողվեց պահպանել', loadError: 'Չհաջողվեց բեռնել աշխատակցի իրական գրաֆիկը', retry: 'Կրկին փորձել' },
  ru: { title: 'Рабочий график', closed: 'Выходной', save: 'Сохранить график', saved: 'График сохранён', error: 'Не удалось сохранить', loadError: 'Не удалось загрузить реальный график сотрудника', retry: 'Повторить' },
  en: { title: 'Working schedule', closed: 'Closed', save: 'Save schedule', saved: 'Schedule saved', error: 'Could not save', loadError: 'Could not load the team member schedule', retry: 'Try again' },
};
const defaults = (): ScheduleDay[] => Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, is_closed: i > 4, start: '09:00', end: '18:00', break_start: null, break_end: null }));

export default function StaffSchedule() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const staffId = Number(id);
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const query = useQuery({ queryKey: ['staff-schedule', staffId], queryFn: () => businessApi.staffSchedule(staffId), enabled: Number.isInteger(staffId) && staffId > 0, retry: false, refetchOnMount: 'always' });

  useEffect(() => {
    if (!query.isSuccess) return;
    const remote = Array.isArray(query.data?.days) ? query.data.days : [];
    setDays(remote.length ? defaults().map((fallback) => remote.find((item) => item.weekday === fallback.weekday) ?? fallback) : defaults());
  }, [query.data, query.isSuccess]);

  const update = (weekday: number, patch: Partial<ScheduleDay>) => setDays((current) => current.map((day) => day.weekday === weekday ? { ...day, ...patch } : day));
  const valid = days.length === 7 && days.every((day) => day.is_closed || (/^\d{2}:\d{2}$/.test(day.start ?? '') && /^\d{2}:\d{2}$/.test(day.end ?? '') && String(day.end) > String(day.start)));
  const save = useMutation({
    mutationFn: () => businessApi.updateStaffSchedule(staffId, days),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ['staff-schedule', staffId] }); await cache.invalidateQueries({ queryKey: ['calendar'] }); Alert.alert(c.saved); },
    onError: (error) => Alert.alert(c.error, apiErrorMessage(error)),
  });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><View style={styles.header}><Pressable onPress={() => safeBack('/(business)/staff')} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable><View style={{ flex: 1 }}><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Text numberOfLines={1} style={{ color: theme.muted }}>{name}</Text></View></View>{query.isLoading ? <View style={styles.center}><ActivityIndicator color={theme.plum} /></View> : query.isError ? <View style={styles.center}><VizitIcon ios="exclamationmark.triangle.fill" android="error_outline" color={theme.danger} size={30} /><Text style={[styles.errorTitle, { color: theme.text }]}>{c.loadError}</Text><Text style={[styles.errorText, { color: theme.muted }]}>{apiErrorMessage(query.error)}</Text><Pressable onPress={() => query.refetch()} style={[styles.retry, { backgroundColor: theme.plum }]}><Text style={styles.white}>{c.retry}</Text></Pressable></View> : <ScrollView contentContainerStyle={styles.content}>{days.map((day) => <View key={day.weekday} style={[styles.day, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.dayTop}><Text style={[styles.dayName, { color: theme.text }]}>{names[locale][day.weekday - 1]}</Text><View style={styles.closed}><Text style={{ color: theme.muted }}>{c.closed}</Text><Switch value={day.is_closed} onValueChange={(is_closed) => update(day.weekday, { is_closed })} trackColor={{ false: theme.border, true: theme.plum }} /></View></View>{!day.is_closed && <View style={styles.times}><TextInput value={day.start ?? ''} onChangeText={(start) => update(day.weekday, { start })} placeholder="09:00" keyboardType="numbers-and-punctuation" style={[styles.time, { color: theme.text, borderColor: theme.border }]} /><Text style={{ color: theme.muted }}>—</Text><TextInput value={day.end ?? ''} onChangeText={(end) => update(day.weekday, { end })} placeholder="18:00" keyboardType="numbers-and-punctuation" style={[styles.time, { color: theme.text, borderColor: theme.border }]} /></View>}</View>)}<Pressable disabled={!valid || save.isPending} onPress={() => save.mutate()} style={[styles.save, { backgroundColor: theme.plum, opacity: valid ? 1 : 0.4 }]}>{save.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable></ScrollView>}</SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, header: { minHeight: 74, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 20, fontWeight: '900' }, content: { padding: 16, gap: 9, paddingBottom: 35 }, day: { borderWidth: 1, borderRadius: 11, padding: 13, gap: 10 }, dayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dayName: { fontSize: 16, fontWeight: '900' }, closed: { flexDirection: 'row', alignItems: 'center', gap: 8 }, times: { flexDirection: 'row', alignItems: 'center', gap: 8 }, time: { flex: 1, height: 45, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontWeight: '800' }, save: { height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, white: { color: '#FFF', fontWeight: '900' }, errorTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' }, errorText: { textAlign: 'center', fontSize: 12 }, retry: { minHeight: 48, paddingHorizontal: 22, borderRadius: 9, justifyContent: 'center' } });