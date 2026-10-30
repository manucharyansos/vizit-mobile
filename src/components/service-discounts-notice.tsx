import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useClientSession } from '@/hooks/use-client-session';
import { useApp } from '@/providers/app-provider';
import type { ServiceDiscountTiers } from '@/services/api/business';
import { clientAuthClient } from '@/services/api/client';
import { normalizeResource } from '@/services/api/normalize';

type Progress = { visits: number; current_percent: number; next: { min_visits: number; percent: number; remaining: number } | null };

const copy = {
  hy: { title: 'Զեղչեր', visit: (n: number, p: number) => `${n} ավարտված այցից հետո՝ −${p}%`, bundle: (n: number, p: number) => `${n} և ավելի ծառայություն մեկ այցում՝ −${p}%`,
    progress: (v: number, n: number) => `Դուք ունեք ${v} ավարտված այց։ Եվս ${n}-ը՝ հաջորդ զեղչին։`, current: (p: number) => `Ձեր զեղչը՝ ${p}%`, best: 'Եթե երկու զեղչն էլ կիրառելի է, գործում է մեծը։' },
  ru: { title: 'Скидки', visit: (n: number, p: number) => `после ${n} завершённых визитов — −${p}%`, bundle: (n: number, p: number) => `${n} и более услуг за визит — −${p}%`,
    progress: (v: number, n: number) => `У вас ${v} завершённых визитов. До следующей скидки — ещё ${n}.`, current: (p: number) => `Ваша скидка — ${p}%`, best: 'Если подходят обе скидки, действует большая.' },
  en: { title: 'Discounts', visit: (n: number, p: number) => `after ${n} completed visits: −${p}%`, bundle: (n: number, p: number) => `${n}+ services in one visit: −${p}%`,
    progress: (v: number, n: number) => `You have ${v} completed visits. ${n} more to the next discount.`, current: (p: number) => `Your discount: ${p}%`, best: 'If both apply, the larger discount is used.' },
};

/** The business's discount levels and, for a signed-in client, their visit progress. */
export function ServiceDiscountsNotice({ slug, discounts }: { slug: string; discounts?: ServiceDiscountTiers | null }) {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const session = useClientSession();
  const progress = useQuery({
    queryKey: ['client-discount-progress', slug],
    queryFn: async () => normalizeResource<Progress>((await clientAuthClient.get(`/client/discounts/${encodeURIComponent(slug)}`)).data),
    enabled: Boolean(session.data && discounts?.visit_tiers.length),
    retry: false,
    staleTime: 60_000,
  });
  if (!discounts) return null;
  const lines = [...discounts.visit_tiers.map((tier) => c.visit(tier.min_visits, tier.percent)), ...discounts.bundle_tiers.map((tier) => c.bundle(tier.min_services, tier.percent))];
  const data = progress.data;
  const nextTier = data?.next;
  const ratio = nextTier ? Math.min(1, data.visits / nextTier.min_visits) : 1;

  return <Surface style={[styles.card, { backgroundColor: theme.accentSubtle, borderColor: theme.accent }]}>
    <View style={styles.titleRow}><VizitIcon ios="tag.fill" android="sell" color={theme.accentText} size={18} /><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text></View>
    {lines.map((line) => <Text key={line} style={[styles.line, { color: theme.textSecondary }]}>{line}</Text>)}
    {data ? <View style={styles.progress}>
      {data.current_percent ? <Text style={[styles.strong, { color: theme.success }]}>{c.current(data.current_percent)}</Text> : null}
      {nextTier ? <>
        <Text style={[styles.line, { color: theme.text }]}>{c.progress(data.visits, nextTier.remaining)}</Text>
        <View style={[styles.track, { backgroundColor: theme.border }]}><View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: theme.accent }]} /></View>
      </> : null}
    </View> : null}
    {discounts.visit_tiers.length && discounts.bundle_tiers.length ? <Text style={[styles.caption, { color: theme.muted }]}>{c.best}</Text> : null}
  </Surface>;
}

const styles = StyleSheet.create({
  card: { gap: 6, borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: ui.type.cardTitle,
  line: ui.type.body,
  strong: { ...ui.type.body, fontWeight: '800' },
  caption: ui.type.caption,
  progress: { gap: 6, marginTop: 4 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
