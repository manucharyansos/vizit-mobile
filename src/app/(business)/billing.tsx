import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, PageHeader, PremiumButton, SectionHeader, StateCard, StatusPill, Surface, type StatusTone } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, type BillingInvoice, type BillingPlan } from '@/services/api/business';
import { checkoutUrlFrom } from '@/services/payments';
import { apiErrorMessage } from '@/services/api/client';
import { isRentalBusiness } from '@/services/rentals';

const copy = {
  hy: { title: 'Պլան և վճարումներ', subtitle: 'Բաժանորդագրություն և վճարման ենթակառուցվածք', billingStatus: 'Վճարման կարգավիճակ', currentPlan: 'Ընթացիկ պլան', subscription: 'Բաժանորդագրություն', provider: 'Վճարման մատակարար', usage: 'Օգտագործում', staff: 'Աշխատակիցներ', services: 'Ծառայություններ', locations: 'Մասնաճյուղեր', methods: 'Վճարման եղանակներ Հայաստանում', live: 'Ակտիվ', setup: 'Սպասում է merchant կարգավորմանը', planned: 'Միացման փուլում', plannedHint: 'Վճարումը հասանելի է ծառայության միացումը հաստատվելուց հետո։ Քարտի տվյալները մուտքագրվում են վճարային ծառայության պաշտպանված էջում։', idbank: 'IDBank / vPOS', idram: 'Idram Checkout', telcell: 'Telcell Wallet', easypay: 'EasyPay / easywallet', cards: 'Բանկային քարտեր', cardsHint: 'ArCa · Visa · Mastercard', loadError: 'Չհաջողվեց բեռնել վճարումների տվյալները', retry: 'Կրկին փորձել', invoice: 'Վճարման հաշիվ', payIdram: 'Վճարել Idram-ով', payCard: 'Վճարել քարտով', noInvoice: 'Վճարման ենթակա հաշիվ չկա։ Պլանը կարող ես ընտրել vizit.am-ի «Պլան և վճարումներ» բաժնում։', checkoutError: 'Չհաջողվեց բացել վճարման էջը։ Փորձիր կրկին։', checking: 'Ստուգում ենք վճարումը․ պլանը կակտիվանա սերվերի հաստատումից հետո։', paid: 'Վճարումը հաստատված է, պլանն ակտիվ է։', review: 'Վճարումը ստացվել է և պահանջում է ստուգում։ Մի՛ վճարիր կրկին, կապվիր աջակցության հետ։', notConfirmed: 'Հաստատում դեռ չկա։ Եթե վճարել ես, մի քանի րոպեից ստուգիր կրկին։', checkAgain: 'Ստուգել կրկին', choosePlan: 'Ընտրիր պլանը', monthly: 'Ամսական', yearly: 'Տարեկան', perMonth: '/ամիս', perYear: '/տարի', createInvoice: 'Ստեղծել հաշիվ', individual: 'Անհատական առաջարկ', current: 'Ընթացիկ', cancelInvoice: 'Չեղարկել հաշիվը', cancelConfirm: 'Չեղարկե՞լ այս վճարման հաշիվը։', yes: 'Չեղարկել', no: 'Ոչ', plansError: 'Չհաջողվեց բեռնել պլանները', noPlans: 'Հասանելի պլաններ չկան։ Կապվիր աջակցության հետ։' },
  ru: { title: 'Тариф и платежи', subtitle: 'Подписка и платёжная инфраструктура', billingStatus: 'Статус оплаты', currentPlan: 'Текущий тариф', subscription: 'Подписка', provider: 'Платёжный провайдер', usage: 'Использование', staff: 'Сотрудники', services: 'Услуги', locations: 'Филиалы', methods: 'Способы оплаты в Армении', live: 'Активно', setup: 'Ожидает настройки merchant', planned: 'Подключение запланировано', plannedHint: 'Оплата доступна после подтверждения подключения. Платёжные данные вводятся на защищённой странице платёжного сервиса.', idbank: 'IDBank / vPOS', idram: 'Idram Checkout', telcell: 'Telcell Wallet', easypay: 'EasyPay / easywallet', cards: 'Банковские карты', cardsHint: 'ArCa · Visa · Mastercard', loadError: 'Не удалось загрузить данные оплаты', retry: 'Повторить', invoice: 'Счёт', payIdram: 'Оплатить через Idram', payCard: 'Оплатить картой', noInvoice: 'Нет счёта к оплате. Тариф можно выбрать на vizit.am в разделе «Тариф и платежи».', checkoutError: 'Не удалось открыть страницу оплаты. Попробуйте ещё раз.', checking: 'Проверяем платёж: тариф активируется после подтверждения сервером.', paid: 'Оплата подтверждена, тариф активен.', review: 'Платёж получен и требует проверки. Не оплачивайте повторно, свяжитесь с поддержкой.', notConfirmed: 'Подтверждения пока нет. Если вы оплатили, проверьте снова через несколько минут.', checkAgain: 'Проверить снова', choosePlan: 'Выберите тариф', monthly: 'Ежемесячно', yearly: 'Ежегодно', perMonth: '/мес', perYear: '/год', createInvoice: 'Создать счёт', individual: 'Индивидуальное предложение', current: 'Текущий', cancelInvoice: 'Отменить счёт', cancelConfirm: 'Отменить этот счёт?', yes: 'Отменить', no: 'Нет', plansError: 'Не удалось загрузить тарифы', noPlans: 'Нет доступных тарифов. Обратитесь в поддержку.' },
  en: { title: 'Plan and billing', subtitle: 'Subscription and payment infrastructure', billingStatus: 'Billing status', currentPlan: 'Current plan', subscription: 'Subscription', provider: 'Payment provider', usage: 'Usage', staff: 'Staff', services: 'Services', locations: 'Locations', methods: 'Payment methods in Armenia', live: 'Active', setup: 'Waiting for merchant setup', planned: 'Integration planned', plannedHint: 'Payment is available after the connection is confirmed. Payment details are entered on the payment service’s secure page.', idbank: 'IDBank / vPOS', idram: 'Idram Checkout', telcell: 'Telcell Wallet', easypay: 'EasyPay / easywallet', cards: 'Bank cards', cardsHint: 'ArCa · Visa · Mastercard', loadError: 'Could not load billing data', retry: 'Try again', invoice: 'Invoice', payIdram: 'Pay with Idram', payCard: 'Pay by card', noInvoice: 'There is no invoice to pay. Choose a plan in Plan & payments on vizit.am.', checkoutError: 'Could not open the payment page. Please try again.', checking: 'Checking your payment: the plan activates after server confirmation.', paid: 'Payment confirmed. Your plan is active.', review: 'Payment received and needs review. Do not pay again; contact support.', notConfirmed: 'No confirmation yet. If you paid, check again in a few minutes.', checkAgain: 'Check again', choosePlan: 'Choose a plan', monthly: 'Monthly', yearly: 'Yearly', perMonth: '/month', perYear: '/year', createInvoice: 'Create invoice', individual: 'Individual offer', current: 'Current', cancelInvoice: 'Cancel invoice', cancelConfirm: 'Cancel this invoice?', yes: 'Cancel invoice', no: 'No', plansError: 'Could not load plans', noPlans: 'No plans are available. Contact support.' },
};

