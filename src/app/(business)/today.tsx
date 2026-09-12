import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, CalendarBooking } from '@/services/api/business';
import { apiErrorMessage, tokenStore } from '@/services/api/client';
import { localDateKey, formatApiTime } from '@/services/date-time';
import { bookingStatusLabel, isBookingTerminal } from '@/services/booking-status';

const copy = {
  hy: { title: 'Այսօրվա օրացույց', empty: 'Այսօր ամրագրումներ չկան', client: 'Հաճախորդ', confirm: 'Հաստատել', done: 'Ավարտել', noShow: 'Նշել՝ չի ներկայացել', cancel: 'Չեղարկել', add: 'Նոր ամրագրում', logout: 'Դուրս գալ', delete: 'Ջնջել հաշիվը', deleteConfirm: 'Ուղարկե՞լ բիզնես հաշվի և տվյալների ջնջման հայտը։', auth: 'Մուտք գործիր բիզնես հաշվով', loadError: 'Չհաջողվեց բեռնել օրացույցը', actionError: 'Գործողությունը չհաջողվեց', retry: 'Կրկին փորձել', phone: 'Հեռախոս', notes: 'Նշումներ', actionConfirm: 'Հաստատե՞լ այս գործողությունը։', close: 'Փակել', appointments: 'ամրագրում' },
  ru: { title: 'Календарь на сегодня', empty: 'На сегодня записей нет', client: 'Клиент', confirm: 'Подтвердить', done: 'Завершить', noShow: 'Отметить неявку', cancel: 'Отменить', add: 'Новая запись', logout: 'Выйти', delete: 'Удалить аккаунт', deleteConfirm: 'Отправить запрос на удаление бизнес-аккаунта и данных?', auth: 'Войдите в аккаунт бизнеса', loadError: 'Не удалось загрузить календарь', actionError: 'Не удалось выполнить действие', retry: 'Повторить', phone: 'Телефон', notes: 'Заметки', actionConfirm: 'Подтвердить это действие?', close: 'Закрыть', appointments: 'записей' },
  en: { title: "Today's calendar", empty: 'No bookings today', client: 'Client', confirm: 'Confirm', done: 'Complete', noShow: 'Mark no-show', cancel: 'Cancel', add: 'New booking', logout: 'Sign out', delete: 'Delete account', deleteConfirm: 'Request deletion of the business account and its data?', auth: 'Sign in with a business account', loadError: 'Could not load calendar', actionError: 'Action failed', retry: 'Try again', phone: 'Phone', notes: 'Notes', actionConfirm: 'Confirm this action?', close: 'Close', appointments: 'bookings' },
};

