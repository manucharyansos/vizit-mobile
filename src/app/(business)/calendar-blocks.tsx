import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { calendarBlocksApi } from '@/services/api/calendar-blocks';

const localDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const copy = {
  hy: { title: 'Փակ ժամեր', subtitle: 'Արգելափակեք ընդմիջումները, արձակուրդները կամ անհասանելի ժամերը', add: 'Նոր փակ ժամանակ', start: 'Սկիզբ՝ YYYY-MM-DD HH:MM', end: 'Ավարտ՝ YYYY-MM-DD HH:MM', reason: 'Պատճառ', all: 'Ամբողջ բիզնեսը', staff: 'Աշխատակից', save: 'Պահպանել', cancel: 'Չեղարկել', remove: 'Ջնջել', empty: 'Փակ ժամանակահատվածներ չկան', failed: 'Գործողությունը չհաջողվեց', retry: 'Կրկին փորձել' },
  ru: { title: 'Заблокированное время', subtitle: 'Закрывайте перерывы, отпуска и недоступные интервалы', add: 'Новый блок', start: 'Начало: YYYY-MM-DD HH:MM', end: 'Конец: YYYY-MM-DD HH:MM', reason: 'Причина', all: 'Весь бизнес', staff: 'Сотрудник', save: 'Сохранить', cancel: 'Отмена', remove: 'Удалить', empty: 'Заблокированных интервалов нет', failed: 'Не удалось выполнить действие', retry: 'Повторить' },
  en: { title: 'Blocked time', subtitle: 'Block breaks, leave, or unavailable periods', add: 'New block', start: 'Start: YYYY-MM-DD HH:MM', end: 'End: YYYY-MM-DD HH:MM', reason: 'Reason', all: 'Whole business', staff: 'Team member', save: 'Save', cancel: 'Cancel', remove: 'Delete', empty: 'No blocked periods', failed: 'Action failed', retry: 'Try again' },
};

