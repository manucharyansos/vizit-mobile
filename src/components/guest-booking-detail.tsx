import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as ExpoLinking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from './calendar-date-picker';
import { PageHeader, PremiumButton, PremiumInput, StateCard, StatusPill, Surface } from './premium-ui';
import { VizitIcon } from './vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { publicApi, type Slot } from '@/services/api/public';
import { normalizeList, normalizeResource } from '@/services/api/normalize';
import { guestBookingStore } from '@/services/guest-booking-store';
import { guestSummary, normalizeGuestBooking, type GuestAppointment } from '@/services/guest-booking';
import { checkoutUrlFrom, openIdBankCheckout, paymentIdFrom } from '@/services/payments';
import { bookingStatusLabel } from '@/services/booking-status';
import { formatApiDateTime, formatApiTime, localDateKey, localDateKeyFromApi, localDateTimeInputFromApi } from '@/services/date-time';

const copy = {
  hy: { title: 'Ամրագրում', otp: '4-նիշ հաստատման կոդ', verify: 'Հաստատել և բացել', resend: 'Ուղարկել նոր կոդ', cancel: 'Չեղարկել ամրագրումը', cancelAll: 'Չեղարկել բոլոր այցերը', reschedule: 'Փոխել ժամը', deposit: 'Վճարել կանխավճարը', choose: 'Ընտրիր նոր օրը և ժամը', updated: 'Ամրագրման ժամը փոխվեց', cancelled: 'Ամրագրումը չեղարկված է', security: 'Քո ամրագրումն ապահով է', hint: 'Մուտքագրիր email/SMS-ով ստացած 4-նիշ հաստատման կոդը։', retry: 'Կրկին փորձել', noSlots: 'Այս օրը ազատ ժամեր չկան։ Ընտրիր այլ օր։', telegram: 'Միացնել Telegram-ը', sent: 'Հաստատման կոդն ուղարկված է', visit: 'Այց', expired: 'Հաստատիր մուտքը՝ ամրագրումը բացելու համար։' },
  ru: { title: 'Запись', otp: '4-значный код подтверждения', verify: 'Подтвердить и открыть', resend: 'Отправить новый код', cancel: 'Отменить запись', cancelAll: 'Отменить все визиты', reschedule: 'Изменить время', deposit: 'Оплатить предоплату', choose: 'Выберите новые дату и время', updated: 'Время записи изменено', cancelled: 'Запись отменена', security: 'Ваша запись защищена', hint: 'Введите 4-значный код из email или SMS.', retry: 'Повторить', noSlots: 'Свободного времени нет. Выберите другой день.', telegram: 'Подключить Telegram', sent: 'Код подтверждения отправлен', visit: 'Визит', expired: 'Подтвердите доступ, чтобы открыть запись.' },
  en: { title: 'Booking', otp: '4-digit verification code', verify: 'Verify and open', resend: 'Send a new code', cancel: 'Cancel booking', cancelAll: 'Cancel all visits', reschedule: 'Change time', deposit: 'Pay deposit', choose: 'Choose a new date and time', updated: 'Booking time updated', cancelled: 'Booking cancelled', security: 'Your booking is protected', hint: 'Enter the 4-digit code from your email or SMS.', retry: 'Try again', noSlots: 'No available times. Choose another day.', telegram: 'Connect Telegram', sent: 'Verification code sent', visit: 'Visit', expired: 'Verify your access to open this booking.' },
};

