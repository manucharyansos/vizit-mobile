import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, PageHeader, PremiumButton, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: { title: 'Պլան և վճարումներ', subtitle: 'Բաժանորդագրություն և վճարման ենթակառուցվածք', billingStatus: 'Վճարման կարգավիճակ', currentPlan: 'Ընթացիկ պլան', subscription: 'Բաժանորդագրություն', provider: 'Վճարման մատակարար', usage: 'Օգտագործում', staff: 'Աշխատակիցներ', services: 'Ծառայություններ', locations: 'Մասնաճյուղեր', methods: 'Վճարման եղանակներ Հայաստանում', live: 'Ակտիվ', setup: 'Սպասում է merchant կարգավորմանը', planned: 'Միացման փուլում', plannedHint: 'Ցուցադրվում է նախապես, բայց վճարումը դեռ անջատված է մինչև backend ինտեգրումը։', idbank: 'IDBank / vPOS', idram: 'Idram Checkout', telcell: 'Telcell Wallet', easypay: 'EasyPay / easywallet', cards: 'Բանկային քարտեր', cardsHint: 'ArCa · Visa · Mastercard', loadError: 'Չհաջողվեց բեռնել վճարումների տվյալները', retry: 'Կրկին փորձել' },
  ru: { title: 'Тариф и платежи', subtitle: 'Подписка и платёжная инфраструктура', billingStatus: 'Статус оплаты', currentPlan: 'Текущий тариф', subscription: 'Подписка', provider: 'Платёжный провайдер', usage: 'Использование', staff: 'Сотрудники', services: 'Услуги', locations: 'Филиалы', methods: 'Способы оплаты в Армении', live: 'Активно', setup: 'Ожидает настройки merchant', planned: 'Подключение запланировано', plannedHint: 'Метод показан заранее, но оплата отключена до завершения backend-интеграции.', idbank: 'IDBank / vPOS', idram: 'Idram Checkout', telcell: 'Telcell Wallet', easypay: 'EasyPay / easywallet', cards: 'Банковские карты', cardsHint: 'ArCa · Visa · Mastercard', loadError: 'Не удалось загрузить данные оплаты', retry: 'Повторить' },
  en: { title: 'Plan and billing', subtitle: 'Subscription and payment infrastructure', billingStatus: 'Billing status', currentPlan: 'Current plan', subscription: 'Subscription', provider: 'Payment provider', usage: 'Usage', staff: 'Staff', services: 'Services', locations: 'Locations', methods: 'Payment methods in Armenia', live: 'Active', setup: 'Waiting for merchant setup', planned: 'Integration planned', plannedHint: 'Shown in advance, but disabled until the backend integration is complete.', idbank: 'IDBank / vPOS', idram: 'Idram Checkout', telcell: 'Telcell Wallet', easypay: 'EasyPay / easywallet', cards: 'Bank cards', cardsHint: 'ArCa · Visa · Mastercard', loadError: 'Could not load billing data', retry: 'Try again' },
};

const show = (value: unknown) => value == null || value === '' ? '—' : String(value);
const ratio = (current: unknown, limit: unknown) => `${show(current)} / ${limit == null ? '∞' : show(limit)}`;
const idbankLogo = 'https://idbank.am/upload/resize_cache/webp/images/logo.webp';
type Method = { key: string; name: string; detail?: string; active: boolean; officialLogo?: string };

