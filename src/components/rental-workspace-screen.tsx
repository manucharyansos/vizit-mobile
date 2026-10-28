import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from './calendar-date-picker';
import { IconButton, PageHeader, PremiumButton, SectionHeader, StateCard, StatusPill, Surface } from './premium-ui';
import { RentalBookingScreen } from './rental-booking-screen';
import { ui } from '@/constants/vizit-theme';
import { useBusinessPermissions } from '@/hooks/use-business-permissions';
import { rentalCopy } from '@/i18n/rentals';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { rentalApi } from '@/services/api/rentals';
import { bookingStatusLabel } from '@/services/booking-status';
import { rentalDateKey, rentalTransitions, rentalZonedStamp, type RentalBooking } from '@/services/rentals';

export function RentalManualBooking() {
  const { user } = useBusinessPermissions();
  const { locale, theme } = useApp();
  const c = rentalCopy[locale];
  const profile = useQuery({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const rates = useQuery({ queryKey: ['business-rental-settings'], queryFn: rentalApi.settings, retry: false });
  if (profile.isLoading || rates.isLoading) return <View style={[styles.screen, { justifyContent: 'center', backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} /></View>;
  if (!profile.data || !rates.data || profile.isError || rates.isError) return <StateCard title={c.failed} action={<PremiumButton title={c.retry} onPress={() => { void profile.refetch(); void rates.refetch(); }} />} />;
  return <RentalBookingScreen manual business={{ business_id: user?.business_id ?? 0, name: profile.data.name ?? user?.business_name ?? c.title, slug: profile.data.slug ?? user?.business_slug ?? '', business_type: 'rentals', timezone: rates.data.timezone, rental: rates.data, locations: [] }} />;
}

export function RentalWorkspaceScreen({ mode = 'dashboard' }: { mode?: 'dashboard' | 'calendar' | 'analytics' }) {
  const { locale, theme } = useApp();
  const c = rentalCopy[locale];
  const cache = useQueryClient();
  const { user } = useBusinessPermissions();
  const settings = useQuery({ queryKey: ['business-rental-settings'], queryFn: rentalApi.settings, retry: false });
  const timezone = settings.data?.timezone ?? 'Asia/Yerevan';
  const [chosenDate, setDate] = useState<string>();
  const [showCalendar, setShowCalendar] = useState(mode === 'calendar');
  const date = chosenDate ?? rentalDateKey(timezone);
  const from = mode === 'calendar' ? date : date.slice(0, 7) + '-01';
  const to = mode === 'calendar' ? date : (() => { const [year, month] = date.split('-').map(Number); return `${date.slice(0, 7)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`; })();
  const bookings = useQuery({ queryKey: ['business-rental-bookings', from, to], queryFn: () => rentalApi.bookings(from, to), enabled: settings.isSuccess, retry: false, staleTime: 0, refetchInterval: 15000 });
  const summary = useQuery({ queryKey: ['business-rental-summary', from, to], queryFn: () => rentalApi.summary(from, to), enabled: settings.isSuccess && mode !== 'calendar', retry: false });
  const refresh = () => Promise.all([bookings.refetch(), mode !== 'calendar' ? summary.refetch() : Promise.resolve()]);
  const update = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => rentalApi.update(id, { status }), onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['business-rental-bookings'] }), cache.invalidateQueries({ queryKey: ['business-rental-summary'] }), cache.invalidateQueries({ queryKey: ['business-clients'] }), cache.invalidateQueries({ queryKey: ['business-client'] }), cache.invalidateQueries({ queryKey: ['rental-public-availability'] }), cache.invalidateQueries({ queryKey: ['business-rental-availability'] })]); }, onError: (error) => Alert.alert(c.failed, apiErrorMessage(error)) });
  const actionLabel = (status: string) => ({ confirmed: c.confirmed, in_progress: c.in_progress, completed: c.completedAction, cancelled: c.cancelled, no_show: c.no_show }[status] || status);
  const run = (booking: RentalBooking, status: string) => Alert.alert(actionLabel(status), c.actionConfirm, [{ text: c.back, style: 'cancel' }, { text: actionLabel(status), style: status === 'cancelled' ? 'destructive' : 'default', onPress: () => update.mutate({ id: booking.id, status }) }]);
  const money = (amount: number | undefined) => amount == null ? '—' : `${amount.toLocaleString(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US')} ֏`;
  const data = summary.data;
  const metrics = data ? [[c.count, String(data.bookings_count)], [c.booked, money(data.booked_amount)], [c.received, money(data.net_received)], [c.outstanding, money(data.outstanding_amount)], [c.occupancy, `${data.occupancy_percent}%`], ...(mode === 'analytics' ? [[c.completed, money(data.completed_amount)], [c.refunds, money(data.refunded_amount)], [c.refundDue, money(data.refund_due)]] : [])] : [];
  const error = settings.error ?? bookings.error ?? summary.error;
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={bookings.isRefetching || summary.isRefetching} onRefresh={() => void refresh()} tintColor={theme.accent} />}>
      <PageHeader eyebrow="Vizit Business" title={mode === 'calendar' ? c.calendar : mode === 'analytics' ? c.analytics : c.dashboard} subtitle={user?.business_name} action={<IconButton accessibilityLabel={c.newBooking} ios="plus" android="add" tone="primary" onPress={() => router.push('/(business)/new-booking')} />} />
      <Surface style={[styles.period, { backgroundColor: theme.cover, borderColor: theme.cover }]}>
        <View style={styles.flex}><Text style={[styles.caption, { color: theme.coverMuted }]}>{mode === 'calendar' ? c.date : c.period}</Text><Text style={[styles.periodTitle, { color: theme.coverText }]}>{from === to ? from : `${from} — ${to}`}</Text></View>
        <PremiumButton title={c.date} compact tone="secondary" onPress={() => setShowCalendar((value) => !value)} />
      </Surface>
      {showCalendar ? <CalendarDatePicker value={date} minDate="" onChange={(value) => { setDate(value); setShowCalendar(false); }} /> : null}
      {settings.isLoading || bookings.isLoading || mode !== 'calendar' && summary.isLoading ? <ActivityIndicator color={theme.accent} accessibilityLabel={c.loading} /> : null}
      {error ? <StateCard title={c.failed} message={apiErrorMessage(error)} tone="danger" action={<PremiumButton title={c.retry} onPress={() => { void settings.refetch(); void refresh(); }} tone="secondary" />} /> : null}
      {metrics.length ? <View style={styles.metrics}>{metrics.map(([label, value]) => <Surface key={label} style={styles.metric}><Text style={[styles.caption, { color: theme.muted }]}>{label}</Text><Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text></Surface>)}</View> : null}
      {mode !== 'calendar' ? <Text style={[styles.caption, { color: theme.muted }]}>{c.financeHint}</Text> : null}
      <SectionHeader title={c.count} detail={`${bookings.data?.length ?? 0}`} />
      {bookings.isSuccess && bookings.data.length === 0 ? <StateCard title={c.empty} action={<PremiumButton title={c.newBooking} onPress={() => router.push('/(business)/new-booking')} tone="secondary" />} /> : null}
      {bookings.data?.map((booking) => <Surface key={booking.id} style={styles.stack} elevated>
        <View style={styles.row}><Text style={[styles.client, { color: theme.text }]}>{booking.client_name}</Text><StatusPill label={bookingStatusLabel(booking.status, locale)} tone={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'neutral'} /></View>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{c.arrival}: {rentalZonedStamp(booking.starts_at, locale, timezone)}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{c.departure}: {rentalZonedStamp(booking.ends_at, locale, timezone)}</Text>
        <View style={[styles.balance, { backgroundColor: theme.surface }]}><Text style={[styles.body, { color: theme.text }]}>{c.total}: {money(booking.final_price)}</Text><Text style={[styles.caption, { color: theme.muted }]}>{c.outstanding}: {money(booking.outstanding_amount)}</Text></View>
        <PremiumButton title={booking.client_phone} compact tone="ghost" icon={{ ios: 'phone.fill', android: 'call' }} onPress={() => void Linking.openURL(`tel:${booking.client_phone.replace(/[^+\d]/g, '')}`).catch(() => Alert.alert(c.failed))} />
        {booking.notes ? <Text style={[styles.body, { color: theme.textSecondary }]}>{booking.notes}</Text> : null}
        <View style={styles.actions}>{rentalTransitions(booking).map((status) => <PremiumButton key={status} title={actionLabel(status)} compact tone={status === 'cancelled' ? 'danger' : 'secondary'} disabled={update.isPending} onPress={() => run(booking, status)} />)}</View>
      </Surface>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: ui.screenGutter, paddingBottom: 32, gap: 18 }, stack: { gap: 12 }, flex: { flex: 1 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, period: { flexDirection: 'row', alignItems: 'center', gap: 12 }, periodTitle: { ...ui.type.cardTitle, marginTop: 5 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flexGrow: 1, flexBasis: '45%', gap: 8 }, metricValue: { fontSize: 22, lineHeight: 29, fontWeight: '700', flexShrink: 1 }, client: { ...ui.type.cardTitle, flexShrink: 1 }, body: ui.type.body, caption: ui.type.caption, balance: { gap: 6, padding: 12, borderRadius: ui.radius.small }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
