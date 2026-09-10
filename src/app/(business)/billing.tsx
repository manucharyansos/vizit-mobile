import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: ['Պլան և վճարումներ', 'Վճարման կարգավիճակ', 'Ընթացիկ պլան', 'Բաժանորդագրություն', 'Վճարման մատակարար', 'Օգտագործում', 'Աշխատակիցներ', 'Ծառայություններ', 'Մասնաճյուղեր', 'IDBank live վճարումները կակտիվացվեն merchant կարգավորումներից հետո։', 'Չհաջողվեց բեռնել վճարումների տվյալները', 'Կրկին փորձել'],
  ru: ['Тариф и платежи', 'Статус оплаты', 'Текущий тариф', 'Подписка', 'Платёжный провайдер', 'Использование', 'Сотрудники', 'Услуги', 'Филиалы', 'Live-платежи IDBank будут активированы после настройки merchant-данных.', 'Не удалось загрузить данные оплаты', 'Повторить'],
  en: ['Plan and billing', 'Billing status', 'Current plan', 'Subscription', 'Payment provider', 'Usage', 'Staff', 'Services', 'Locations', 'IDBank live payments will be enabled after merchant credentials are configured.', 'Could not load billing data', 'Try again'],
};
const show = (v: unknown) => v == null || v === '' ? '—' : String(v);
const ratio = (current: unknown, limit: unknown) => `${show(current)} / ${limit == null ? '∞' : show(limit)}`;

export default function BillingScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const query = useQuery({ queryKey: ['business-billing'], queryFn: businessApi.billing, retry: false, refetchOnMount: 'always' });
  const data = query.data as Record<string, unknown> | undefined;
  const business = data?.business as Record<string, unknown> | undefined;
  const subscription = data?.subscription as Record<string, unknown> | undefined;
  const plan = subscription?.plan as Record<string, unknown> | undefined;
  const provider = data?.payment_provider as Record<string, unknown> | undefined;
  const usage = data?.usage as Record<string, unknown> | undefined;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text>{query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '900' }}>{c[10]}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{apiErrorMessage(query.error)}</Text><Pressable onPress={() => query.refetch()}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c[11]}</Text></Pressable></View> : <><View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.label, { color: theme.muted }]}>{c[1]}</Text><Text style={[styles.value, { color: theme.text }]}>{show(business?.billing_status)}</Text><Text style={[styles.label, { color: theme.muted }]}>{c[2]}</Text><Text style={[styles.value, { color: theme.plum }]}>{show(plan?.name ?? plan?.code)}</Text><Text style={[styles.label, { color: theme.muted }]}>{c[3]}</Text><Text style={[styles.value, { color: theme.text }]}>{show(subscription?.status)}</Text><Text style={[styles.label, { color: theme.muted }]}>{c[4]}</Text><Text style={[styles.value, { color: theme.text }]}>{show(provider?.default)} · {show(provider?.mode)}</Text></View><View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>{c[5]}</Text><UsageRow label={c[6]} value={ratio(usage?.active_staff, usage?.staff_limit)} /><UsageRow label={c[7]} value={ratio(usage?.services_count, usage?.services_limit)} /><UsageRow label={c[8]} value={ratio(usage?.locations_count, usage?.locations_limit)} /></View><Text style={[styles.note, { color: theme.muted, backgroundColor: theme.plumSoft }]}>{c[9]}</Text></>}</ScrollView></SafeAreaView>;
}
function UsageRow({ label, value }: { label: string; value: string }) { const { theme } = useApp(); return <View style={styles.usageRow}><Text style={{ color: theme.muted, fontWeight: '700' }}>{label}</Text><Text style={{ color: theme.text, fontWeight: '900' }}>{value}</Text></View>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, gap: 12 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 8 }, card: { borderWidth: 1, borderRadius: 11, padding: 16, gap: 7 }, label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 5 }, value: { fontSize: 18, fontWeight: '900' }, sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 5 }, usageRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, note: { padding: 14, borderRadius: 10, lineHeight: 20 }, error: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 } });