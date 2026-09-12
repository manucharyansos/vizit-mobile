import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { IconButton, PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { apiErrorMessage } from '@/services/api/client';
import { AvailabilitySlot, CampaignPayload, CampaignSegment, CampaignStatus, MarketingCampaign, MarketingDelivery, WaitlistEntry, WaitlistStatus, growthApi } from '@/services/api/growth';
import { formatApiDateTime, formatApiTime, localDateKey, localDateKeyFromApi } from '@/services/date-time';

const copy = {
  hy: {
    title: 'Աճի գործիքներ', waitlist: 'Սպասման ցուցակ', campaigns: 'Campaign-ներ', emptyWaitlist: 'Սպասող հաճախորդներ դեռ չկան', emptyCampaigns: 'Campaign դեռ չկա', cancel: 'Չեղարկել', return: 'Վերադարձնել սպասման մեջ', offer: 'Առաջարկել ժամ', available: 'Ազատ ժամեր', noSlots: 'Այս օրվա համար ազատ ժամ չկա', create: 'Նոր campaign', edit: 'Խմբագրել', name: 'Ներքին անուն', subject: 'Email-ի թեմա', body: 'Հաղորդագրություն', segment: 'Սեգմենտ', save: 'Պահպանել', send: 'Ուղարկել հիմա', deliveries: 'Ուղարկումների պատմություն', close: 'Փակել', recipients: 'ստացող', sent: 'ուղարկված', failed: 'ձախողված', actionFailed: 'Գործողությունը չհաջողվեց', retry: 'Կրկին փորձել', all: 'Բոլորը', new: 'Նոր', returning: 'Վերադարձող', inactive: '90+ օր ոչ ակտիվ', vip: 'VIP', recommended: 'Առաջարկվող', scheduleAuto: 'Պլանավորել ավտոմատ ուղարկում', scheduleHint: 'Եթե անջատված է՝ campaign-ը կպահպանվի որպես սևագիր։', chooseDate: 'Ընտրեք ուղարկման օրը', chooseTime: 'Ընտրեք ժամը', draftSaved: 'Սևագիր', overview: 'Հաճախորդների պահպանում և հաղորդակցություն', customer: 'Հաճախորդ', phone: 'Հեռախոս',
    waitlistStatus: { waiting: 'Սպասում է', offered: 'Ժամ առաջարկված', booked: 'Ամրագրված', cancelled: 'Չեղարկված', expired: 'Ժամկետանց' },
    campaignStatus: { draft: 'Սևագիր', scheduled: 'Պլանավորված', sending: 'Ուղարկվում է', sent: 'Ուղարկված', failed: 'Ձախողված', cancelled: 'Չեղարկված' },
    deliveryStatus: { pending: 'Սպասում է', sent: 'Ուղարկված', failed: 'Ձախողված' },
  },
  ru: {
    title: 'Инструменты роста', waitlist: 'Лист ожидания', campaigns: 'Кампании', emptyWaitlist: 'Ожидающих клиентов пока нет', emptyCampaigns: 'Кампаний пока нет', cancel: 'Отменить', return: 'Вернуть в ожидание', offer: 'Предложить время', available: 'Свободные слоты', noSlots: 'На этот день свободных слотов нет', create: 'Новая кампания', edit: 'Изменить', name: 'Внутреннее название', subject: 'Тема email', body: 'Сообщение', segment: 'Сегмент', save: 'Сохранить', send: 'Отправить сейчас', deliveries: 'История отправок', close: 'Закрыть', recipients: 'получателей', sent: 'отправлено', failed: 'ошибок', actionFailed: 'Не удалось выполнить действие', retry: 'Повторить', all: 'Все', new: 'Новые', returning: 'Возвращающиеся', inactive: 'Неактивны 90+ дней', vip: 'VIP', recommended: 'Рекомендуемое', scheduleAuto: 'Запланировать автоматическую отправку', scheduleHint: 'Если выключено, кампания сохранится как черновик.', chooseDate: 'Выберите дату отправки', chooseTime: 'Выберите время', draftSaved: 'Черновик', overview: 'Удержание клиентов и коммуникации', customer: 'Клиент', phone: 'Телефон',
    waitlistStatus: { waiting: 'Ожидает', offered: 'Время предложено', booked: 'Записан', cancelled: 'Отменён', expired: 'Истекло' },
    campaignStatus: { draft: 'Черновик', scheduled: 'Запланирована', sending: 'Отправляется', sent: 'Отправлена', failed: 'Ошибка', cancelled: 'Отменена' },
    deliveryStatus: { pending: 'Ожидает', sent: 'Отправлено', failed: 'Ошибка' },
  },
  en: {
    title: 'Growth tools', waitlist: 'Waitlist', campaigns: 'Campaigns', emptyWaitlist: 'No waiting customers yet', emptyCampaigns: 'No campaigns yet', cancel: 'Cancel', return: 'Return to waiting', offer: 'Offer a time', available: 'Available times', noSlots: 'No available slots on this day', create: 'New campaign', edit: 'Edit', name: 'Internal name', subject: 'Email subject', body: 'Message', segment: 'Segment', save: 'Save', send: 'Send now', deliveries: 'Delivery history', close: 'Close', recipients: 'recipients', sent: 'sent', failed: 'failed', actionFailed: 'Action failed', retry: 'Try again', all: 'All', new: 'New', returning: 'Returning', inactive: 'Inactive 90+ days', vip: 'VIP', recommended: 'Recommended', scheduleAuto: 'Schedule automatic delivery', scheduleHint: 'When off, the campaign is saved as a draft.', chooseDate: 'Choose delivery date', chooseTime: 'Choose time', draftSaved: 'Draft', overview: 'Customer retention and communication', customer: 'Customer', phone: 'Phone',
    waitlistStatus: { waiting: 'Waiting', offered: 'Time offered', booked: 'Booked', cancelled: 'Cancelled', expired: 'Expired' },
    campaignStatus: { draft: 'Draft', scheduled: 'Scheduled', sending: 'Sending', sent: 'Sent', failed: 'Failed', cancelled: 'Cancelled' },
    deliveryStatus: { pending: 'Pending', sent: 'Sent', failed: 'Failed' },
  },
} as const;

const segments: CampaignSegment[] = ['all', 'new', 'returning', 'inactive', 'vip'];
const scheduleTimes = Array.from({ length: 14 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);
const emptyCampaign = (): CampaignPayload => ({ name: '', segment: 'all', subject: '', body: '', scheduled_for: null });

function formatDateKey(value: string, locale: 'hy' | 'ru' | 'en') {
  const tag = locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const date = new Date(`${value}T12:00:00+04:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Yerevan' }).format(date);
}

function waitlistTone(status: WaitlistStatus): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'booked') return 'success';
  if (status === 'cancelled' || status === 'expired') return 'danger';
  if (status === 'offered') return 'accent';
  return 'warning';
}

function campaignTone(status: CampaignStatus): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'sent') return 'success';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  if (status === 'scheduled' || status === 'sending') return 'accent';
  return 'neutral';
}

export default function GrowthScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [tab, setTab] = useState<'waitlist' | 'campaigns'>('waitlist');
  const [offerEntry, setOfferEntry] = useState<WaitlistEntry>();
  const [editing, setEditing] = useState<MarketingCampaign | 'new' | undefined>();
  const [campaignForm, setCampaignForm] = useState<CampaignPayload>(emptyCampaign);
  const [deliveriesCampaign, setDeliveriesCampaign] = useState<MarketingCampaign>();
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(localDateKey(1));
  const [scheduleTime, setScheduleTime] = useState('10:00');

  const waitlist = useQuery({ queryKey: ['business-waitlist'], queryFn: growthApi.waitlist, retry: false, refetchOnMount: 'always' });
  const campaigns = useQuery({ queryKey: ['business-campaigns'], queryFn: growthApi.campaigns, retry: false, enabled: tab === 'campaigns', refetchOnMount: 'always' });
  const slots = useQuery({ queryKey: ['waitlist-offer-slots', offerEntry?.id, offerEntry?.desired_date], queryFn: () => growthApi.availability(offerEntry!), enabled: !!offerEntry, retry: false });
  const deliveries = useQuery({ queryKey: ['campaign-deliveries', deliveriesCampaign?.id], queryFn: () => growthApi.deliveries(deliveriesCampaign!.id), enabled: !!deliveriesCampaign, retry: false });

  const fail = (error: unknown) => Alert.alert(c.actionFailed, apiErrorMessage(error));
  const refreshWaitlist = async () => { await cache.invalidateQueries({ queryKey: ['business-waitlist'] }); await cache.refetchQueries({ queryKey: ['business-waitlist'], type: 'active' }); };
  const refreshCampaigns = async () => { await cache.invalidateQueries({ queryKey: ['business-campaigns'] }); await cache.refetchQueries({ queryKey: ['business-campaigns'], type: 'active' }); };

  const updateWaitlist = useMutation({ mutationFn: ({ id, status }: { id: number; status: 'waiting' | 'cancelled' }) => growthApi.updateWaitlist(id, status), onSuccess: refreshWaitlist, onError: fail });
  const offer = useMutation({ mutationFn: ({ id, slot }: { id: number; slot: AvailabilitySlot }) => growthApi.offerWaitlist(id, slot), onSuccess: async () => { setOfferEntry(undefined); await refreshWaitlist(); }, onError: fail });
  const saveCampaign = useMutation({
    mutationFn: () => {
      const scheduled_for = scheduleEnabled ? `${scheduleDate}T${scheduleTime}:00+04:00` : null;
      const payload: CampaignPayload = { ...campaignForm, scheduled_for };
      return editing === 'new' ? growthApi.createCampaign(payload) : growthApi.updateCampaign((editing as MarketingCampaign).id, payload);
    },
    onSuccess: async () => {
      setEditing(undefined);
      setCampaignForm(emptyCampaign());
      setScheduleEnabled(false);
      setScheduleDate(localDateKey(1));
      setScheduleTime('10:00');
      await refreshCampaigns();
    },
    onError: fail,
  });
  const sendCampaign = useMutation({ mutationFn: growthApi.sendCampaign, onSuccess: refreshCampaigns, onError: fail });
  const cancelCampaign = useMutation({ mutationFn: growthApi.cancelCampaign, onSuccess: refreshCampaigns, onError: fail });

  const beginCampaign = (campaign?: MarketingCampaign) => {
    if (!campaign) {
      setEditing('new');
      setCampaignForm(emptyCampaign());
      setScheduleEnabled(false);
      setScheduleDate(localDateKey(1));
      setScheduleTime('10:00');
      return;
    }
    setEditing(campaign);
    setCampaignForm({ name: campaign.name, segment: campaign.segment, subject: campaign.subject, body: campaign.body, scheduled_for: null });
    const date = localDateKeyFromApi(campaign.scheduled_for);
    setScheduleEnabled(Boolean(campaign.scheduled_for));
    setScheduleDate(date ?? localDateKey(1));
    setScheduleTime(campaign.scheduled_for ? (formatApiTime(campaign.scheduled_for, locale) || '10:00') : '10:00');
  };
  const validCampaign = campaignForm.name.trim().length >= 2 && campaignForm.subject.trim().length >= 2 && campaignForm.body.trim().length >= 2 && (!scheduleEnabled || (scheduleDate >= localDateKey() && /^\d{2}:\d{2}$/.test(scheduleTime)));

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Vizit Pro"
        title={c.title}
        subtitle={c.overview}
        action={tab === 'campaigns' ? <IconButton ios={editing ? 'xmark' : 'plus'} android={editing ? 'close' : 'add'} accessibilityLabel={editing ? c.close : c.create} tone={editing ? 'neutral' : 'primary'} onPress={() => editing ? setEditing(undefined) : beginCampaign()} /> : undefined}
      />
      <View style={[styles.tabs, { backgroundColor: theme.surface, borderColor: theme.border }]}><Tab title={c.waitlist} selected={tab === 'waitlist'} onPress={() => setTab('waitlist')} /><Tab title={c.campaigns} selected={tab === 'campaigns'} onPress={() => setTab('campaigns')} /></View>

      {tab === 'waitlist' ? <>
        {!waitlist.isLoading && !waitlist.isError ? <SectionHeader title={c.waitlist} detail={String(waitlist.data?.length ?? 0)} /> : null}
        {waitlist.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : waitlist.isError ? <ErrorState title={c.actionFailed} retry={c.retry} message={apiErrorMessage(waitlist.error)} onRetry={() => void waitlist.refetch()} /> : waitlist.data?.length ? waitlist.data.map((item) => <Surface key={item.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}><Text style={[styles.avatarText, { color: theme.accentText }]}>{item.customer_name.slice(0, 1).toLocaleUpperCase()}</Text></View>
            <View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{item.customer_name}</Text><Text style={[styles.meta, { color: theme.textSecondary }]}>{item.service?.name ?? '—'} · {formatDateKey(item.desired_date, locale)}</Text><Text style={[styles.caption, { color: theme.muted }]}>{item.customer_phone}</Text></View>
            <StatusPill label={c.waitlistStatus[item.status]} tone={waitlistTone(item.status)} />
          </View>
          {item.offered_starts_at ? <View style={[styles.offerSummary, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="clock.fill" android="schedule" color={theme.accentText} size={17} /><Text style={[styles.offerText, { color: theme.accentText }]}>{formatApiDateTime(item.offered_starts_at, locale)} · {item.offered_staff?.name ?? item.staff?.name ?? ''}</Text></View> : null}
          <View style={styles.actions}>{item.status === 'waiting' ? <SmallButton title={c.offer} onPress={() => setOfferEntry(item)} primary /> : null}{item.status === 'cancelled' ? <SmallButton title={c.return} onPress={() => updateWaitlist.mutate({ id: item.id, status: 'waiting' })} /> : item.status === 'waiting' ? <SmallButton title={c.cancel} onPress={() => updateWaitlist.mutate({ id: item.id, status: 'cancelled' })} danger /> : null}</View>
          {offerEntry?.id === item.id ? <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.panelHeader}><SectionHeader title={c.available} /><IconButton ios="xmark" android="close" accessibilityLabel={c.close} size={36} onPress={() => setOfferEntry(undefined)} /></View>
            {slots.isFetching ? <ActivityIndicator color={theme.accent} /> : slots.isError ? <ErrorState title={c.actionFailed} retry={c.retry} message={apiErrorMessage(slots.error)} onRetry={() => void slots.refetch()} /> : slots.data?.length ? <View style={styles.slotGrid}>{slots.data.slice(0, 30).map((slot) => <Pressable accessibilityRole="button" key={`${slot.starts_at}-${slot.staff_id}`} disabled={offer.isPending} onPress={() => offer.mutate({ id: item.id, slot })} style={({ pressed }) => [styles.slot, { backgroundColor: slot.is_recommended ? theme.successSoft : theme.surfaceRaised, borderColor: slot.is_recommended ? theme.success : theme.border, opacity: pressed ? 0.72 : 1 }]}><Text style={[styles.slotTime, { color: slot.is_recommended ? theme.success : theme.text }]}>{slot.is_recommended ? '★ ' : ''}{formatApiTime(slot.starts_at, locale)}</Text><Text numberOfLines={1} style={[styles.slotStaff, { color: theme.muted }]}>{slot.is_recommended ? c.recommended : slot.staff_name ?? c.customer}</Text>{slot.is_recommended && slot.staff_name ? <Text numberOfLines={1} style={[styles.slotStaff, { color: theme.muted }]}>{slot.staff_name}</Text> : null}</Pressable>)}</View> : <Text style={[styles.meta, { color: theme.muted }]}>{c.noSlots}</Text>}
          </View> : null}
        </Surface>) : <StateCard title={c.emptyWaitlist} icon={{ ios: 'person.2.slash', android: 'person_off' }} />}
      </> : <>
        {editing ? <Surface elevated style={styles.editor}>
          <SectionHeader title={editing === 'new' ? c.create : c.edit} detail={c.campaigns} />
          <PremiumInput label={c.name} value={campaignForm.name} onChangeText={(name) => setCampaignForm((value) => ({ ...value, name }))} placeholder={c.name} icon={{ ios: 'tag', android: 'label' }} />
          <PremiumInput label={c.subject} value={campaignForm.subject} onChangeText={(subject) => setCampaignForm((value) => ({ ...value, subject }))} placeholder={c.subject} icon={{ ios: 'envelope', android: 'mail_outline' }} />
          <PremiumInput label={c.body} value={campaignForm.body} onChangeText={(body) => setCampaignForm((value) => ({ ...value, body }))} placeholder={c.body} multiline icon={{ ios: 'text.alignleft', android: 'notes' }} />
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{c.segment}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>{segments.map((segment) => <ScopeChip key={segment} title={c[segment]} selected={campaignForm.segment === segment} onPress={() => setCampaignForm((value) => ({ ...value, segment }))} />)}</ScrollView>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: scheduleEnabled }} onPress={() => setScheduleEnabled((value) => !value)} style={({ pressed }) => [styles.scheduleToggle, { borderColor: scheduleEnabled ? theme.accent : theme.border, backgroundColor: scheduleEnabled ? theme.accentSubtle : theme.surface, opacity: pressed ? 0.75 : 1 }]}><View style={[styles.check, { borderColor: scheduleEnabled ? theme.primary : theme.borderStrong, backgroundColor: scheduleEnabled ? theme.primary : 'transparent' }]}>{scheduleEnabled ? <VizitIcon ios="checkmark" android="check" color={theme.onPrimary} size={16} /> : null}</View><View style={styles.flex}><Text style={[styles.toggleTitle, { color: theme.text }]}>{c.scheduleAuto}</Text><Text style={[styles.caption, { color: theme.muted }]}>{c.scheduleHint}</Text></View></Pressable>
          {scheduleEnabled ? <View style={[styles.schedulePanel, { borderColor: theme.border, backgroundColor: theme.surface }]}><SectionHeader title={c.chooseDate} /><CalendarDatePicker value={scheduleDate} onChange={setScheduleDate} minDate={localDateKey()} /><SectionHeader title={c.chooseTime} /><View style={styles.timeGrid}>{scheduleTimes.map((time) => <ScopeChip key={time} title={time} selected={scheduleTime === time} onPress={() => setScheduleTime(time)} compact />)}</View></View> : null}
          <View style={styles.actions}><PremiumButton title={c.close} tone="secondary" onPress={() => setEditing(undefined)} style={styles.flex} /><PremiumButton title={c.save} loading={saveCampaign.isPending} disabled={!validCampaign} onPress={() => saveCampaign.mutate()} style={styles.flex} /></View>
        </Surface> : null}

        {!campaigns.isLoading && !campaigns.isError ? <SectionHeader title={c.campaigns} detail={String(campaigns.data?.length ?? 0)} action={!editing ? <PremiumButton title={c.create} compact tone="ghost" icon={{ ios: 'plus', android: 'add' }} onPress={() => beginCampaign()} /> : undefined} /> : null}
        {campaigns.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : campaigns.isError ? <ErrorState title={c.actionFailed} retry={c.retry} message={apiErrorMessage(campaigns.error)} onRetry={() => void campaigns.refetch()} /> : campaigns.data?.length ? campaigns.data.map((campaign) => <Surface key={campaign.id} style={styles.card}>
          <View style={styles.row}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{campaign.name}</Text><Text style={[styles.meta, { color: theme.textSecondary }]}>{campaign.subject}</Text>{campaign.scheduled_for ? <Text style={[styles.scheduled, { color: theme.accentText }]}>{formatApiDateTime(campaign.scheduled_for, locale)}</Text> : null}</View><StatusPill label={c.campaignStatus[campaign.status]} tone={campaignTone(campaign.status)} /></View>
          <View style={[styles.metrics, { backgroundColor: theme.surface }]}><Metric value={campaign.recipient_count} label={c.recipients} /><Metric value={campaign.sent_count} label={c.sent} tone="success" /><Metric value={campaign.failed_count} label={c.failed} tone={campaign.failed_count ? 'danger' : 'neutral'} /></View>
          <View style={styles.actions}>{!['sending', 'sent'].includes(campaign.status) ? <SmallButton title={c.edit} onPress={() => beginCampaign(campaign)} /> : null}{!['sending', 'sent', 'cancelled'].includes(campaign.status) ? <SmallButton title={c.send} onPress={() => sendCampaign.mutate(campaign.id)} primary /> : null}{!['sending', 'sent', 'cancelled'].includes(campaign.status) ? <SmallButton title={c.cancel} onPress={() => cancelCampaign.mutate(campaign.id)} danger /> : null}<SmallButton title={c.deliveries} onPress={() => setDeliveriesCampaign(campaign)} /></View>
          {deliveriesCampaign?.id === campaign.id ? <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.panelHeader}><SectionHeader title={c.deliveries} /><IconButton ios="xmark" android="close" accessibilityLabel={c.close} size={36} onPress={() => setDeliveriesCampaign(undefined)} /></View>{deliveries.isLoading ? <ActivityIndicator color={theme.accent} /> : deliveries.isError ? <ErrorState title={c.actionFailed} retry={c.retry} message={apiErrorMessage(deliveries.error)} onRetry={() => void deliveries.refetch()} /> : deliveries.data?.length ? deliveries.data.slice(0, 100).map((delivery: MarketingDelivery) => <View key={delivery.id} style={[styles.delivery, { borderColor: theme.divider }]}><View style={styles.flex}><Text numberOfLines={1} style={[styles.meta, { color: theme.text }]}>{delivery.email}</Text>{delivery.sent_at ? <Text style={[styles.caption, { color: theme.muted }]}>{formatApiDateTime(delivery.sent_at, locale)}</Text> : null}</View><StatusPill label={c.deliveryStatus[delivery.status]} tone={delivery.status === 'failed' ? 'danger' : delivery.status === 'sent' ? 'success' : 'neutral'} /></View>) : <Text style={[styles.meta, { color: theme.muted }]}>—</Text>}</View> : null}
        </Surface>) : <StateCard title={c.emptyCampaigns} icon={{ ios: 'envelope.badge', android: 'drafts' }} action={<PremiumButton title={c.create} tone="secondary" onPress={() => beginCampaign()} />} />}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Tab({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  const { theme } = useApp();
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.tab, { backgroundColor: selected ? theme.surfaceRaised : 'transparent', borderColor: selected ? theme.border : 'transparent', opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.tabText, { color: selected ? theme.text : theme.muted }]}>{title}</Text></Pressable>;
}

function ScopeChip({ title, selected, onPress, compact = false }: { title: string; selected: boolean; onPress: () => void; compact?: boolean }) {
  const { theme } = useApp();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.segment, compact && styles.timeChip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surfaceRaised, opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.segmentText, { color: selected ? theme.onPrimary : theme.text }]}>{title}</Text></Pressable>;
}

function SmallButton({ title, onPress, primary = false, danger = false }: { title: string; onPress: () => void; primary?: boolean; danger?: boolean }) {
  return <PremiumButton title={title} onPress={onPress} compact tone={primary ? 'primary' : danger ? 'danger' : 'secondary'} style={styles.smallButton} />;
}

function ErrorState({ title, message, retry, onRetry }: { title: string; message?: string; retry: string; onRetry: () => void }) {
  return <StateCard title={title} message={message} tone="danger" action={<PremiumButton title={retry} tone="secondary" compact onPress={onRetry} />} />;
}

function Metric({ value, label, tone = 'neutral' }: { value: number; label: string; tone?: 'neutral' | 'success' | 'danger' }) {
  const { theme } = useApp();
  const color = tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.text;
  return <View style={styles.metric}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text numberOfLines={1} style={[styles.metricLabel, { color: theme.muted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: ui.radius.medium, padding: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: ui.type.button,
  loader: { marginVertical: ui.spacing.lg },
  card: { gap: ui.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: ui.spacing.sm },
  flex: { flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  name: ui.type.cardTitle,
  meta: ui.type.body,
  caption: { ...ui.type.caption, marginTop: 2 },
  offerSummary: { minHeight: 42, borderRadius: ui.radius.small, paddingHorizontal: ui.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.xs },
  offerText: { ...ui.type.caption, flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.xs },
  smallButton: { minWidth: 96, flexGrow: 1 },
  panel: { borderWidth: 1, borderRadius: ui.radius.medium, padding: ui.spacing.sm, gap: ui.spacing.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.xs },
  slot: { width: '31%', flexGrow: 1, minWidth: 92, minHeight: 62, borderWidth: 1, borderRadius: ui.radius.small, padding: 7, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotTime: { fontSize: 13, fontWeight: '900' },
  slotStaff: { fontSize: 9, lineHeight: 12 },
  editor: { gap: ui.spacing.sm },
  fieldLabel: { ...ui.type.caption, marginLeft: 2 },
  segmentRow: { gap: ui.spacing.xs },
  segment: { minHeight: 42, borderWidth: 1, borderRadius: ui.radius.pill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13 },
  segmentText: { fontSize: 12, fontWeight: '800' },
  scheduleToggle: { minHeight: 70, borderWidth: 1, borderRadius: ui.radius.medium, padding: ui.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  check: { width: 26, height: 26, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { ...ui.type.body, fontWeight: '800' },
  schedulePanel: { borderWidth: 1, borderRadius: ui.radius.large, padding: ui.spacing.sm, gap: ui.spacing.sm },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.xs },
  timeChip: { width: '22%', flexGrow: 1, paddingHorizontal: 8, borderRadius: ui.radius.small },
  scheduled: { ...ui.type.caption, marginTop: 5 },
  metrics: { flexDirection: 'row', borderRadius: ui.radius.medium, paddingVertical: ui.spacing.sm },
  metric: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  metricValue: { fontSize: 18, lineHeight: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', marginTop: 2 },
  delivery: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
