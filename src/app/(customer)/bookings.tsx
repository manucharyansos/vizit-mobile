import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuestBookingDetail } from '@/components/guest-booking-detail';
import { PageHeader, PremiumButton, StateCard, StatusPill } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useClientSession } from '@/hooks/use-client-session';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';
import { guestBookingStore, type GuestBookingSummary } from '@/services/guest-booking-store';
import { apiDateToLocal, formatApiDateTime } from '@/services/date-time';
import { bookingStatusLabel, isBookingTerminal } from '@/services/booking-status';

const copy = {
  hy: { title: 'Իմ ամրագրումները', upcoming: 'Առաջիկա', history: 'Պատմություն', empty: 'Առաջիկա այցեր չկան', historyEmpty: 'Պատմությունը դեռ դատարկ է', hint: 'Ընտրիր ծառայություն և քեզ հարմար ժամանակը։', booking: 'Ամրագրում', open: 'Բացել ամրագրումը', retry: 'Կրկին փորձել', login: 'Մուտք գործել', guest: 'Այս սարքի ամրագրումները', accountHint: 'Մուտք գործիր՝ նաև քո հաշվի այցերը տեսնելու համար։' },
  ru: { title: 'Мои записи', upcoming: 'Предстоящие', history: 'История', empty: 'Пока нет предстоящих визитов', historyEmpty: 'История пока пуста', hint: 'Найдите услугу и выберите удобное время.', booking: 'Запись', open: 'Открыть запись', retry: 'Повторить', login: 'Войти', guest: 'Записи на этом устройстве', accountHint: 'Войдите, чтобы увидеть также визиты из вашего аккаунта.' },
  en: { title: 'My bookings', upcoming: 'Upcoming', history: 'History', empty: 'No upcoming visits', historyEmpty: 'Your history is empty', hint: 'Find a service and choose a time that suits you.', booking: 'Booking', open: 'Open booking', retry: 'Try again', login: 'Sign in', guest: 'Bookings on this device', accountHint: 'Sign in to also see visits from your account.' },
};
type Visit = { key: string; code?: string; accountId?: number; summary: GuestBookingSummary };