export default function CalendarBlocksScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const from = localDate(-1);
  const to = localDate(60);
  const blocks = useQuery({ queryKey: ['calendar-blocks', from, to], queryFn: () => calendarBlocksApi.list(from, to), retry: false });
  const staff = useQuery({ queryKey: ['business-staff'], queryFn: businessApi.staff, retry: false });
  const [showForm, setShowForm] = useState(false);
  const [staffId, setStaffId] = useState<number>();
  const [form, setForm] = useState({ starts_at: `${localDate()} 13:00`, ends_at: `${localDate()} 14:00`, reason: '' });
  const staffNameById = useMemo(() => new Map((staff.data ?? []).map((item) => [item.id, item.name])), [staff.data]);
  const fail = (error: unknown) => Alert.alert(c.failed, apiErrorMessage(error));
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['calendar-blocks'] }),
      cache.invalidateQueries({ queryKey: ['calendar'] }),
    ]);
    await cache.refetchQueries({ queryKey: ['calendar-blocks', from, to], type: 'active' });
  };
  const create = useMutation({
    mutationFn: () => calendarBlocksApi.create({ ...form, reason: form.reason.trim() || undefined, staff_id: staffId }),
    onSuccess: async () => { setShowForm(false); setStaffId(undefined); setForm({ starts_at: `${localDate()} 13:00`, ends_at: `${localDate()} 14:00`, reason: '' }); await refresh(); },
    onError: fail,
  });
  const remove = useMutation({ mutationFn: calendarBlocksApi.remove, onSuccess: refresh, onError: fail });
  const valid = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(form.starts_at) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(form.ends_at) && form.ends_at > form.starts_at;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="arrow_back" color={theme.text} size={21} /></Pressable><View style={styles.flex}><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text></View><Pressable onPress={() => setShowForm((value) => !value)} style={[styles.addIcon, { backgroundColor: theme.plum }]}><VizitIcon ios={showForm ? 'xmark' : 'plus'} android={showForm ? 'close' : 'add'} color="#FFF" size={21} /></Pressable></View>

      {showForm ? <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.plum }]}><Text style={[styles.cardTitle, { color: theme.text }]}>{c.add}</Text><Field value={form.starts_at} onChangeText={(starts_at) => setForm((value) => ({ ...value, starts_at }))} placeholder={c.start} /><Field value={form.ends_at} onChangeText={(ends_at) => setForm((value) => ({ ...value, ends_at }))} placeholder={c.end} /><Field value={form.reason} onChangeText={(reason) => setForm((value) => ({ ...value, reason }))} placeholder={c.reason} /><Text style={[styles.smallLabel, { color: theme.muted }]}>{c.staff}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><Pressable onPress={() => setStaffId(undefined)} style={[styles.chip, { borderColor: !staffId ? theme.plum : theme.border, backgroundColor: !staffId ? theme.plumSoft : theme.background }]}><Text style={{ color: !staffId ? theme.plum : theme.text, fontWeight: '800' }}>{c.all}</Text></Pressable>{staff.data?.filter((item) => item.is_active).map((item) => <Pressable key={item.id} onPress={() => setStaffId(item.id)} style={[styles.chip, { borderColor: staffId === item.id ? theme.plum : theme.border, backgroundColor: staffId === item.id ? theme.plumSoft : theme.background }]}><Text style={{ color: staffId === item.id ? theme.plum : theme.text, fontWeight: '800' }}>{item.name}</Text></Pressable>)}</ScrollView><View style={styles.actions}><Pressable onPress={() => setShowForm(false)} style={[styles.button, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800' }}>{c.cancel}</Text></Pressable><Pressable disabled={!valid || create.isPending} onPress={() => create.mutate()} style={[styles.button, { backgroundColor: theme.plum, borderColor: theme.plum, opacity: valid ? 1 : 0.4 }]}>{create.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable></View></View> : null}

      {blocks.isLoading ? <ActivityIndicator color={theme.plum} /> : blocks.isError ? <Pressable onPress={() => blocks.refetch()} style={[styles.error, { borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.failed}</Text><Text style={{ color: theme.plum, fontWeight: '900', marginTop: 4 }}>{c.retry}</Text></Pressable> : blocks.data?.length ? blocks.data.map((block) => <View key={block.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.row}><View style={styles.flex}><Text style={[styles.cardTitle, { color: theme.text }]}>{block.reason || c.title}</Text><Text style={{ color: theme.muted, marginTop: 4 }}>{block.starts_at.slice(0, 16)} → {block.ends_at.slice(0, 16)}</Text><Text style={{ color: theme.muted, marginTop: 3, fontSize: 12 }}>{block.staff_id ? staffNameById.get(block.staff_id) ?? `#${block.staff_id}` : c.all}</Text></View><Pressable onPress={() => Alert.alert(c.remove, '', [{ text: c.cancel, style: 'cancel' }, { text: c.remove, style: 'destructive', onPress: () => remove.mutate(block.id) }])} style={[styles.delete, { backgroundColor: theme.dangerSoft }]}><VizitIcon ios="trash" android="delete" color={theme.danger} size={18} /></Pressable></View></View>) : <Text style={{ color: theme.muted }}>{c.empty}</Text>}
    </ScrollView>
  </SafeAreaView>;

  function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />; }
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, paddingBottom: 44, gap: 10 }, header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 6 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, title: { fontSize: 25, fontWeight: '900' }, subtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 }, addIcon: { width: 42, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, card: { borderWidth: 1, borderRadius: 10, padding: 13, gap: 10 }, cardTitle: { fontSize: 16, fontWeight: '900' }, input: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }, smallLabel: { fontSize: 11, fontWeight: '800' }, chips: { gap: 7 }, chip: { minHeight: 39, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' }, actions: { flexDirection: 'row', gap: 8 }, button: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, white: { color: '#FFF', fontWeight: '900' }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, delete: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, error: { borderWidth: 1, borderRadius: 9, padding: 12 } });