export default function TodayScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const queryClient = useQueryClient();
  const date = localDateKey();
  const me = useQuery({ queryKey: ['business-me'], queryFn: businessApi.me, retry: false, refetchOnMount: 'always' });
  const bookings = useQuery({ queryKey: ['calendar', date], queryFn: () => businessApi.calendar(date, date), enabled: me.isSuccess, retry: false, refetchOnMount: 'always', staleTime: 0, refetchInterval: 15_000 });
  const status = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'confirm' | 'done' | 'no-show' | 'cancel' }) => businessApi.updateStatus(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      await queryClient.refetchQueries({ queryKey: ['calendar', date], type: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      await queryClient.invalidateQueries({ queryKey: ['business-client'] });
      await queryClient.invalidateQueries({ queryKey: ['business-availability'] });
    },
    onError: (error) => Alert.alert(c.actionError, apiErrorMessage(error)),
  });
  const runAction = (item: CalendarBooking, action: 'confirm' | 'done' | 'no-show' | 'cancel') => {
    if (action === 'cancel' || action === 'no-show') {
      const label = action === 'cancel' ? c.cancel : c.noShow;
      Alert.alert(label, c.actionConfirm, [{ text: c.close, style: 'cancel' }, { text: label, style: action === 'cancel' ? 'destructive' : 'default', onPress: () => status.mutate({ id: item.id, action }) }]);
      return;
    }
    status.mutate({ id: item.id, action });
  };
  const requestDeletion = () => Alert.alert(c.delete, c.deleteConfirm, [
    { text: c.logout, style: 'cancel' },
    { text: c.delete, style: 'destructive', onPress: async () => { await businessApi.requestAccountDeletion(); queryClient.clear(); router.replace('/(business)/login'); } },
  ]);
  const logout = () => Alert.alert(c.title, '', [
    { text: c.logout, onPress: async () => { await businessApi.logout(); queryClient.clear(); router.replace('/(business)/login'); } },
    { text: c.delete, style: 'destructive', onPress: requestDeletion },
  ]);

  if (me.isLoading) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} size="large" /></SafeAreaView>;
  if (me.isError) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <StateCard title={c.auth} icon={{ ios: 'lock.shield.fill', android: 'shield_lock' }} action={<PremiumButton title={c.auth} onPress={async () => { await tokenStore.remove('business'); router.replace('/(business)/login'); }} />} />
      </SafeAreaView>
    );
  }

  const isStaff = me.data?.role === 'staff';
  const dateLabel = new Intl.DateTimeFormat(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Yerevan' }).format(new Date(`${date}T12:00:00+04:00`));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.headerWrap}>
        <PageHeader
          eyebrow="Vizit Business"
          title={c.title}
          subtitle={me.data?.name}
          action={
            <View style={styles.headerActions}>
              {!isStaff ? <IconButton accessibilityLabel={c.add} ios="plus" android="add" onPress={() => router.push('/(business)/new-booking' as never)} tone="primary" /> : null}
              <IconButton accessibilityLabel={c.logout} ios="rectangle.portrait.and.arrow.right" android="logout" onPress={logout} tone="accent" />
            </View>
          }
        />
        <Surface style={styles.dateCard}>
          <View style={[styles.dateIcon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="calendar" android="calendar_month" color={theme.accentText} size={21} /></View>
          <View style={styles.dateCopy}><Text style={[styles.dateText, { color: theme.text }]}>{dateLabel}</Text><Text style={[styles.dateMeta, { color: theme.muted }]}>{bookings.data?.length ?? 0} {c.appointments}</Text></View>
          <View style={[styles.countBadge, { backgroundColor: theme.primary }]}><Text style={[styles.countText, { color: theme.onPrimary }]}>{bookings.data?.length ?? 0}</Text></View>
        </Surface>
      </View>

      {bookings.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : bookings.isError ? (
        <View style={styles.stateWrap}><StateCard title={c.loadError} message={apiErrorMessage(bookings.error)} tone="danger" action={<PremiumButton title={c.retry} onPress={() => bookings.refetch()} tone="secondary" />} /></View>
      ) : (
        <FlatList
          data={bookings.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<StateCard title={c.empty} icon={{ ios: 'calendar.badge.checkmark', android: 'event_available' }} />}
          renderItem={({ item }) => <BookingCard item={item} onStatus={(action) => runAction(item, action)} labels={c} locale={locale} pending={status.isPending} />}
        />
      )}
    </SafeAreaView>
  );
}

function BookingCard({ item, onStatus, labels, locale, pending }: { item: CalendarBooking; onStatus: (action: 'confirm' | 'done' | 'no-show' | 'cancel') => void; labels: typeof copy.hy; locale: 'hy' | 'ru' | 'en'; pending: boolean }) {
  const { theme } = useApp();
  const starts = formatApiTime(item.starts_at, locale);
  const ends = formatApiTime(item.ends_at, locale);
  const terminal = isBookingTerminal(item.status);
  const client = item.client_name ?? item.customer_name ?? item.client?.name ?? labels.client;
  const phone = item.client_phone ?? item.client?.phone;
  const canConfirm = item.status === 'pending';
  const canComplete = item.status === 'confirmed';
  const canNoShowOrCancel = item.status === 'pending' || item.status === 'confirmed';
  const tone = bookingTone(item.status);

  return (
    <Surface style={[styles.card, { borderColor: tone === 'danger' ? theme.danger : theme.border }]} elevated>
      <View style={styles.cardMain}>
        <View style={[styles.timeRail, { backgroundColor: theme.primary }]}>
          <Text style={[styles.time, { color: theme.onPrimary }]}>{starts}</Text>
          <View style={[styles.timeDivider, { backgroundColor: theme.onPrimary }]} />
          <Text style={[styles.timeEnd, { color: theme.onPrimary }]}>{ends}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text numberOfLines={1} style={[styles.client, { color: theme.text }]}>{client}</Text>
            <StatusPill label={bookingStatusLabel(item.status, locale)} tone={tone} />
          </View>
          {phone ? <View style={styles.detailRow}><VizitIcon ios="phone.fill" android="call" color={theme.faint} size={14} /><Text style={[styles.detailText, { color: theme.muted }]}>{phone}</Text></View> : null}
          <View style={styles.detailRow}><VizitIcon ios="sparkles" android="spa" color={theme.faint} size={14} /><Text numberOfLines={2} style={[styles.detailText, { color: theme.textSecondary }]}>{item.service?.name ?? '—'} · {item.staff?.name ?? '—'}</Text></View>
          {item.notes ? <View style={[styles.notes, { backgroundColor: theme.accentSubtle }]}><Text numberOfLines={3} style={[styles.notesText, { color: theme.muted }]}>{labels.notes}: {item.notes}</Text></View> : null}
        </View>
      </View>
      {!terminal && (canConfirm || canComplete || canNoShowOrCancel) ? (
        <View style={styles.actions}>
          {canConfirm ? <Action title={labels.confirm} disabled={pending} onPress={() => onStatus('confirm')} tone="primary" /> : null}
          {canComplete ? <Action title={labels.done} disabled={pending} onPress={() => onStatus('done')} tone="success" /> : null}
          {canNoShowOrCancel ? <Action title={labels.noShow} disabled={pending} onPress={() => onStatus('no-show')} /> : null}
          {canNoShowOrCancel ? <Action title={labels.cancel} disabled={pending} onPress={() => onStatus('cancel')} tone="danger" /> : null}
        </View>
      ) : null}
    </Surface>
  );
}

function bookingTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  const value = status.toLocaleLowerCase();
  if (value.includes('cancel') || value.includes('no_show')) return 'danger';
  if (value.includes('complete') || value.includes('done')) return 'success';
  if (value.includes('pending')) return 'warning';
  if (value.includes('confirm') || value.includes('progress')) return 'accent';
  return 'neutral';
}