export default function BookingsScreen() {
  const { locale, theme, t } = useApp();
  const c = copy[locale];
  const session = useClientSession();
  const guests = useQuery({ queryKey: ['guest-booking-history'], queryFn: () => guestBookingStore.listGuestBookings() });
  const account = useQuery({ queryKey: ['client-bookings'], queryFn: clientAccountApi.bookings, enabled: session.data === true, retry: false });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const [now, setNow] = useState(Date.now);
  const previousSession = useRef(session.data);
  useEffect(() => {
    if (previousSession.current && session.data === false) setSelectedCode(null);
    previousSession.current = session.data;
  }, [session.data]);
  const { refetch: refetchGuests } = guests;
  const { refetch: refetchAccount } = account;
  const refresh = useCallback(() => {
    setNow(Date.now());
    void refetchGuests();
    if (session.data) void refetchAccount();
  }, [refetchGuests, refetchAccount, session.data]);
  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));
  useFocusEffect(useCallback(() => {
    let active = true;
    void guestBookingStore.consumeRequestedCode().then((code) => { if (active && code) setSelectedCode(code); }).catch(() => undefined);
    return () => { active = false; };
  }, []));
  useFocusEffect(useCallback(() => {
    if (!selectedCode) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { setSelectedCode(null); refresh(); return true; });
    return () => handler.remove();
  }, [selectedCode, refresh]));

  const visits = useMemo(() => {
    const local: Visit[] = (guests.data ?? []).map((item) => ({ key: `guest-${item.code}`, code: item.code, summary: item.summary }));
    const guestIds = new Set(local.flatMap((item) => item.summary.bookingIds ?? []));
    const cabinet: Visit[] = (session.data ? account.data ?? [] : []).filter((item) => !guestIds.has(item.id)).map((item) => ({ key: `account-${item.id}`, accountId: item.id, summary: { businessName: item.business?.name, serviceName: item.service?.name, staffName: item.staff?.name, startsAt: item.starts_at, status: item.status } }));
    return [...local, ...cabinet];
  }, [guests.data, account.data, session.data]);
  const isPast = (item: Visit) => isBookingTerminal(item.summary.status) || (apiDateToLocal(item.summary.startsAt)?.getTime() ?? Infinity) < now;
  const futureCount = visits.filter((item) => !isPast(item)).length;
  const visible = visits.filter((item) => isPast(item) === history).sort((a, b) => {
    const left = apiDateToLocal(a.summary.startsAt)?.getTime() ?? 0;
    const right = apiDateToLocal(b.summary.startsAt)?.getTime() ?? 0;
    return history ? right - left : left - right;
  });
  const open = async (item: Visit) => {
    if (opening) return;
    setOpening(item.key);
    try {
      const code = item.code ?? await guestBookingStore.restoreClientBookingReference(item.accountId!);
      if (!code) throw new Error('Unavailable booking');
      setSelectedCode(code);
    } catch { Alert.alert(t('loadError'), c.retry); }
    finally { setOpening(null); }
  };
  if (selectedCode) return <GuestBookingDetail key={selectedCode} code={selectedCode} onBack={() => { setSelectedCode(null); refresh(); }} />;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={visible} keyExtractor={(item) => item.key} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content} refreshing={guests.isRefetching || account.isRefetching} onRefresh={refresh}
        ListHeaderComponent={<View style={styles.header}>
          <PageHeader eyebrow="Vizit" title={c.title} subtitle={session.data ? undefined : c.guest} />
          <View style={[styles.segments, { backgroundColor: theme.surface }]}>
            {[false, true].map((past) => <Pressable key={String(past)} accessibilityRole="tab" accessibilityState={{ selected: history === past }} onPress={() => setHistory(past)} style={[styles.segment, history === past && { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
              <Text style={[styles.segmentText, { color: history === past ? theme.text : theme.muted }]}>{past ? c.history : c.upcoming} · {past ? visits.length - futureCount : futureCount}</Text>
            </Pressable>)}
          </View>
          {guests.isError || (session.data && account.isError) ? <StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={c.retry} onPress={refresh} tone="secondary" />} /> : null}
        </View>}
        ListEmptyComponent={guests.isLoading || session.isLoading || (session.data && account.isLoading) ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : <StateCard title={history ? c.historyEmpty : c.empty} message={c.hint} icon={{ ios: 'calendar.badge.plus', android: 'event_available' }} action={<PremiumButton title={t('bookNow')} onPress={() => router.navigate('/(customer)/discover')} />} />}
        ListFooterComponent={!session.data && !session.isLoading ? <View style={styles.footer}><Text style={[styles.hint, { color: theme.muted }]}>{c.accountHint}</Text><PremiumButton title={c.login} onPress={() => router.push('/login')} tone="secondary" /></View> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.summary.businessName ?? c.booking}, ${formatApiDateTime(item.summary.startsAt, locale)}, ${c.open}`} disabled={opening !== null} onPress={() => void open(item)} style={({ pressed }) => [styles.visit, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow, opacity: pressed ? 0.75 : 1 }]}>
          <View style={[styles.visitAccent, { backgroundColor: isPast(item) ? theme.borderStrong : theme.accent }]} />
          <View style={styles.visitTop}><Text style={[styles.business, { color: theme.text }]}>{item.summary.businessName ?? c.booking}</Text><VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={20} /></View>
          <View style={styles.dateRow}><VizitIcon ios="calendar" android="event" color={theme.accentText} size={18} /><Text style={[styles.date, { color: theme.text }]}>{item.summary.startsAt ? formatApiDateTime(item.summary.startsAt, locale) : c.open}</Text></View>
          {item.summary.serviceName ? <Text numberOfLines={2} style={[styles.service, { color: theme.muted }]}>{item.summary.serviceName}{item.summary.staffName ? ` · ${item.summary.staffName}` : ''}</Text> : null}
          <View style={styles.visitBottom}><StatusPill label={bookingStatusLabel(item.summary.status, locale)} tone={isBookingTerminal(item.summary.status) ? 'neutral' : item.summary.status === 'confirmed' ? 'success' : 'warning'} />{opening === item.key ? <ActivityIndicator color={theme.accent} /> : null}</View>
        </Pressable>}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: ui.screenGutter, paddingBottom: 32 }, header: { gap: 18, marginBottom: 16 },
  segments: { flexDirection: 'row', padding: 4, borderRadius: ui.radius.medium, gap: 4 }, segment: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: 'transparent', borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center', padding: 6 }, segmentText: ui.type.button,
  visit: { borderWidth: 1, borderRadius: ui.radius.large, padding: 18, paddingLeft: 22, gap: 10, overflow: 'hidden', ...ui.shadow.card }, visitAccent: { position: 'absolute', top: 18, bottom: 18, left: 0, width: 3, borderRadius: 3 },
  visitTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, business: { ...ui.type.cardTitle, flex: 1 }, dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, date: { ...ui.type.body, fontWeight: '700', flex: 1 }, service: ui.type.body,
  visitBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, separator: { height: 12 }, loader: { padding: 36 }, footer: { paddingTop: 24, gap: 12 }, hint: { ...ui.type.body, textAlign: 'center' },
});