const show = (value: unknown) => value == null || value === '' ? '—' : String(value);
const statusNames: Record<string, Record<string, string>> = {
  hy: { active: 'Ակտիվ', trialing: 'Փորձաշրջան', trial: 'Փորձաշրջան', past_due: 'Վճարումն ուշացած է', suspended: 'Կասեցված', cancelled: 'Չեղարկված', canceled: 'Չեղարկված', inactive: 'Ակտիվ չէ', pending: 'Սպասվում է', paid: 'Վճարված', failed: 'Չհաջողվեց', expired: 'Ժամկետանց' },
  ru: { active: 'Активна', trialing: 'Пробный период', trial: 'Пробный период', past_due: 'Просрочена оплата', suspended: 'Приостановлена', cancelled: 'Отменена', canceled: 'Отменена', inactive: 'Не активна', pending: 'Ожидает', paid: 'Оплачено', failed: 'Не удалось', expired: 'Истёк срок' },
  en: { active: 'Active', trialing: 'Trial', trial: 'Trial', past_due: 'Past due', suspended: 'Suspended', cancelled: 'Cancelled', canceled: 'Cancelled', inactive: 'Inactive', pending: 'Pending', paid: 'Paid', failed: 'Failed', expired: 'Expired' },
};
const statusText = (value: unknown, locale: string) => {
  const raw = show(value);
  return statusNames[locale]?.[raw] ?? statusNames.en[raw] ?? raw;
};
const statusTone = (value: unknown): StatusTone => {
  const raw = show(value);
  if (raw === 'active' || raw === 'paid') return 'success';
  if (raw === 'trialing' || raw === 'trial') return 'accent';
  if (raw === 'past_due' || raw === 'pending') return 'warning';
  if (['suspended', 'cancelled', 'canceled', 'failed', 'expired'].includes(raw)) return 'danger';
  return 'neutral';
};
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
  const rental = isRentalBusiness(business as { business_type?: string } | undefined);
  const ready = provider?.checkout_available === true;
  const idram = providerName === 'idram';
  const methods: Method[] = [
    { key: idram ? 'idram' : 'idbank', name: idram ? c.idram : c.idbank, detail: ready ? c.live : c.setup, active: ready, officialLogo: idram ? 'https://vizit.am/payments/idram.png' : idbankLogo },
  ];

  const queryClient = useQueryClient();
  const invoicesQuery = useQuery({ queryKey: ['business-billing-invoices'], queryFn: businessApi.invoices, retry: false, refetchOnMount: 'always', staleTime: 0 });
  const pendingInvoice: BillingInvoice | undefined = (invoicesQuery.data ?? []).find((invoice) => invoice.status === 'pending' && Number(invoice.amount) > 0);
  const [opening, setOpening] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // The invoice whose payment was opened in this session; its status is read from the API only.
  const [watchedInvoiceId, setWatchedInvoiceId] = useState<number | null>(null);
  const [watchStartedAt, setWatchStartedAt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!watchStartedAt) return;
    const timer = setTimeout(() => setTimedOut(true), 90_000);
    return () => clearTimeout(timer);
  }, [watchStartedAt]);
  const restartWatch = () => { setTimedOut(false); setWatchStartedAt(Date.now()); };
  const statusQuery = useQuery({
    queryKey: ['business-billing-payment-status', watchedInvoiceId],
    queryFn: () => businessApi.invoicePaymentStatus(watchedInvoiceId as number),
    enabled: watchedInvoiceId != null,
    retry: 1,
    refetchInterval: (q) => {
      const status = q.state.data?.transaction?.status;
      return status === 'paid' || status === 'failed' || timedOut ? false : 3000;
    },
  });
  const transaction = statusQuery.data?.transaction;
  const invoiceStatus = statusQuery.data?.invoice?.status;
  const paymentState = watchedInvoiceId == null ? null
    : transaction?.status === 'paid' ? (transaction.requires_manual_review || !['approved', 'paid'].includes(String(invoiceStatus)) ? 'review' : 'paid')
    : statusQuery.isFetching || !timedOut ? 'checking' : 'notConfirmed';
  useEffect(() => {
    if (transaction?.status !== 'paid') return;
    void queryClient.invalidateQueries({ queryKey: ['business-billing'] });
    void queryClient.invalidateQueries({ queryKey: ['business-billing-invoices'] });
  }, [transaction?.status, queryClient]);

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const businessType = typeof business?.business_type === 'string' ? business.business_type : undefined;
  const plansQuery = useQuery({ queryKey: ['business-billing-plans', businessType], queryFn: () => businessApi.plans(businessType), enabled: Boolean(data) && ready && !pendingInvoice, retry: false, staleTime: 60_000 });
  const currentCode = typeof plan?.code === 'string' ? plan.code : null;
  const activeSubscription = data?.is_billable === true && (subscription?.status === 'active' || subscription?.status === 'trialing');
  const offers = (Array.isArray(data?.individual_offers) ? data.individual_offers : []) as { id: number; title: string; base_plan: { code: string; currency?: string }; effective_monthly_price: number; effective_yearly_price: number }[];
  const offerCodes = new Set(offers.map((offer) => offer.base_plan.code));
  const planOptions = [
    ...(plansQuery.data ?? []).filter((item: BillingPlan) => !(item.is_custom ?? (item.self_serve === false || item.code === 'custom' || item.features?.custom_pricing === true)) && !offerCodes.has(item.code)).map((item) => {
      const monthly = Number(item.monthly_price ?? item.price ?? 0);
      return { key: `plan-${item.id}`, code: item.code, name: item.name, currency: item.currency ?? 'AMD', monthly, yearly: Number(item.yearly_offer?.price ?? monthly * 10), offer: false };
    }),
    ...offers.map((offer) => ({ key: `offer-${offer.id}`, code: offer.base_plan.code, name: offer.title, currency: offer.base_plan.currency ?? 'AMD', monthly: offer.effective_monthly_price, yearly: offer.effective_yearly_price, offer: true })),
  ];

  const refreshBilling = () => {
    void queryClient.invalidateQueries({ queryKey: ['business-billing'] });
    void queryClient.invalidateQueries({ queryKey: ['business-billing-invoices'] });
  };
  const createInvoice = async (code: string, key: string) => {
    setCheckoutError(null);
    setBusyPlan(key);
    try {
      await businessApi.requestPlanInvoice(code, cycle);
      setWatchedInvoiceId(null);
      await invoicesQuery.refetch();
      refreshBilling();
    } catch (error) {
      setCheckoutError(apiErrorMessage(error));
    } finally {
      setBusyPlan(null);
    }
  };
  const cancelInvoice = (invoice: BillingInvoice) => Alert.alert(c.cancelInvoice, c.cancelConfirm, [
    { text: c.no, style: 'cancel' },
    { text: c.yes, style: 'destructive', onPress: () => {
      setCheckoutError(null);
      setCancelling(true);
      businessApi.cancelInvoice(invoice.id)
        .then(() => { setWatchedInvoiceId(null); refreshBilling(); return invoicesQuery.refetch(); })
        .catch((error) => setCheckoutError(apiErrorMessage(error)))
        .finally(() => setCancelling(false));
    } },
  ]);

  const pay = async (invoice: BillingInvoice) => {
    setCheckoutError(null);
    setOpening(true);
    try {
      const result = await businessApi.createCheckout(invoice.id, idram ? 'wallet' : 'card');
      const url = checkoutUrlFrom(result);
      if (!url) throw new Error(c.checkoutError);
      setWatchedInvoiceId(invoice.id);
      restartWatch();
      // The server redirects the bank's return to this app link, which closes the browser.
      await WebBrowser.openAuthSessionAsync(url, Linking.createURL('billing'));
      restartWatch();
      void statusQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['business-billing'] });
    } catch (error) {
      setCheckoutError(apiErrorMessage(error) || c.checkoutError);
    } finally {
      setOpening(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Vizit Business" title={c.title} subtitle={c.subtitle} />
        {query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
          <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} onPress={() => query.refetch()} tone="secondary" />} />
        ) : (
          <>
            <Surface style={[styles.planCard, { backgroundColor: theme.cover, borderColor: theme.cover }]}>
              <View style={styles.planTop}><Text style={[styles.planEyebrow, { color: theme.coverMuted }]}>{c.currentPlan.toLocaleUpperCase()}</Text><StatusPill label={statusText(subscription?.status, locale)} tone={statusTone(subscription?.status)} onCover /></View>
              <Text style={[styles.planName, { color: theme.coverText }]}>{show(plan?.name ?? plan?.code)}</Text>
              <View style={[styles.planMeta, { borderTopColor: 'rgba(255,255,255,0.16)' }]}><View><Text style={[styles.planMetaLabel, { color: theme.coverMuted }]}>{c.billingStatus}</Text><Text style={[styles.planMetaValue, { color: theme.coverText }]}>{statusText(business?.billing_status, locale)}</Text></View><View style={styles.planMetaRight}><Text style={[styles.planMetaLabel, { color: theme.coverMuted }]}>{c.provider}</Text><Text style={[styles.planMetaValue, { color: theme.coverText }]}>{String(provider?.display_name ?? (idram ? c.idram : c.idbank))}</Text></View></View>
            </Surface>

            <Surface style={styles.usageCard} elevated>
              <SectionHeader title={c.usage} />
              {!rental ? <><UsageRow label={c.staff} value={ratio(usage?.active_staff, usage?.staff_limit)} icon={{ ios: 'person.2.fill', android: 'group' }} />
              <Divider />
              <UsageRow label={c.services} value={ratio(usage?.services_count, usage?.services_limit)} icon={{ ios: 'square.grid.2x2.fill', android: 'grid_view' }} />
              <Divider /></> : null}
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
            {ready ? (
              <Surface style={styles.payCard} elevated>
                {pendingInvoice ? (
                  <>
                    <View style={styles.payRow}>
                      <View style={styles.methodBody}><Text style={[styles.planMetaLabel, { color: theme.muted }]}>{c.invoice} #{pendingInvoice.id}</Text><Text style={[styles.payAmount, { color: theme.text }]}>{Number(pendingInvoice.amount).toLocaleString('en-US')} {pendingInvoice.currency ?? 'AMD'}</Text></View>
                      <StatusPill label={statusText(pendingInvoice.status, locale)} tone={statusTone(pendingInvoice.status)} />
                    </View>
                    <PremiumButton title={idram ? c.payIdram : c.payCard} loading={opening} disabled={cancelling} onPress={() => void pay(pendingInvoice)} />
                    <PremiumButton title={c.cancelInvoice} tone="secondary" loading={cancelling} disabled={opening} onPress={() => cancelInvoice(pendingInvoice)} />
                  </>
                ) : invoicesQuery.isLoading || plansQuery.isLoading ? <ActivityIndicator color={theme.accent} /> : plansQuery.isError ? <Text style={[styles.noteText, { color: theme.danger }]}>{c.plansError}</Text> : (
                  <>
                    <Text style={[styles.methodName, { color: theme.text }]}>{c.choosePlan}</Text>
                    <View style={[styles.cycleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      {(['monthly', 'yearly'] as const).map((value) => (
                        <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: cycle === value }} onPress={() => setCycle(value)} style={[styles.cycleButton, cycle === value && { backgroundColor: theme.primary }]}>
                          <Text style={[styles.cycleText, { color: cycle === value ? theme.onPrimary : theme.muted }]}>{c[value]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {planOptions.length ? planOptions.map((option) => {
                      const isCurrent = activeSubscription && !option.offer && option.code === currentCode;
                      const price = cycle === 'yearly' ? option.yearly : option.monthly;
                      return (
                        <View key={option.key} style={[styles.planOption, { borderColor: option.offer ? theme.success : theme.border }]}>
                          <View style={styles.methodBody}>
                            <Text style={[styles.methodName, { color: theme.text }]}>{option.name}</Text>
                            <Text style={[styles.planMetaLabel, { color: option.offer ? theme.success : theme.muted }]}>{option.offer ? c.individual : `${Number(price).toLocaleString('en-US')} ${option.currency}${cycle === 'yearly' ? c.perYear : c.perMonth}`}</Text>
                            {option.offer ? <Text style={[styles.planMetaLabel, { color: theme.muted }]}>{`${Number(price).toLocaleString('en-US')} ${option.currency}${cycle === 'yearly' ? c.perYear : c.perMonth}`}</Text> : null}
                          </View>
                          <PremiumButton compact title={isCurrent ? c.current : c.createInvoice} tone={isCurrent ? 'secondary' : 'primary'} disabled={isCurrent || busyPlan != null} loading={busyPlan === option.key} onPress={() => void createInvoice(option.code, option.key)} />
                        </View>
                      );
                    }) : <Text style={[styles.noteText, { color: theme.muted }]}>{c.noPlans}</Text>}
                  </>
                )}
                {checkoutError ? <Text style={[styles.noteText, { color: theme.danger }]}>{checkoutError}</Text> : null}
                {paymentState ? <Text style={[styles.noteText, { color: paymentState === 'paid' ? theme.success : paymentState === 'review' ? theme.danger : theme.muted }]}>{c[paymentState]}</Text> : null}
                {paymentState === 'notConfirmed' ? <PremiumButton title={c.checkAgain} tone="secondary" loading={statusQuery.isFetching} onPress={() => { restartWatch(); void statusQuery.refetch(); }} /> : null}
              </Surface>
            ) : (
              <View style={[styles.note, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="info.circle.fill" android="info" color={theme.accentText} size={18} /><Text style={[styles.noteText, { color: theme.muted }]}>{c.plannedHint}</Text></View>
            )}
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
  planEyebrow: { ...ui.type.eyebrow },
  planName: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7, marginVertical: 16 },
  planMeta: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13, flexDirection: 'row', gap: 10 },
  planMetaRight: { flex: 1, alignItems: 'flex-end' },
  planMetaLabel: { ...ui.type.caption },
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
  payCard: { padding: 14, gap: 12 },
  cycleRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, alignSelf: 'flex-start' },
  cycleButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cycleText: { fontSize: 13, fontWeight: '700' },
  planOption: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payAmount: { fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 3 },
  note: { padding: 13, borderRadius: ui.radius.medium, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noteText: { ...ui.type.caption, flex: 1 },
});
