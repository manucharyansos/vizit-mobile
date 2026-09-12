import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { Divider, PageHeader, PremiumButton, PremiumInput, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { publicApi } from '@/services/api/public';
import { guestBookingStore } from '@/services/guest-booking-store';
import { checkoutUrlFrom, openIdBankCheckout } from '@/services/payments';
import { formatApiDateTime, formatApiTime, localDateKey, localDateKeyFromApi, localDateTimeInputFromApi } from '@/services/date-time';

const copy = {
  hy: {
    title: 'Իմ ամրագրումները', otp: '4-նիշ հաստատման կոդ', verify: 'Հաստատել և բացել', resend: 'Ուղարկել նոր OTP', cancel: 'Չեղարկել ամրագրումը', reschedule: 'Փոխել ժամը', deposit: 'Վճարել կանխավճարը', chooseNewDate: 'Ընտրիր նոր օրը և ժամը', updated: 'Ամրագրման ժամը փոխվեց', cancelled: 'Ամրագրումը չեղարկված է', invalid: 'Մուտքագրիր ուղարկված 4 թիվը', verified: 'Անվտանգ մուտքը հաստատված է', date: 'Ամսաթիվ և ժամ', client: 'Հաճախորդ', status: 'Կարգավիճակ', empty: 'Մուտքագրիր email/SMS-ով ստացած 4-նիշ հաստատման կոդը։', missing: 'Այս սարքում սպասող ամրագրում չկա։ Նոր ամրագրում կատարիր կամ մուտք գործիր հաճախորդի հաշիվ։', booking: 'Ամրագրում', retry: 'Կրկին փորձել', security: 'Ամրագրման տվյալները պաշտպանված են',
  },
  ru: {
    title: 'Мои записи', otp: '4-значный код подтверждения', verify: 'Подтвердить и открыть', resend: 'Отправить новый OTP', cancel: 'Отменить запись', reschedule: 'Изменить время', deposit: 'Оплатить предоплату', chooseNewDate: 'Выберите новые дату и время', updated: 'Время записи изменено', cancelled: 'Запись отменена', invalid: 'Введите отправленные вам 4 цифры', verified: 'Безопасный доступ подтверждён', date: 'Дата и время', client: 'Клиент', status: 'Статус', empty: 'Введите 4-значный код подтверждения из email/SMS.', missing: 'На этом устройстве нет ожидающей записи. Создайте новую запись или войдите в аккаунт клиента.', booking: 'Запись', retry: 'Повторить', security: 'Данные записи защищены',
  },
  en: {
    title: 'My bookings', otp: '4-digit verification code', verify: 'Verify and open', resend: 'Send a new OTP', cancel: 'Cancel booking', reschedule: 'Change time', deposit: 'Pay deposit', chooseNewDate: 'Choose a new date and time', updated: 'Booking time updated', cancelled: 'Booking cancelled', invalid: 'Enter the 4 digits sent to you', verified: 'Secure access verified', date: 'Date and time', client: 'Client', status: 'Status', empty: 'Enter the 4-digit verification code received by email/SMS.', missing: 'There is no pending booking on this device. Make a new booking or sign in to your client account.', booking: 'Booking', retry: 'Try again', security: 'Booking details are protected',
  },
};

export default function BookingsScreen() {
  const { locale, theme, t } = useApp();
  const c = copy[locale];
  const telegramLabel = locale === 'hy' ? 'Միացնել Telegram-ը' : locale === 'ru' ? 'Подключить Telegram' : 'Connect Telegram';
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [restoring, setRestoring] = useState(true);
  const [isRescheduling, setRescheduling] = useState(false);

  const detail = useQuery({ queryKey: ['guest-booking', code, token], queryFn: () => publicApi.booking(code.trim(), token), enabled: Boolean(code && token), retry: false });
  const paymentCapabilities = useQuery({ queryKey: ['booking-payment-capabilities', code, token], queryFn: () => publicApi.paymentCapabilities(code.trim(), token), enabled: Boolean(code && token), retry: false });

  useEffect(() => {
    let active = true;
    Promise.all([guestBookingStore.restoreLastCode(), guestBookingStore.restoreLast()])
      .then(([lastCode, saved]) => {
        if (!active) return;
        const storedCode = saved?.code ?? lastCode;
        if (storedCode) setCode(storedCode);
        if (saved) setToken(saved.token);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  const invalidSession = Boolean(detail.error && isAxiosError(detail.error) && (detail.error.response?.status === 401 || detail.error.response?.status === 403));
  useEffect(() => {
    let active = true;
    if (invalidSession) void guestBookingStore.clearSession(code).finally(() => { if (active) setToken(''); });
    return () => { active = false; };
  }, [code, invalidSession]);

  const hasAccess = Boolean(token && !invalidSession);
  const verify = useMutation({
    mutationFn: () => publicApi.verifyBooking(code.trim(), otp),
    onSuccess: async (data) => {
      const manageToken = data.manage_token ?? data.guest_token;
      if (!manageToken) throw new Error('Missing manage token');
      const normalizedCode = code.trim().toUpperCase();
      await guestBookingStore.save(normalizedCode, manageToken);
      setCode(normalizedCode);
      setToken(manageToken);
      setOtp('');
    },
    onError: () => Alert.alert(t('loadError')),
  });
  const resend = useMutation({
    mutationFn: () => publicApi.resendBookingOtp(code.trim()),
    onSuccess: async (data) => {
      if (data.manage_token) {
        await guestBookingStore.save(code, data.manage_token);
        setToken(data.manage_token);
      } else Alert.alert(c.resend);
    },
    onError: () => Alert.alert(t('loadError')),
  });
  const cancel = useMutation({
    mutationFn: () => publicApi.cancelBooking(code.trim(), token),
    onSuccess: () => { Alert.alert(c.cancelled); detail.refetch(); },
    onError: () => Alert.alert(t('loadError')),
  });
  const telegram = useMutation({ mutationFn: () => publicApi.telegramLink(code.trim(), token), onSuccess: ({ url }) => Linking.openURL(url), onError: () => Alert.alert(t('loadError')) });
  const deposit = useMutation({
    mutationFn: async () => {
      const returnUrl = ExpoLinking.createURL('/payment-return');
      const session = await publicApi.createDepositSession(code.trim(), token, { return_url: returnUrl, cancel_url: `${returnUrl}?status=cancelled` });
      const checkoutUrl = checkoutUrlFrom(session);
      if (!checkoutUrl) throw new Error('Missing checkout URL');
      await openIdBankCheckout(checkoutUrl);
    },
    onError: () => Alert.alert(t('loadError')),
  });

  const root = detail.data?.data ?? detail.data;
  const booking = root?.booking ?? root?.bookings?.[0] ?? root;
  const submit = () => code.trim() && /^\d{4}$/.test(otp) ? verify.mutate() : Alert.alert(c.invalid);
  const status = String(booking?.status ?? '');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Vizit"
          title={c.title}
          subtitle={restoring ? undefined : hasAccess ? c.verified : code ? c.empty : c.missing}
          action={<View style={[styles.headerIcon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="calendar.badge.clock" android="calendar_month" color={theme.accentText} size={24} /></View>}
        />

        {restoring ? (
          <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View>
        ) : !code ? (
          <StateCard
            title={c.security}
            message={c.missing}
            icon={{ ios: 'calendar.badge.plus', android: 'event_available' }}
            action={<PremiumButton title={t('bookNow')} onPress={() => router.push('/(customer)/discover')} icon={{ ios: 'magnifyingglass', android: 'search' }} />}
          />
        ) : !hasAccess ? (
          <Surface style={styles.verifyCard} elevated>
            <View style={[styles.securityNote, { backgroundColor: theme.accentSubtle }]}>
              <View style={[styles.securityIcon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="lock.shield.fill" android="shield_lock" color={theme.accentText} size={21} /></View>
              <View style={styles.securityCopy}><Text style={[styles.securityTitle, { color: theme.text }]}>{c.security}</Text><Text style={[styles.securityText, { color: theme.muted }]}>{c.empty}</Text></View>
            </View>
            <PremiumInput
              label={c.otp}
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              keyboardType="number-pad"
              maxLength={4}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              inputStyle={styles.otpField}
              icon={{ ios: 'number', android: 'pin' }}
            />
            <PremiumButton title={c.verify} onPress={submit} loading={verify.isPending} disabled={otp.length !== 4} icon={{ ios: 'checkmark.shield.fill', android: 'verified_user' }} />
            <PremiumButton title={c.resend} onPress={() => resend.mutate()} loading={resend.isPending} tone="ghost" compact />
          </Surface>
        ) : null}

        {detail.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : null}
        {hasAccess && detail.isError && !invalidSession ? (
          <StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={c.retry} onPress={() => detail.refetch()} tone="secondary" />} />
        ) : null}

        {hasAccess && booking ? (
          <Surface style={styles.bookingCard} elevated>
            <View style={styles.bookingTop}>
              <View style={[styles.businessIcon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="building.2.fill" android="business" color={theme.accentText} size={22} /></View>
              <View style={styles.bookingHeading}>
                <Text numberOfLines={2} style={[styles.bookingTitle, { color: theme.text }]}>{booking.business?.name ?? booking.business_name ?? c.booking}</Text>
                <StatusPill label={status || '—'} tone={statusTone(status)} />
              </View>
            </View>

            <View style={[styles.dateFeature, { backgroundColor: theme.primary }]}>
              <View style={[styles.dateIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}><VizitIcon ios="calendar" android="calendar_month" color={theme.onPrimary} size={21} /></View>
              <View style={styles.dateCopy}><Text style={[styles.dateLabel, { color: theme.onPrimary }]}>{c.date}</Text><Text style={[styles.dateValue, { color: theme.onPrimary }]}>{formatApiDateTime(booking.starts_at ?? booking.start_at, locale)}</Text></View>
            </View>

            <View style={styles.infoList}>
              <Info icon={{ ios: 'sparkles', android: 'spa' }} label={t('services')} value={booking.service?.name ?? booking.service_name ?? '—'} />
              <Divider />
              <Info icon={{ ios: 'person.fill', android: 'person' }} label={c.client} value={booking.client_name ?? booking.customer_name ?? '—'} />
            </View>

            {booking.telegram_connected ? (
              <View style={[styles.connected, { backgroundColor: theme.successSoft }]}><VizitIcon ios="checkmark.circle.fill" android="check_circle" color={theme.success} size={19} /><Text style={[styles.connectedText, { color: theme.success }]}>Telegram</Text></View>
            ) : (
              <PremiumButton title={telegramLabel} onPress={() => telegram.mutate()} loading={telegram.isPending} tone="secondary" icon={{ ios: 'paperplane.fill', android: 'send' }} />
            )}

            {paymentCapabilities.data?.data?.deposit_available ? <PremiumButton title={c.deposit} onPress={() => deposit.mutate()} loading={deposit.isPending} icon={{ ios: 'creditcard.fill', android: 'credit_card' }} /> : null}

            {booking.status !== 'cancelled' ? (
              <View style={styles.manageActions}>
                <PremiumButton title={c.reschedule} onPress={() => setRescheduling((value) => !value)} tone="secondary" icon={{ ios: 'calendar.badge.clock', android: 'edit_calendar' }} />
                {isRescheduling ? (
                  <ReschedulePanel
                    booking={booking}
                    bookingCode={code.trim()}
                    token={token}
                    onUpdated={() => { setRescheduling(false); Alert.alert(c.updated); detail.refetch(); }}
                    labels={c}
                  />
                ) : null}
                <PremiumButton
                  title={c.cancel}
                  tone="danger"
                  loading={cancel.isPending}
                  icon={{ ios: 'xmark.circle', android: 'cancel' }}
                  onPress={() => Alert.alert(c.cancel, '', [{ text: t('back') }, { text: c.cancel, style: 'destructive', onPress: () => cancel.mutate() }])}
                />
              </View>
            ) : null}
          </Surface>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  const value = status.toLocaleLowerCase();
  if (value.includes('cancel') || value.includes('no_show')) return 'danger';
  if (value.includes('complete') || value.includes('done')) return 'success';
  if (value.includes('pending')) return 'warning';
  if (value.includes('confirm')) return 'accent';
  return 'neutral';
}

function Info({ icon, label, value }: { icon: { ios: 'sparkles' | 'person.fill'; android: 'spa' | 'person' }; label: string; value: string }) {
  const { theme } = useApp();
  return (
    <View style={styles.info}>
      <View style={[styles.infoIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios={icon.ios} android={icon.android} color={theme.accentText} size={17} /></View>
      <View style={styles.infoCopy}><Text style={[styles.infoLabel, { color: theme.muted }]}>{label}</Text><Text style={[styles.value, { color: theme.text }]}>{value}</Text></View>
    </View>
  );
}

function ReschedulePanel({ booking, bookingCode, token, onUpdated, labels }: { booking: Record<string, any>; bookingCode: string; token: string; onUpdated: () => void; labels: typeof copy.hy }) {
  const { theme, locale } = useApp();
  const [date, setDate] = useState(() => localDateKeyFromApi(booking.starts_at) ?? localDateKey(0));
  const [selected, setSelected] = useState<{ starts_at: string; staff_id: number }>();
  const bookingId = Number(booking.id);
  const options = useQuery({
    queryKey: ['reschedule', bookingCode, bookingId, date],
    queryFn: async () => {
      const data = await publicApi.rescheduleOptions(bookingCode, token, { booking_id: bookingId, date, staff_id: booking.staff_id ?? booking.staff?.id });
      return data.data ?? data;
    },
    enabled: Boolean(bookingId && date),
    retry: false,
  });
  const update = useMutation({
    mutationFn: () => publicApi.rescheduleBooking(bookingCode, token, { booking_id: bookingId, staff_id: selected!.staff_id, starts_at: localDateTimeInputFromApi(selected!.starts_at) }),
    onSuccess: onUpdated,
    onError: () => Alert.alert('Error'),
  });
  const slots = Array.isArray(options.data) ? options.data : (options.data?.slots ?? []);

  return (
    <View style={[styles.reschedule, { backgroundColor: theme.accentSubtle, borderColor: theme.border }]}>
      <Text style={[styles.rescheduleTitle, { color: theme.text }]}>{labels.chooseNewDate}</Text>
      <CalendarDatePicker value={date} onChange={(value) => { setDate(value); setSelected(undefined); }} />
      {options.isLoading ? <ActivityIndicator color={theme.accent} /> : (
        <View style={styles.slotGrid}>
          {slots.slice(0, 16).map((item: { starts_at: string; staff_id: number; staff_name?: string }) => {
            const isSelected = selected?.starts_at === item.starts_at && selected.staff_id === item.staff_id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={`${item.starts_at}-${item.staff_id}`}
                onPress={() => setSelected(item)}
                style={({ pressed }) => [styles.slot, { backgroundColor: isSelected ? theme.primary : theme.surfaceRaised, borderColor: isSelected ? theme.primary : theme.border, opacity: pressed ? 0.74 : 1 }]}
              >
                <Text style={[styles.slotText, { color: isSelected ? theme.onPrimary : theme.text }]}>{formatApiTime(item.starts_at, locale)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <PremiumButton title={labels.reschedule} loading={update.isPending} disabled={!selected} onPress={() => selected && update.mutate()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: 34, gap: 20 },
  headerIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  loader: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  verifyCard: { padding: 18, gap: 15 },
  securityNote: { padding: 12, borderRadius: ui.radius.medium, flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  securityCopy: { flex: 1 },
  securityTitle: ui.type.cardTitle,
  securityText: { ...ui.type.caption, marginTop: 2 },
  otpField: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: 10, textAlign: 'center' },
  bookingCard: { padding: 17, gap: 14 },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  businessIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bookingHeading: { flex: 1, alignItems: 'flex-start', gap: 7 },
  bookingTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3 },
  dateFeature: { minHeight: 78, borderRadius: ui.radius.medium, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  dateIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dateCopy: { flex: 1 },
  dateLabel: { ...ui.type.eyebrow, opacity: 0.72 },
  dateValue: { fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 3 },
  infoList: { gap: 3 },
  info: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  infoIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1 },
  infoLabel: ui.type.caption,
  value: { ...ui.type.body, fontWeight: '700', marginTop: 1 },
  connected: { minHeight: 45, borderRadius: ui.radius.small, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  connectedText: ui.type.button,
  manageActions: { gap: 10 },
  reschedule: { padding: 12, borderRadius: ui.radius.large, borderWidth: 1, gap: 12 },
  rescheduleTitle: ui.type.cardTitle,
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  slot: { minWidth: 68, minHeight: 42, paddingHorizontal: 10, borderRadius: ui.radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotText: { ...ui.type.caption, fontWeight: '800' },
});
