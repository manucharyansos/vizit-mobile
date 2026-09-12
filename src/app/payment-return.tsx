import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from '@/components/vizit-icon';
import { guestBookingStore } from '@/services/guest-booking-store';
import { publicApi } from '@/services/api/public';
import { normalizeResource } from '@/services/api/normalize';

const copy = {
  hy: { processing: ['Վճարումը ստուգվում է', 'Սպասիր վճարման հաստատմանը։'], success: ['Վճարումն ընդունված է', 'Քո կանխավճարը հաջողությամբ հաստատվել է։'], failed: ['Վճարումը չհաստատվեց', 'Կարող ես կրկին փորձել ամրագրման էջից։'], cancelled: ['Վճարումը չեղարկված է', 'Վերադարձիր ամրագրման էջ։'], expired: ['Վճարման ժամանակն ավարտվել է', 'Բացիր ամրագրումը՝ նոր վճարում սկսելու համար։'], unavailable: ['Կարգավիճակը հասանելի չէ', 'Բացիր քո ամրագրումը և անհրաժեշտության դեպքում հաստատիր մուտքը։'], pending: ['Սպասում ենք հաստատմանը', 'Վճարման պատասխանը դեռ չի ստացվել։ Կարող ես ավելի ուշ կրկին ստուգել։'], retry: 'Ստուգել նորից', back: 'Վերադառնալ ամրագրումներին' },
  ru: { processing: ['Проверяем платёж', 'Дождитесь подтверждения оплаты.'], success: ['Оплата принята', 'Ваша предоплата успешно подтверждена.'], failed: ['Платёж не подтверждён', 'Можно повторить оплату на странице записи.'], cancelled: ['Платёж отменён', 'Вернитесь к вашей записи.'], expired: ['Время оплаты истекло', 'Откройте запись, чтобы начать новую оплату.'], unavailable: ['Статус пока недоступен', 'Откройте вашу запись и при необходимости подтвердите доступ.'], pending: ['Ожидаем подтверждения', 'Ответ об оплате ещё не получен. Можно проверить позже.'], retry: 'Проверить снова', back: 'Вернуться к записям' },
  en: { processing: ['Checking payment', 'Please wait for payment confirmation.'], success: ['Payment received', 'Your deposit has been confirmed.'], failed: ['Payment not confirmed', 'You can try again from your booking.'], cancelled: ['Payment cancelled', 'Return to your booking.'], expired: ['Payment session expired', 'Open your booking to start a new payment.'], unavailable: ['Status unavailable', 'Open your booking and verify access if needed.'], pending: ['Awaiting confirmation', 'The payment result has not arrived yet. You can check again later.'], retry: 'Check again', back: 'Back to bookings' },
};

export default function PaymentReturnScreen() {
  const params = useLocalSearchParams<{ invoice_id?: string }>();
  const { locale, theme } = useApp(); const c = copy[locale];
  const paymentId = typeof params.invoice_id === 'string' && /^\d+$/.test(params.invoice_id) ? params.invoice_id : '';
  const stored = useQuery({ queryKey: ['guest-payment-session', paymentId], queryFn: () => guestBookingStore.restorePayment(paymentId), retry: false, staleTime: 0 });
  const session = stored.data;
  const restoring = stored.isLoading;
  const [startedAt, setStartedAt] = useState(Date.now);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTimedOut(true), 45_000); return () => clearTimeout(timer); }, [startedAt]);
  const verified = useQuery({ queryKey: ['booking-payment', session?.code, paymentId, session?.token], queryFn: async () => normalizeResource<{ status?: string }>(await publicApi.paymentStatus(session!.code, paymentId, session!.token)), enabled: Boolean(session && paymentId), retry: 1, refetchInterval: (query) => !timedOut && !query.state.error && query.state.data?.status === 'pending' ? 2500 : false });
  const serverStatus = verified.data?.status;
  // A bank/deep-link status parameter is never evidence of payment.
  const status = serverStatus === 'paid' ? 'success' : serverStatus === 'failed' || serverStatus === 'cancelled' || serverStatus === 'expired' ? serverStatus : !restoring && (!session || !paymentId || verified.isError) ? 'unavailable' : timedOut ? 'pending' : 'processing';
  const [title, body] = c[status];
  const success = status === 'success';
  const busy = status === 'processing';
  const back = async () => { if (session) await guestBookingStore.requestOpen(session.code); router.replace('/(customer)/bookings'); };
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><Surface style={styles.card} elevated>
    <View style={[styles.iconWrap, { backgroundColor: success ? theme.successSoft : theme.accentSubtle }]}>{busy ? <ActivityIndicator color={theme.accent} size="large" /> : <VizitIcon ios={success ? 'checkmark.circle.fill' : 'info.circle'} android={success ? 'check_circle' : 'info'} color={success ? theme.success : theme.accentText} size={38} />}</View>
    <Text style={[styles.title, { color: theme.text }]}>{title}</Text><Text style={[styles.body, { color: theme.muted }]}>{body}</Text>
    {(status === 'pending' || status === 'unavailable') && session ? <PremiumButton title={c.retry} loading={verified.isFetching} tone="secondary" onPress={() => { setTimedOut(false); setStartedAt(Date.now()); void verified.refetch(); }} style={styles.button} /> : null}
    <PremiumButton title={c.back} onPress={() => void back().catch(() => router.replace('/(customer)/bookings'))} style={styles.button} />
  </Surface></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: ui.screenGutter }, card: { padding: 24, alignItems: 'center', gap: 14 }, iconWrap: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, title: { ...ui.type.pageTitle, textAlign: 'center' }, body: { ...ui.type.body, textAlign: 'center' }, button: { alignSelf: 'stretch', marginTop: 4 } });
