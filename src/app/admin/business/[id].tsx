import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { adminCopy } from '@/i18n/admin';
import { useApp } from '@/providers/app-provider';
import { adminApi } from '@/services/api/admin';
import { PUBLIC_WEB_URL, apiErrorMessage } from '@/services/api/client';
import { adminDate, adminMoney } from '@/services/admin-format';

export default function AdminBusinessScreen() {
  const { locale, theme } = useApp();
  const c = adminCopy[locale];
  const cache = useQueryClient();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const detail = useQuery({ queryKey: ['admin-business', id], queryFn: () => adminApi.business(id), enabled: Number.isFinite(id) });
  const toggle = useMutation({
    mutationFn: (action: 'suspend' | 'restore') => (action === 'suspend' ? adminApi.suspend(id) : adminApi.restore(id)),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ['admin-business', id] }); await cache.invalidateQueries({ queryKey: ['admin-businesses'] }); await cache.invalidateQueries({ queryKey: ['admin-dashboard'] }); },
    onError: (error) => Alert.alert(c.loadError, apiErrorMessage(error)),
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/admin' as Href));

  if (detail.isPending) return <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} /></SafeAreaView>;
  if (detail.isError || !detail.data) return <SafeAreaView style={[styles.screen, styles.content, { backgroundColor: theme.background }]}><PageHeader title={c.businesses} onBack={back} /><StateCard tone="danger" title={c.loadError} message={apiErrorMessage(detail.error)} action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void detail.refetch()} />} /></SafeAreaView>;

  const { business, subscription: sub, seats, stats, team = [], pricing_overrides: offers = [], billing } = detail.data;
  const owner = team.find((member) => member.role === 'owner');
  const until = sub?.status === 'trialing' ? sub.trial_ends_at : sub?.current_period_ends_at;
  const suspended = business.status === 'suspended';

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <PageHeader eyebrow={c.eyebrow} title={business.name} subtitle={`${business.slug}${business.created_at ? ` · ${c.registered} ${adminDate(business.created_at, locale)}` : ''}`} onBack={back} />
      <View style={styles.row}><StatusPill tone={suspended ? 'danger' : business.status === 'active' ? 'success' : 'warning'} label={c.statuses[business.status] ?? business.status} /></View>

      <Surface style={styles.stack}>
        <SectionHeader title={c.plan} />
        <Text style={[styles.title, { color: theme.text }]}>{sub?.plan?.name ?? c.noPlan}</Text>
        {sub ? <Text style={[styles.body, { color: theme.textSecondary }]}>{c.statuses[sub.status] ?? sub.status}{until ? ` · ${c.until} ${adminDate(until, locale)}` : ''}{sub.pricing?.effective_monthly_price != null ? ` · ${adminMoney(sub.pricing.effective_monthly_price, locale)}` : ''}</Text> : null}
        {seats ? <Text style={[styles.caption, { color: theme.muted }]}>{c.seats}: {seats.active} / {seats.limit}</Text> : null}
      </Surface>

      <Surface style={styles.stack}>
        <SectionHeader title={c.owner} />
        {owner ? <><Text style={[styles.body, { color: theme.text }]}>{owner.name}</Text>{owner.email ? <Text style={[styles.caption, { color: theme.muted }]}>{owner.email}</Text> : null}</> : <Text style={[styles.caption, { color: theme.muted }]}>—</Text>}
        {business.phone ? <Text style={[styles.caption, { color: theme.muted }]}>{business.phone}</Text> : null}
        {business.address ? <Text style={[styles.caption, { color: theme.muted }]}>{business.address}</Text> : null}
        <Text style={[styles.caption, { color: theme.muted }]}>{c.team}: {team.length} · {c.bookings}: {stats?.bookings_total ?? 0}</Text>
      </Surface>

      {offers.length ? <Surface style={styles.stack}>
        <SectionHeader title={c.offers} />
        {offers.map((offer) => <Text key={offer.id} style={[styles.body, { color: theme.textSecondary }]}>{offer.plan?.name ?? '—'} · {adminMoney(offer.effective_monthly_price, locale)} · {c.statuses[offer.state ?? ''] ?? offer.state ?? ''} · {adminDate(offer.starts_at, locale)} – {adminDate(offer.ends_at, locale)}</Text>)}
      </Surface> : null}

      <Surface style={styles.stack}>
        <SectionHeader title={c.invoices} />
        {billing ? <Text style={[styles.caption, { color: theme.muted }]}>{c.paidTotal}: {adminMoney(billing.paid_total, locale)} · {c.pendingTotal}: {adminMoney(billing.pending_total, locale)}</Text> : null}
        {billing?.invoices?.length ? billing.invoices.slice(0, 8).map((invoice) => <Text key={invoice.id} style={[styles.body, { color: theme.textSecondary }]}>#{invoice.id} · {adminMoney(invoice.amount, locale)} · {c.statuses[invoice.status] ?? invoice.status} · {adminDate(invoice.created_at, locale)}</Text>) : <Text style={[styles.caption, { color: theme.muted }]}>{c.noInvoices}</Text>}
      </Surface>

      <PremiumButton
        title={suspended ? c.restore : c.suspend}
        tone={suspended ? 'primary' : 'secondary'}
        loading={toggle.isPending}
        onPress={() => {
          if (suspended) { toggle.mutate('restore'); return; }
          Alert.alert(c.suspend, c.suspendConfirm, [{ text: c.cancel, style: 'cancel' }, { text: c.confirm, style: 'destructive', onPress: () => toggle.mutate('suspend') }]);
        }}
      />
      <PremiumButton title={c.openWeb} tone="ghost" icon={{ ios: 'safari', android: 'open_in_new' }} onPress={() => void Linking.openURL(`${PUBLIC_WEB_URL}/admin/businesses/${business.id}`)} />
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { alignItems: 'center', justifyContent: 'center' }, content: { padding: ui.screenGutter, paddingBottom: 40, gap: 14 },
  stack: { gap: 6 }, row: { flexDirection: 'row', gap: 8 }, title: ui.type.cardTitle, body: ui.type.body, caption: ui.type.caption,
});
