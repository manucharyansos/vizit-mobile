import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from '@/components/vizit-icon';
import { guestBookingStore } from '@/services/guest-booking-store';
import { publicApi } from '@/services/api/public';

export default function PaymentReturnScreen() {
  const params = useLocalSearchParams<{ status?: string; invoice_id?: string }>(); const { locale, theme } = useApp();
  const [session, setSession] = useState<{ code: string; token: string } | null>(null);
  useEffect(() => { guestBookingStore.restoreLast().then(setSession); }, []);
  const verified = useQuery({ queryKey: ['booking-payment', session?.code, params.invoice_id], queryFn: () => publicApi.paymentStatus(session!.code, params.invoice_id!, session!.token), enabled: Boolean(session && params.invoice_id), retry: 2, refetchInterval: (query) => query.state.data?.data?.status === 'pending' ? 2000 : false });
  const serverStatus = verified.data?.data?.status;
  const status = serverStatus === 'paid' ? 'success' : serverStatus === 'failed' ? 'failed' : serverStatus === 'cancelled' ? 'cancelled' : 'processing';
  const copy = { hy: { processing: ['Վճարումը ստուգվում է', 'Բանկի վերադարձը վերջնական հաստատում չէ․ սերվերը պետք է հաստատի կարգավիճակը։'], success: ['Բանկը վերադարձրել է հաջող արդյունք', 'Վերջնական կարգավիճակը հաստատվում է Vizit սերվերի կողմից։'], failed: ['Վճարումը չհաստատվեց', 'Կարող ես նորից փորձել ամրագրման բաժնից։'], cancelled: ['Վճարումը չեղարկվեց', 'Գործարքը փակվել է առանց վճարման։'], back: 'Վերադառնալ ամրագրումներին' }, ru: { processing: ['Проверяем платёж', 'Возврат из банка не является окончательным подтверждением. Статус проверяет сервер.'], success: ['Банк вернул успешный результат', 'Окончательный статус подтверждается сервером Vizit.'], failed: ['Платёж не подтверждён', 'Попробуйте снова из раздела записей.'], cancelled: ['Платёж отменён', 'Операция закрыта без оплаты.'], back: 'Вернуться к записям' }, en: { processing: ['Checking payment', 'Returning from the bank is not final confirmation. The server verifies the status.'], success: ['The bank returned success', 'The Vizit server confirms the final status.'], failed: ['Payment was not confirmed', 'Try again from your bookings.'], cancelled: ['Payment cancelled', 'The transaction closed without payment.'], back: 'Back to bookings' } }[locale];
  const [title, body] = copy[status];
  const icon = status === 'success' ? { ios: 'checkmark.circle.fill' as const, android: 'check_circle' as const, color: theme.success } : status === 'failed' ? { ios: 'xmark.circle.fill' as const, android: 'cancel' as const, color: theme.danger } : status === 'cancelled' ? { ios: 'minus.circle.fill' as const, android: 'do_not_disturb_on' as const, color: theme.muted } : { ios: 'clock.badge.questionmark.fill' as const, android: 'pending' as const, color: theme.warning };
  const iconBackground = status === 'success' ? theme.successSoft : status === 'failed' ? theme.dangerSoft : status === 'cancelled' ? theme.surface : theme.warningSoft;
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><Surface style={styles.card} elevated><View style={[styles.iconWrap, { backgroundColor: iconBackground }]}><VizitIcon ios={icon.ios} android={icon.android} color={icon.color} size={42} /></View><Text style={[styles.title, { color: theme.text }]}>{title}</Text><Text style={[styles.body, { color: theme.muted }]}>{body}</Text><PremiumButton title={copy.back} onPress={() => router.replace('/(customer)/bookings')} icon={{ ios: 'arrow.right', android: 'arrow_forward' }} style={styles.button} /></Surface></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: ui.screenGutter }, card: { padding: 24, alignItems: 'center', gap: 13 }, iconWrap: { width: 76, height: 76, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }, title: { fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' }, body: { ...ui.type.body, textAlign: 'center' }, button: { alignSelf: 'stretch', marginTop: 8 } });