export default function BillingScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const query = useQuery({ queryKey: ['business-billing'], queryFn: businessApi.billing, retry: false, refetchOnMount: 'always', staleTime: 0 });
  const data = query.data as Record<string, unknown> | undefined;
  const business = data?.business as Record<string, unknown> | undefined;
  const subscription = data?.subscription as Record<string, unknown> | undefined;
  const plan = subscription?.plan as Record<string, unknown> | undefined;
  const provider = data?.payment_provider as Record<string, unknown> | undefined;
  const usage = data?.usage as Record<string, unknown> | undefined;
  const providerName = String(provider?.default ?? '').toLocaleLowerCase();
  const providerMode = String(provider?.mode ?? '').toLocaleLowerCase();
  const idbankConfigured = providerName.includes('idbank');
  const idbankLive = idbankConfigured && providerMode === 'live';
  const methods: Method[] = [
    { key: 'idbank', name: c.idbank, detail: idbankLive ? c.live : c.setup, active: idbankLive, officialLogo: idbankLogo },
    { key: 'idram', name: c.idram, detail: c.planned, active: false },
    { key: 'telcell', name: c.telcell, detail: c.planned, active: false },
    { key: 'easypay', name: c.easypay, detail: c.planned, active: false },
    { key: 'cards', name: c.cards, detail: c.cardsHint, active: false },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Vizit Business" title={c.title} subtitle={c.subtitle} />
        {query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
          <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} onPress={() => query.refetch()} tone="secondary" />} />
        ) : (
          <>
            <Surface style={[styles.planCard, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              <View style={styles.planTop}><Text style={[styles.planEyebrow, { color: theme.onPrimary }]}>{c.currentPlan.toLocaleUpperCase()}</Text><StatusPill label={show(subscription?.status)} tone="success" /></View>
              <Text style={[styles.planName, { color: theme.onPrimary }]}>{show(plan?.name ?? plan?.code)}</Text>
              <View style={[styles.planMeta, { borderTopColor: 'rgba(255,255,255,0.16)' }]}><View><Text style={[styles.planMetaLabel, { color: theme.onPrimary }]}>{c.billingStatus}</Text><Text style={[styles.planMetaValue, { color: theme.onPrimary }]}>{show(business?.billing_status)}</Text></View><View style={styles.planMetaRight}><Text style={[styles.planMetaLabel, { color: theme.onPrimary }]}>{c.provider}</Text><Text style={[styles.planMetaValue, { color: theme.onPrimary }]}>{show(provider?.default)} · {show(provider?.mode)}</Text></View></View>
            </Surface>

            <Surface style={styles.usageCard} elevated>
              <SectionHeader title={c.usage} />
              <UsageRow label={c.staff} value={ratio(usage?.active_staff, usage?.staff_limit)} icon={{ ios: 'person.2.fill', android: 'group' }} />
              <Divider />
              <UsageRow label={c.services} value={ratio(usage?.services_count, usage?.services_limit)} icon={{ ios: 'square.grid.2x2.fill', android: 'grid_view' }} />
              <Divider />
              <UsageRow label={c.locations} value={ratio(usage?.locations_count, usage?.locations_limit)} icon={{ ios: 'mappin.and.ellipse', android: 'location_on' }} />
            </Surface>

            <SectionHeader title={c.methods} />
            <View style={styles.methods}>
              {methods.map((method) => (
                <Surface key={method.key} style={[styles.method, { borderColor: method.active ? theme.success : theme.border }]} elevated>
                  <View style={[styles.brandBox, { backgroundColor: method.active ? theme.successSoft : theme.accentSubtle }]}>
                    {method.officialLogo ? <Image source={{ uri: method.officialLogo }} style={styles.brandLogo} contentFit="contain" /> : <Text numberOfLines={2} style={[styles.brandText, { color: theme.text }]}>{method.name}</Text>}
                  </View>
                  <View style={styles.methodBody}><Text style={[styles.methodName, { color: theme.text }]}>{method.name}</Text><View style={styles.methodStatus}><StatusPill label={method.detail ?? c.planned} tone={method.active ? 'success' : 'neutral'} /></View></View>
                  <View style={[styles.lock, { backgroundColor: method.active ? theme.successSoft : theme.surface }]}><VizitIcon ios={method.active ? 'checkmark.circle.fill' : 'lock.fill'} android={method.active ? 'check_circle' : 'lock'} color={method.active ? theme.success : theme.faint} size={19} /></View>
                </Surface>
              ))}
            </View>
            <View style={[styles.note, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="info.circle.fill" android="info" color={theme.accentText} size={18} /><Text style={[styles.noteText, { color: theme.muted }]}>{c.plannedHint}</Text></View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function UsageRow({ label, value, icon }: { label: string; value: string; icon: { ios: 'person.2.fill' | 'square.grid.2x2.fill' | 'mappin.and.ellipse'; android: 'group' | 'grid_view' | 'location_on' } }) {
  const { theme } = useApp();
  return <View style={styles.usageRow}><View style={[styles.usageIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios={icon.ios} android={icon.android} color={theme.accentText} size={17} /></View><Text style={[styles.usageLabel, { color: theme.muted }]}>{label}</Text><Text style={[styles.usageValue, { color: theme.text }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, gap: 14, paddingBottom: 40 },
  loader: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  planCard: { minHeight: 190, padding: 18, justifyContent: 'space-between' },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planEyebrow: { ...ui.type.eyebrow, opacity: 0.68 },
  planName: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7, marginVertical: 16 },
  planMeta: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13, flexDirection: 'row', gap: 10 },
  planMetaRight: { flex: 1, alignItems: 'flex-end' },
  planMetaLabel: { ...ui.type.caption, opacity: 0.6 },
  planMetaValue: { ...ui.type.caption, fontWeight: '800', marginTop: 3 },
  usageCard: { padding: 14, gap: 5 },
  usageRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  usageIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  usageLabel: { ...ui.type.body, flex: 1 },
  usageValue: ui.type.cardTitle,
  methods: { gap: 9 },
  method: { minHeight: 82, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBox: { width: 84, height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 6 },
  brandLogo: { width: 74, height: 36 },
  brandText: { fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'center' },
  methodBody: { flex: 1, minWidth: 0 },
  methodName: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  methodStatus: { alignSelf: 'flex-start', marginTop: 6, maxWidth: '100%' },
  lock: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  note: { padding: 13, borderRadius: ui.radius.medium, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noteText: { ...ui.type.caption, flex: 1 },
});
