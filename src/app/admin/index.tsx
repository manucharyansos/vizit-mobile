import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { adminCopy } from '@/i18n/admin';
import { useApp } from '@/providers/app-provider';
import { adminApi, type AdminBusinessRow } from '@/services/api/admin';
import { PUBLIC_WEB_URL, apiErrorMessage } from '@/services/api/client';
import { adminDate, adminMoney } from '@/services/admin-format';

export default function AdminHome() {
  const { locale, theme } = useApp();
  const c = adminCopy[locale];
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const dashboard = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminApi.dashboard('30_days') });
  const list = useInfiniteQuery({
    queryKey: ['admin-businesses', search.trim()],
    queryFn: ({ pageParam }) => adminApi.businesses({ search: search.trim() || undefined, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  });
  const rows = list.data?.pages.flatMap((page) => page.data) ?? [];
  const d = dashboard.data;

  const logout = async () => {
    await adminApi.logout();
    cache.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('admin-') });
    router.replace('/login' as Href);
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={dashboard.isRefetching || list.isRefetching} onRefresh={() => { void dashboard.refetch(); void list.refetch(); }} tintColor={theme.accent} />}>
      <PageHeader eyebrow={c.eyebrow} title={c.dashboard} subtitle={c.period}
        action={<IconButton ios="rectangle.portrait.and.arrow.right" android="logout" accessibilityLabel={c.logout} onPress={() => void logout()} />} />

      {dashboard.isError ? <StateCard tone="danger" title={c.loadError} message={apiErrorMessage(dashboard.error)} action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void dashboard.refetch()} />} /> : null}
      {dashboard.isPending ? <ActivityIndicator color={theme.accent} /> : d ? <>
        <View style={styles.grid}>
          <Stat label={c.businesses} value={String(d.businesses.total)} hint={`${c.active} ${d.businesses.active} · ${c.newOnes} ${d.businesses.new}`} icon={{ ios: 'building.2', android: 'domain' }} />
          <Stat label={c.subscriptions} value={String(d.subscriptions.active)} hint={`${c.trialing} ${d.subscriptions.trialing}`} icon={{ ios: 'creditcard', android: 'credit_card' }} />
          <Stat label={c.bookings} value={String(d.bookings.period_total)} hint={`${c.today} ${d.bookings.today}`} icon={{ ios: 'calendar', android: 'calendar_month' }} />
          <Stat label={c.mrr} value={adminMoney(d.subscriptions.mrr, locale)} hint={`${c.renewals}: ${d.subscriptions.renewals_due_30d}`} icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' }} />
        </View>
        <Surface style={styles.stack}>
          <Text style={[styles.caption, { color: theme.muted }]}>{c.turnover}</Text>
          <Text style={[styles.big, { color: theme.text }]}>{adminMoney(d.revenue.period_total, locale)}</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>{c.turnoverHint}</Text>
          {d.subscriptions.expiring_trials_7d ? <StatusPill tone="warning" label={`${c.expiring}: ${d.subscriptions.expiring_trials_7d}`} /> : null}
        </Surface>
      </> : null}

      <SectionHeader title={c.businesses} detail={list.data ? `${c.total}: ${list.data.pages[0]?.total ?? 0}` : undefined} />
      <PremiumInput label={c.search} value={search} onChangeText={setSearch} placeholder={c.search} autoCapitalize="none" autoCorrect={false} icon={{ ios: 'magnifyingglass', android: 'search' }} />
      {list.isError ? <StateCard tone="danger" title={c.loadError} message={apiErrorMessage(list.error)} action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void list.refetch()} />} /> : null}
      {list.isPending ? <ActivityIndicator color={theme.accent} /> : rows.length === 0 && !list.isError ? <StateCard title={c.empty} /> : null}
      {rows.map((row) => <BusinessRow key={row.id} row={row} />)}
      {list.hasNextPage ? <PremiumButton title={c.more} tone="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
      <PremiumButton title={c.openWeb} tone="ghost" icon={{ ios: 'safari', android: 'open_in_new' }} onPress={() => void Linking.openURL(`${PUBLIC_WEB_URL}/admin/dashboard`)} />
    </ScrollView>
  </SafeAreaView>;
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: { ios: string; android: string } }) {
  const { theme } = useApp();
  return <Surface style={styles.stat}>
    <View style={styles.row}><VizitIcon ios={icon.ios as never} android={icon.android as never} color={theme.accentText} size={18} /><Text numberOfLines={1} style={[styles.caption, { color: theme.muted, flex: 1 }]}>{label}</Text></View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    <Text numberOfLines={2} style={[styles.caption, { color: theme.muted }]}>{hint}</Text>
  </Surface>;
}

function BusinessRow({ row }: { row: AdminBusinessRow }) {
  const { locale, theme } = useApp();
  const c = adminCopy[locale];
  const sub = row.subscription_summary;
  const until = sub?.status === 'trialing' ? sub.trial_ends_at : sub?.current_period_ends_at;
  return <Pressable accessibilityRole="button" onPress={() => router.push(`/admin/business/${row.id}` as Href)} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
    <Surface style={styles.stack}>
      <View style={styles.between}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{row.name}</Text>
        <StatusPill tone={row.status === 'active' ? 'success' : row.status === 'suspended' ? 'danger' : 'warning'} label={c.statuses[row.status] ?? row.status} />
      </View>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {sub ? `${sub.plan?.name ?? c.noPlan} · ${c.statuses[sub.status] ?? sub.status}${until ? ` · ${c.until} ${adminDate(until, locale)}` : ''}` : c.noPlan}
      </Text>
      {row.owner_summary ? <Text numberOfLines={2} style={[styles.caption, { color: theme.muted }]}>{[row.owner_summary.name, row.owner_summary.phone, row.owner_summary.email].filter(Boolean).join(' · ')}</Text> : null}
      <Text style={[styles.caption, { color: theme.muted }]}>{c.registered} {adminDate(row.created_at, locale)} · {c.bookings} {row.bookings_count ?? 0}</Text>
    </Surface>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: ui.screenGutter, paddingBottom: 40, gap: 14 }, stack: { gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, stat: { flexBasis: '47%', flexGrow: 1, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statValue: { fontSize: 22, lineHeight: 28, fontWeight: '800' }, big: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  title: { ...ui.type.cardTitle, flex: 1 }, body: ui.type.body, caption: ui.type.caption,
});
