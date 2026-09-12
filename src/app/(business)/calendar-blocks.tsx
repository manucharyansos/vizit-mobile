import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { calendarBlocksApi } from '@/services/api/calendar-blocks';
import { safeBack } from '@/services/navigation';

const localDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const copy = {
  hy: { title: 'Փակ ժամեր', subtitle: 'Արգելափակեք ընդմիջումները, արձակուրդները կամ անհասանելի ժամերը', add: 'Նոր փակ ժամանակ', start: 'Սկիզբ', startHint: 'YYYY-MM-DD HH:MM', end: 'Ավարտ', endHint: 'YYYY-MM-DD HH:MM', reason: 'Պատճառ', all: 'Ամբողջ բիզնեսը', staff: 'Աշխատակից', save: 'Պահպանել', cancel: 'Չեղարկել', remove: 'Ջնջել', empty: 'Փակ ժամանակահատվածներ չկան', emptyHint: 'Նոր արգելափակում ավելացրեք, երբ թիմը կամ բիզնեսը հասանելի չէ։', failed: 'Գործողությունը չհաջողվեց', retry: 'Կրկին փորձել' },
  ru: { title: 'Заблокированное время', subtitle: 'Закрывайте перерывы, отпуска и недоступные интервалы', add: 'Новый блок', start: 'Начало', startHint: 'ГГГГ-ММ-ДД ЧЧ:ММ', end: 'Окончание', endHint: 'ГГГГ-ММ-ДД ЧЧ:ММ', reason: 'Причина', all: 'Весь бизнес', staff: 'Сотрудник', save: 'Сохранить', cancel: 'Отмена', remove: 'Удалить', empty: 'Заблокированных интервалов нет', emptyHint: 'Добавьте блок, когда сотрудник или весь бизнес недоступен.', failed: 'Не удалось выполнить действие', retry: 'Повторить' },
  en: { title: 'Blocked time', subtitle: 'Block breaks, leave, or unavailable periods', add: 'New block', start: 'Starts', startHint: 'YYYY-MM-DD HH:MM', end: 'Ends', endHint: 'YYYY-MM-DD HH:MM', reason: 'Reason', all: 'Whole business', staff: 'Team member', save: 'Save', cancel: 'Cancel', remove: 'Delete', empty: 'No blocked periods', emptyHint: 'Add a block when a team member or the whole business is unavailable.', failed: 'Action failed', retry: 'Try again' },
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
    onSuccess: async () => {
      setShowForm(false);
      setStaffId(undefined);
      setForm({ starts_at: `${localDate()} 13:00`, ends_at: `${localDate()} 14:00`, reason: '' });
      await refresh();
    },
    onError: fail,
  });
  const remove = useMutation({ mutationFn: calendarBlocksApi.remove, onSuccess: refresh, onError: fail });
  const valid = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(form.starts_at) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(form.ends_at) && form.ends_at > form.starts_at;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Vizit Pro"
          title={c.title}
          subtitle={c.subtitle}
          onBack={() => safeBack('/(business)/more')}
          backLabel={c.title}
          action={<IconButton ios={showForm ? 'xmark' : 'plus'} android={showForm ? 'close' : 'add'} accessibilityLabel={showForm ? c.cancel : c.add} tone={showForm ? 'neutral' : 'primary'} onPress={() => setShowForm((value) => !value)} />}
        />

        {showForm ? <Surface elevated style={styles.formCard}>
          <SectionHeader title={c.add} detail={c.subtitle} />
          <PremiumInput label={c.start} value={form.starts_at} onChangeText={(starts_at) => setForm((value) => ({ ...value, starts_at }))} placeholder={c.startHint} maxLength={16} icon={{ ios: 'calendar', android: 'event' }} />
          <PremiumInput label={c.end} value={form.ends_at} onChangeText={(ends_at) => setForm((value) => ({ ...value, ends_at }))} placeholder={c.endHint} maxLength={16} icon={{ ios: 'clock', android: 'schedule' }} />
          <PremiumInput label={c.reason} value={form.reason} onChangeText={(reason) => setForm((value) => ({ ...value, reason }))} placeholder={c.reason} icon={{ ios: 'note.text', android: 'notes' }} />
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{c.staff}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <ScopeChip selected={!staffId} label={c.all} onPress={() => setStaffId(undefined)} />
            {staff.data?.filter((item) => item.is_active).map((item) => <ScopeChip key={item.id} selected={staffId === item.id} label={item.name} onPress={() => setStaffId(item.id)} />)}
          </ScrollView>
          <View style={styles.actions}><PremiumButton title={c.cancel} tone="secondary" onPress={() => setShowForm(false)} style={styles.flex} /><PremiumButton title={c.save} loading={create.isPending} disabled={!valid} onPress={() => create.mutate()} style={styles.flex} /></View>
        </Surface> : null}

        {blocks.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : blocks.isError ? <StateCard title={c.failed} message={apiErrorMessage(blocks.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void blocks.refetch()} />} /> : blocks.data?.length ? <>
          <SectionHeader title={c.title} detail={String(blocks.data.length)} />
          {blocks.data.map((block) => <Surface key={block.id} style={styles.blockCard}>
            <View style={[styles.dateRail, { backgroundColor: theme.accentSubtle }]}><Text style={[styles.dateDay, { color: theme.accentText }]}>{block.starts_at.slice(8, 10)}</Text><Text style={[styles.dateMonth, { color: theme.muted }]}>{block.starts_at.slice(5, 7)}</Text></View>
            <View style={styles.blockBody}><View style={styles.blockTop}><Text numberOfLines={1} style={[styles.blockTitle, { color: theme.text }]}>{block.reason || c.title}</Text><StatusPill label={block.staff_id ? staffNameById.get(block.staff_id) ?? c.staff : c.all} tone={block.staff_id ? 'accent' : 'neutral'} /></View><Text style={[styles.range, { color: theme.textSecondary }]}>{block.starts_at.slice(0, 16)} → {block.ends_at.slice(0, 16)}</Text></View>
            <IconButton accessibilityLabel={c.remove} ios="trash" android="delete" tone="danger" onPress={() => Alert.alert(c.remove, '', [{ text: c.cancel, style: 'cancel' }, { text: c.remove, style: 'destructive', onPress: () => remove.mutate(block.id) }])} />
          </Surface>)}
        </> : <StateCard title={c.empty} message={c.emptyHint} icon={{ ios: 'calendar.badge.minus', android: 'event_busy' }} action={<PremiumButton title={c.add} tone="secondary" onPress={() => setShowForm(true)} />} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScopeChip({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  const { theme } = useApp();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.chip, { backgroundColor: selected ? theme.primary : theme.surface, borderColor: selected ? theme.primary : theme.border, opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.chipText, { color: selected ? theme.onPrimary : theme.text }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  formCard: { gap: ui.spacing.sm },
  fieldLabel: { ...ui.type.caption, marginLeft: 2 },
  chips: { gap: ui.spacing.xs },
  chip: { minHeight: ui.touchTarget, borderWidth: 1, borderRadius: ui.radius.pill, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { ...ui.type.body, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: ui.spacing.xs },
  flex: { flex: 1 },
  loader: { marginVertical: ui.spacing.lg },
  blockCard: { padding: ui.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  dateRail: { width: 48, height: 54, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 19, lineHeight: 21, fontWeight: '900' },
  dateMonth: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
  blockBody: { flex: 1, gap: 5 },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.xs },
  blockTitle: { ...ui.type.cardTitle, flex: 1 },
  range: ui.type.caption,
});