export function GuestBookingDetail({ code, onBack }: { code: string; onBack: () => void }) {
  const { locale, theme, t } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [restoring, setRestoring] = useState(true);
  const [rescheduling, setRescheduling] = useState<number | null>(null);
  const fail = () => Alert.alert(t('loadError'), c.retry);
  useEffect(() => {
    let active = true;
    void guestBookingStore.restore(code).then((saved) => { if (active) setToken(saved?.token ?? ''); }).catch(() => undefined).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [code]);
  const detail = useQuery({ queryKey: ['guest-booking', code, token], queryFn: async () => normalizeGuestBooking(await publicApi.booking(code, token)), enabled: Boolean(token), retry: false, staleTime: 0 });
  const invalid = isAxiosError(detail.error) && [401, 403].includes(detail.error.response?.status ?? 0);
  useEffect(() => {
    if (!invalid) return;
    let active = true;
    void guestBookingStore.clearSession(code).catch(() => undefined).finally(() => { if (active) setToken(''); });
    return () => { active = false; };
  }, [code, invalid]);
  const booking = token && !invalid ? detail.data : undefined;
  useEffect(() => {
    if (!booking) return;
    void guestBookingStore.updateGuestSummary(code, guestSummary(booking)).then(() => cache.invalidateQueries({ queryKey: ['guest-booking-history'] })).catch(() => undefined);
  }, [booking, code, cache]);
  const caps = useQuery({ queryKey: ['booking-payment-capabilities', code, token], queryFn: async () => normalizeResource<{ deposit_available?: boolean }>(await publicApi.paymentCapabilities(code, token)), enabled: Boolean(booking), retry: false });
  const acceptToken = async (data: Record<string, unknown>) => {
    const access = data.manage_token ?? data.guest_token;
    if (typeof access !== 'string' || !access) throw new Error('Verification unavailable');
    await guestBookingStore.save(code, access);
    setToken(access); setOtp('');
  };
  const verify = useMutation({ mutationFn: async () => acceptToken(await publicApi.verifyBooking(code, otp)), onError: fail });
  const resend = useMutation({ mutationFn: async () => {
    const result = await publicApi.resendBookingOtp(code);
    if (result.manage_token || result.guest_token) await acceptToken(result);
    else Alert.alert(c.sent);
  }, onError: fail });
  const refresh = async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['guest-booking', code] }), cache.invalidateQueries({ queryKey: ['client-bookings'] }), cache.invalidateQueries({ queryKey: ['availability'] })]);
  };
  const cancel = useMutation({ mutationFn: () => publicApi.cancelBooking(code, token), onSuccess: async () => { setRescheduling(null); await refresh(); Alert.alert(c.cancelled); }, onError: fail });
  const telegram = useMutation({ mutationFn: async () => { const result = await publicApi.telegramLink(code, token); await Linking.openURL(result.url); }, onError: fail });
  const deposit = useMutation({ mutationFn: async () => {
    const returnUrl = ExpoLinking.createURL('/payment-return');
    const result = await publicApi.createDepositSession(code, token, { return_url: returnUrl, cancel_url: `${returnUrl}?status=cancelled` });
    const checkout = checkoutUrlFrom(result);
    if (!checkout) throw new Error('Checkout unavailable');
    const paymentId = paymentIdFrom(result);
    if (paymentId) await guestBookingStore.rememberPayment(paymentId, code);
    await openIdBankCheckout(checkout);
    await caps.refetch();
  }, onError: fail });
  const cancelLabel = booking && booking.bookings.length > 1 ? c.cancelAll : c.cancel;
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <PageHeader title={booking?.business?.name ?? c.title} eyebrow="Vizit" onBack={onBack} backLabel={t('back')} subtitle={booking?.business?.address} />
      {restoring || detail.isLoading ? <ActivityIndicator color={theme.accent} size="large" style={styles.loader} /> : null}
      {!restoring && !token ? <Surface style={styles.stack} elevated>
        <View style={[styles.security, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="lock.shield.fill" android="shield_lock" color={theme.accentText} size={25} /><View style={styles.flex}><Text style={[styles.title, { color: theme.text }]}>{c.security}</Text><Text style={[styles.body, { color: theme.muted }]}>{c.hint}</Text></View></View>
        <PremiumInput label={c.otp} value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" keyboardType="number-pad" maxLength={4} textContentType="oneTimeCode" autoComplete="sms-otp" inputStyle={styles.otp} />
        <PremiumButton title={c.verify} loading={verify.isPending} disabled={!/^\d{4}$/.test(otp) || resend.isPending} onPress={() => verify.mutate()} />
        <PremiumButton title={c.resend} loading={resend.isPending} disabled={verify.isPending} onPress={() => resend.mutate()} tone="ghost" />
      </Surface> : null}
      {token && detail.isError && !invalid ? <StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={c.retry} onPress={() => void detail.refetch()} tone="secondary" />} /> : null}
      {booking ? <>
        {booking.bookings.map((visit, index) => <Surface key={visit.id} style={styles.stack} elevated>
          <View style={styles.row}><Text style={[styles.caption, { color: theme.muted }]}>{c.visit}{booking.bookings.length > 1 ? ` ${index + 1} / ${booking.bookings.length}` : ''}</Text><StatusPill label={bookingStatusLabel(visit.status, locale)} tone={visit.status === 'confirmed' ? 'success' : visit.status === 'pending' ? 'warning' : 'neutral'} /></View>
          <Text style={[styles.serviceTitle, { color: theme.text }]}>{visit.service?.name ?? visit.items?.map((item) => item.service?.name).filter(Boolean).join(' · ') ?? c.title}</Text>
          <View style={[styles.dateFeature, { backgroundColor: theme.primary }]}><VizitIcon ios="calendar" android="event" color={theme.onPrimary} size={23} /><View style={styles.flex}><Text style={[styles.date, { color: theme.onPrimary }]}>{formatApiDateTime(visit.starts_at, locale)}</Text>{visit.ends_at ? <Text style={[styles.caption, { color: theme.onPrimary }]}>{formatApiTime(visit.starts_at, locale)} – {formatApiTime(visit.ends_at, locale)}</Text> : null}</View></View>
          {visit.staff?.name ? <View style={styles.person}><VizitIcon ios="person.fill" android="person" color={theme.muted} size={18} /><Text style={[styles.body, { color: theme.textSecondary }]}>{visit.staff.name}</Text></View> : null}
          {visit.can_reschedule ? <PremiumButton title={c.reschedule} tone="secondary" disabled={cancel.isPending} onPress={() => setRescheduling(rescheduling === visit.id ? null : visit.id)} icon={{ ios: 'calendar.badge.clock', android: 'edit_calendar' }} /> : null}
          {visit.can_reschedule && rescheduling === visit.id ? <ReschedulePanel visit={visit} code={code} token={token} onUpdated={async () => { setRescheduling(null); await refresh(); Alert.alert(c.updated); }} /> : null}
        </Surface>)}
        {booking.telegram_connected ? <View style={styles.connected}><VizitIcon ios="checkmark.circle.fill" android="check_circle" color={theme.success} size={19} /><Text style={[styles.body, { color: theme.success }]}>Telegram</Text></View> : <PremiumButton title={c.telegram} onPress={() => telegram.mutate()} loading={telegram.isPending} tone="secondary" icon={{ ios: 'paperplane.fill', android: 'send' }} />}
        {caps.data?.deposit_available ? <PremiumButton title={c.deposit} onPress={() => deposit.mutate()} loading={deposit.isPending} icon={{ ios: 'creditcard.fill', android: 'credit_card' }} /> : null}
        {booking.can_cancel ? <PremiumButton title={cancelLabel} tone="danger" loading={cancel.isPending} onPress={() => Alert.alert(cancelLabel, '', [{ text: t('back'), style: 'cancel' }, { text: cancelLabel, style: 'destructive', onPress: () => cancel.mutate() }])} /> : null}
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

function ReschedulePanel({ visit, code, token, onUpdated }: { visit: GuestAppointment; code: string; token: string; onUpdated: () => Promise<void> }) {
  const { theme, locale, t } = useApp();
  const c = copy[locale];
  const [date, setDate] = useState(() => { const date = localDateKeyFromApi(visit.starts_at); return date && date > localDateKey() ? date : localDateKey(); });
  const [selected, setSelected] = useState<Slot>();
  const options = useQuery({ queryKey: ['reschedule', code, token, visit.id, date], queryFn: async () => normalizeList<Slot>(await publicApi.rescheduleOptions(code, token, { booking_id: visit.id, date }), ['slots']), retry: false, staleTime: 0 });
  const update = useMutation({ mutationFn: () => publicApi.rescheduleBooking(code, token, { booking_id: visit.id, staff_id: selected!.staff_id, starts_at: localDateTimeInputFromApi(selected!.starts_at) }), onSuccess: onUpdated, onError: () => { setSelected(undefined); void options.refetch(); Alert.alert(t('loadError'), c.retry); } });
  const available = options.data?.some((slot) => slot.starts_at === selected?.starts_at && slot.staff_id === selected?.staff_id);
  return <View style={styles.stack}>
    <Text style={[styles.title, { color: theme.text }]}>{c.choose}</Text>
    <CalendarDatePicker value={date} onChange={(value) => { setDate(value); setSelected(undefined); }} />
    {options.isLoading ? <ActivityIndicator color={theme.accent} /> : options.isError ? <PremiumButton title={c.retry} onPress={() => void options.refetch()} tone="secondary" /> : !options.data?.length ? <Text style={[styles.body, { color: theme.muted }]}>{c.noSlots}</Text> : <View style={styles.slots}>{options.data.map((slot) => {
      const active = slot.starts_at === selected?.starts_at && slot.staff_id === selected?.staff_id;
      return <Pressable key={`${slot.starts_at}-${slot.staff_id}`} accessibilityRole="button" accessibilityState={{ selected: active, disabled: update.isPending }} disabled={update.isPending} onPress={() => setSelected(slot)} style={[styles.slot, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}><Text style={[styles.title, { color: active ? theme.onPrimary : theme.text }]}>{formatApiTime(slot.starts_at, locale)}</Text><Text style={[styles.caption, { color: active ? theme.onPrimary : theme.muted }]}>{slot.staff_name}</Text></Pressable>;
    })}</View>}
    <PremiumButton title={c.reschedule} loading={update.isPending} disabled={!available || options.isFetching} onPress={() => update.mutate()} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: ui.screenGutter, paddingBottom: 32, gap: 16 }, stack: { gap: 14 }, flex: { flex: 1 }, loader: { padding: 40 },
  security: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: ui.radius.medium, alignItems: 'center' }, title: ui.type.cardTitle, body: ui.type.body, caption: ui.type.caption, otp: { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: 12, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, serviceTitle: { ...ui.type.sectionTitle, fontSize: 21 }, dateFeature: { borderRadius: ui.radius.medium, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, date: { ...ui.type.body, fontWeight: '700', marginBottom: 3 }, person: { flexDirection: 'row', gap: 8, alignItems: 'center' }, connected: { flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 12 }, slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slot: { flexGrow: 1, flexBasis: '42%', borderWidth: 1, borderRadius: ui.radius.small, minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 8 },
});
