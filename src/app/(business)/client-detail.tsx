import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { bookingStatusLabel } from '@/services/booking-status';
import { formatApiDateTime } from '@/services/date-time';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: { title: 'Հաճախորդի քարտ', contact: 'Կոնտակտներ', overview: 'Հաճախորդի մասին', history: 'Այցերի պատմություն', notes: 'Նշումներ', name: 'Անուն', phone: 'Հեռախոս', email: 'Էլ․ փոստ', vip: 'VIP հաճախորդ', group: 'Խումբ', next: 'Հաջորդ այց', last: 'Վերջին այց', favoriteService: 'Սիրելի ծառայություն', favoriteStaff: 'Սիրելի աշխատակից', bookings: 'Ամրագրումներ', spent: 'Ծախսել է', completed: 'Ավարտված', cancelled: 'Չեղարկված', noShow: 'Չներկայացավ', avg: 'Միջին չեկ', save: 'Պահպանել', empty: 'Այցեր դեռ չկան', emptyNotes: 'Նշումներ դեռ չկան', loadError: 'Չհաջողվեց բեռնել հաճախորդի տվյալները', retry: 'Կրկին փորձել', back: 'Հետ' },
  ru: { title: 'Карточка клиента', contact: 'Контакты', overview: 'О клиенте', history: 'История визитов', notes: 'Заметки', name: 'Имя', phone: 'Телефон', email: 'Email', vip: 'VIP-клиент', group: 'Группа', next: 'Следующий визит', last: 'Последний визит', favoriteService: 'Любимая услуга', favoriteStaff: 'Любимый сотрудник', bookings: 'Записи', spent: 'Потрачено', completed: 'Завершено', cancelled: 'Отменено', noShow: 'Не пришёл', avg: 'Средний чек', save: 'Сохранить', empty: 'Визитов пока нет', emptyNotes: 'Заметок пока нет', loadError: 'Не удалось загрузить данные клиента', retry: 'Повторить', back: 'Назад' },
  en: { title: 'Client card', contact: 'Contacts', overview: 'About client', history: 'Visit history', notes: 'Notes', name: 'Name', phone: 'Phone', email: 'Email', vip: 'VIP client', group: 'Group', next: 'Next visit', last: 'Last visit', favoriteService: 'Favorite service', favoriteStaff: 'Favorite team member', bookings: 'Bookings', spent: 'Total spent', completed: 'Completed', cancelled: 'Cancelled', noShow: 'No-show', avg: 'Average ticket', save: 'Save', empty: 'No visits yet', emptyNotes: 'No notes yet', loadError: 'Could not load client details', retry: 'Try again', back: 'Back' },
};

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);
  const { locale, theme } = useApp();
  const c = copy[locale];
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['business-client', clientId], queryFn: () => businessApi.client(clientId), enabled: Number.isInteger(clientId) && clientId > 0, retry: false, refetchOnMount: 'always', staleTime: 0 });
  const [form, setForm] = useState({ name: '', phone: '', email: '', is_vip: false });

  useEffect(() => {
    if (!query.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ name: query.data.name ?? '', phone: query.data.phone ?? '', email: query.data.email ?? '', is_vip: Boolean(query.data.is_vip) });
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => businessApi.updateClient(clientId, { ...form, email: form.email || undefined }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['business-client', clientId] }),
        qc.invalidateQueries({ queryKey: ['business-clients'] }),
        qc.invalidateQueries({ queryKey: ['business-dashboard'] }),
      ]);
      await qc.refetchQueries({ queryKey: ['business-client', clientId], type: 'active' });
      Alert.alert(c.save, '✓');
    },
    onError: (error) => Alert.alert(c.save, apiErrorMessage(error)),
  });

  if (query.isLoading) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} size="large" /></SafeAreaView>;
  if (query.isError || !query.data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<View style={styles.stateActions}><PremiumButton title={c.retry} onPress={() => query.refetch()} tone="secondary" /><PremiumButton title={c.back} onPress={() => safeBack('/(business)/clients')} tone="ghost" /></View>} />
      </SafeAreaView>
    );
  }

  const data = query.data;
  const crm = data.crm ?? {};
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow={c.title}
          title={data.name ?? c.title}
          subtitle={data.phone || data.email || c.title}
          backLabel={c.back}
          onBack={() => safeBack('/(business)/clients')}
          action={data.is_vip ? <StatusPill label="VIP" tone="accent" /> : undefined}
        />

        <View style={styles.stats}>
          <Stat value={data.bookings_count ?? 0} label={c.bookings} icon={{ ios: 'calendar', android: 'calendar_month' }} />
          <Stat value={`${Number(data.total_spent ?? 0).toLocaleString()} ֏`} label={c.spent} icon={{ ios: 'banknote.fill', android: 'payments' }} />
          <Stat value={crm.completed_count ?? 0} label={c.completed} icon={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} />
        </View>

        <Surface style={styles.card} elevated>
          <SectionHeader title={c.overview} />
          <InfoRow label={c.next} value={data.next_booking_at ? formatApiDateTime(data.next_booking_at, locale) : '—'} />
          <InfoRow label={c.last} value={data.last_booking_at ? formatApiDateTime(data.last_booking_at, locale) : '—'} />
          {data.group_name ? <InfoRow label={c.group} value={data.group_name} /> : null}
          <View style={styles.crmGrid}>
            <MiniStat label={c.cancelled} value={crm.cancelled_count ?? 0} tone="danger" />
            <MiniStat label={c.noShow} value={crm.no_show_count ?? 0} tone="warning" />
            <MiniStat label={c.avg} value={`${Number(crm.avg_ticket ?? 0).toLocaleString()} ֏`} tone="accent" />
          </View>
          <InfoRow label={c.favoriteService} value={crm.favorite_service_name ?? '—'} />
          <InfoRow label={c.favoriteStaff} value={crm.favorite_staff_name ?? '—'} />
        </Surface>

        <Surface style={styles.card} elevated>
          <SectionHeader title={c.contact} />
          <PremiumInput label={c.name} value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} placeholder={c.name} icon={{ ios: 'person.fill', android: 'person' }} />
          <PremiumInput label={c.phone} value={form.phone} onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} placeholder={c.phone} keyboardType="phone-pad" icon={{ ios: 'phone.fill', android: 'call' }} />
          <PremiumInput label={c.email} value={form.email} onChangeText={(email) => setForm((value) => ({ ...value, email }))} placeholder={c.email} keyboardType="email-address" autoCapitalize="none" icon={{ ios: 'envelope.fill', android: 'mail' }} />
          <View style={[styles.toggle, { backgroundColor: theme.accentSubtle }]}><View style={styles.toggleCopy}><VizitIcon ios="star.fill" android="star" color={theme.accentText} size={18} /><Text style={[styles.toggleLabel, { color: theme.text }]}>{c.vip}</Text></View><Switch value={form.is_vip} onValueChange={(is_vip) => setForm((value) => ({ ...value, is_vip }))} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceRaised} /></View>
          <PremiumButton title={c.save} loading={save.isPending} disabled={form.name.trim().length < 2} onPress={() => save.mutate()} icon={{ ios: 'checkmark', android: 'check' }} />
        </Surface>

        <SectionHeader title={c.history} />
        {data.recent_bookings?.length ? data.recent_bookings.map((booking) => (
          <Surface key={booking.id} style={styles.visit}>
            <View style={[styles.visitIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="calendar" android="event" color={theme.accentText} size={19} /></View>
            <View style={styles.visitCopy}><Text style={[styles.visitTitle, { color: theme.text }]}>{booking.service?.name ?? '—'}</Text><Text style={[styles.visitMeta, { color: theme.muted }]}>{formatApiDateTime(booking.starts_at, locale)} · {booking.staff?.name ?? '—'}</Text>{booking.notes ? <Text numberOfLines={2} style={[styles.visitNotes, { color: theme.muted }]}>{booking.notes}</Text> : null}</View>
            <StatusPill label={bookingStatusLabel(booking.status, locale)} tone={bookingTone(booking.status)} />
          </Surface>
        )) : <Empty text={c.empty} />}

        <SectionHeader title={c.notes} />
        {data.recent_notes?.length ? data.recent_notes.map((note) => (
          <Surface key={note.id} style={styles.note}>
            <View style={styles.noteTop}><View style={[styles.noteIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios={note.is_pinned ? 'pin.fill' : 'note.text'} android={note.is_pinned ? 'push_pin' : 'notes'} color={theme.accentText} size={16} /></View><Text style={[styles.noteAuthor, { color: theme.text }]}>{note.author_name ?? c.notes}</Text>{note.created_at ? <Text style={[styles.noteDate, { color: theme.muted }]}>{formatApiDateTime(note.created_at, locale)}</Text> : null}</View><Text style={[styles.noteBody, { color: theme.textSecondary }]}>{note.body}</Text>
          </Surface>
        )) : <Empty text={c.emptyNotes} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function bookingTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  const value = status.toLocaleLowerCase();
  if (value.includes('cancel') || value.includes('no_show')) return 'danger';
  if (value.includes('complete') || value.includes('done')) return 'success';
  if (value.includes('pending')) return 'warning';
  if (value.includes('confirm')) return 'accent';
  return 'neutral';
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useApp();
  return <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}><Text style={[styles.infoLabel, { color: theme.muted }]}>{label}</Text><Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text></View>;
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: 'accent' | 'warning' | 'danger' }) {
  const { theme } = useApp();
  const background = tone === 'danger' ? theme.dangerSoft : tone === 'warning' ? theme.warningSoft : theme.accentSoft;
  const color = tone === 'danger' ? theme.danger : tone === 'warning' ? theme.warning : theme.accentText;
  return <View style={[styles.miniStat, { backgroundColor: background }]}><Text numberOfLines={1} style={[styles.miniValue, { color }]}>{value}</Text><Text numberOfLines={2} style={[styles.miniLabel, { color: theme.muted }]}>{label}</Text></View>;
}

function Stat({ value, label, icon }: { value: string | number; label: string; icon: { ios: 'calendar' | 'banknote.fill' | 'checkmark.circle.fill'; android: 'calendar_month' | 'payments' | 'check_circle' } }) {
  const { theme } = useApp();
  return <Surface style={styles.stat}><VizitIcon ios={icon.ios} android={icon.android} color={theme.accentText} size={18} /><Text numberOfLines={1} style={[styles.statValue, { color: theme.text }]}>{value}</Text><Text numberOfLines={2} style={[styles.statLabel, { color: theme.muted }]}>{label}</Text></Surface>;
}

function Empty({ text }: { text: string }) {
  const { theme } = useApp();
  return <View style={[styles.empty, { borderColor: theme.border }]}><VizitIcon ios="tray" android="inbox" color={theme.faint} size={23} /><Text style={[styles.emptyText, { color: theme.muted }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'stretch', justifyContent: 'center', padding: ui.screenGutter },
  stateActions: { gap: 8 },
  content: { padding: ui.screenGutter, paddingBottom: 42, gap: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, minHeight: 104, padding: 11, justifyContent: 'space-between', borderRadius: ui.radius.medium },
  statValue: { fontSize: 16, lineHeight: 21, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 2 },
  card: { padding: 15, gap: 11 },
  infoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { ...ui.type.caption, flex: 1 },
  infoValue: { ...ui.type.caption, fontWeight: '800', flex: 1.35, textAlign: 'right' },
  crmGrid: { flexDirection: 'row', gap: 7, marginVertical: 3 },
  miniStat: { flex: 1, minWidth: 0, minHeight: 70, borderRadius: ui.radius.small, padding: 9, justifyContent: 'center' },
  miniValue: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  miniLabel: { fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 3 },
  toggle: { minHeight: 52, borderRadius: ui.radius.medium, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: ui.type.button,
  visit: { padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  visitIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  visitCopy: { flex: 1, minWidth: 0 },
  visitTitle: { ...ui.type.cardTitle, fontSize: 14 },
  visitMeta: { ...ui.type.caption, marginTop: 3 },
  visitNotes: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  note: { padding: 13, gap: 8 },
  noteTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noteAuthor: { ...ui.type.caption, flex: 1, fontWeight: '800' },
  noteDate: { fontSize: 9, lineHeight: 12, fontWeight: '600' },
  noteBody: ui.type.body,
  empty: { minHeight: 90, borderWidth: 1, borderStyle: 'dashed', borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyText: ui.type.body,
});