function Action({ title, onPress, tone, disabled = false }: { title: string; onPress: () => void; tone?: 'primary' | 'success' | 'danger'; disabled?: boolean }) {
  const { theme } = useApp();
  const background = tone === 'primary' ? theme.primary : tone === 'success' ? theme.successSoft : tone === 'danger' ? theme.dangerSoft : theme.surface;
  const color = tone === 'primary' ? theme.onPrimary : tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.textSecondary;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: background, borderColor: tone === 'primary' ? theme.primary : theme.border, opacity: disabled ? 0.42 : pressed ? 0.72 : 1 }]}><Text numberOfLines={2} style={[styles.actionText, { color }]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'stretch', justifyContent: 'center', padding: ui.screenGutter },
  headerWrap: { padding: ui.screenGutter, paddingBottom: 10, gap: 16 },
  headerActions: { flexDirection: 'row', gap: 8 },
  dateCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  dateIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dateCopy: { flex: 1 },
  dateText: { fontSize: 14, lineHeight: 19, fontWeight: '800', textTransform: 'capitalize' },
  dateMeta: { ...ui.type.caption, marginTop: 2 },
  countBadge: { minWidth: 34, height: 34, borderRadius: 12, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  countText: { ...ui.type.caption, fontWeight: '800' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateWrap: { padding: ui.screenGutter },
  list: { paddingHorizontal: ui.screenGutter, paddingTop: 4, paddingBottom: 34 },
  separator: { height: 11 },
  card: { padding: 13, gap: 12 },
  cardMain: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  timeRail: { width: 68, minHeight: 106, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  time: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  timeDivider: { width: 14, height: 1, opacity: 0.35, marginVertical: 5 },
  timeEnd: { fontSize: 11, lineHeight: 15, fontWeight: '700', opacity: 0.75 },
  cardBody: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 7 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 7 },
  client: { fontSize: 17, lineHeight: 22, fontWeight: '800', flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  detailText: { ...ui.type.caption, flex: 1 },
  notes: { borderRadius: ui.radius.small, padding: 8 },
  notesText: ui.type.caption,
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  action: { flexGrow: 1, flexBasis: '46%', minHeight: 42, borderRadius: ui.radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontSize: 11, lineHeight: 14, fontWeight: '800', textAlign: 'center' },
});
