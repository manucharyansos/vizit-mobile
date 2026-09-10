import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { useApp } from '@/providers/app-provider';
import { apiErrorMessage } from '@/services/api/client';
import { AvailabilitySlot, CampaignPayload, CampaignSegment, CampaignStatus, MarketingCampaign, MarketingDelivery, WaitlistEntry, WaitlistStatus, growthApi } from '@/services/api/growth';
import { formatApiDateTime, formatApiTime, localDateKey, localDateKeyFromApi } from '@/services/date-time';

const copy = {
  hy: {
    title: 'Աճի գործիքներ', waitlist: 'Սպասման ցուցակ', campaigns: 'Campaign-ներ', emptyWaitlist: 'Սպասող հաճախորդներ դեռ չկան', emptyCampaigns: 'Campaign դեռ չկա', cancel: 'Չեղարկել', return: 'Վերադարձնել սպասման մեջ', offer: 'Առաջարկել ժամ', available: 'Ազատ ժամեր', noSlots: 'Այս օրվա համար ազատ ժամ չկա', create: 'Նոր campaign', edit: 'Խմբագրել', name: 'Ներքին անուն', subject: 'Email-ի թեմա', body: 'Հաղորդագրություն', segment: 'Սեգմենտ', save: 'Պահպանել', send: 'Ուղարկել հիմա', deliveries: 'Ուղարկումների պատմություն', close: 'Փակել', recipients: 'ստացող', sent: 'ուղարկված', failed: 'ձախողված', actionFailed: 'Գործողությունը չհաջողվեց', retry: 'Կրկին փորձել', all: 'Բոլորը', new: 'Նոր', returning: 'Վերադարձող', inactive: '90+ օր ոչ ակտիվ', vip: 'VIP', recommended: 'Առաջարկվող', scheduleAuto: 'Պլանավորել ավտոմատ ուղարկում', scheduleHint: 'Եթե անջատված է՝ campaign-ը կպահպանվի որպես սևագիր։', chooseDate: 'Ընտրեք ուղարկման օրը', chooseTime: 'Ընտրեք ժամը', draftSaved: 'Սևագիր',
    waitlistStatus: { waiting: 'Սպասում է', offered: 'Ժամ առաջարկված', booked: 'Ամրագրված', cancelled: 'Չեղարկված', expired: 'Ժամկետանց' },
    campaignStatus: { draft: 'Սևագիր', scheduled: 'Պլանավորված', sending: 'Ուղարկվում է', sent: 'Ուղարկված', failed: 'Ձախողված', cancelled: 'Չեղարկված' },
    deliveryStatus: { pending: 'Սպասում է', sent: 'Ուղարկված', failed: 'Ձախողված' },
  },
  ru: {
    title: 'Инструменты роста', waitlist: 'Лист ожидания', campaigns: 'Кампании', emptyWaitlist: 'Ожидающих клиентов пока нет', emptyCampaigns: 'Кампаний пока нет', cancel: 'Отменить', return: 'Вернуть в ожидание', offer: 'Предложить время', available: 'Свободные слоты', noSlots: 'На этот день свободных слотов нет', create: 'Новая кампания', edit: 'Изменить', name: 'Внутреннее название', subject: 'Тема email', body: 'Сообщение', segment: 'Сегмент', save: 'Сохранить', send: 'Отправить сейчас', deliveries: 'История отправок', close: 'Закрыть', recipients: 'получателей', sent: 'отправлено', failed: 'ошибок', actionFailed: 'Не удалось выполнить действие', retry: 'Повторить', all: 'Все', new: 'Новые', returning: 'Возвращающиеся', inactive: 'Неактивны 90+ дней', vip: 'VIP', recommended: 'Рекомендуемое', scheduleAuto: 'Запланировать автоматическую отправку', scheduleHint: 'Если выключено, кампания сохранится как черновик.', chooseDate: 'Выберите дату отправки', chooseTime: 'Выберите время', draftSaved: 'Черновик',
    waitlistStatus: { waiting: 'Ожидает', offered: 'Время предложено', booked: 'Записан', cancelled: 'Отменён', expired: 'Истекло' },
    campaignStatus: { draft: 'Черновик', scheduled: 'Запланирована', sending: 'Отправляется', sent: 'Отправлена', failed: 'Ошибка', cancelled: 'Отменена' },
    deliveryStatus: { pending: 'Ожидает', sent: 'Отправлено', failed: 'Ошибка' },
  },
  en: {
    title: 'Growth tools', waitlist: 'Waitlist', campaigns: 'Campaigns', emptyWaitlist: 'No waiting customers yet', emptyCampaigns: 'No campaigns yet', cancel: 'Cancel', return: 'Return to waiting', offer: 'Offer a time', available: 'Available times', noSlots: 'No available slots on this day', create: 'New campaign', edit: 'Edit', name: 'Internal name', subject: 'Email subject', body: 'Message', segment: 'Segment', save: 'Save', send: 'Send now', deliveries: 'Delivery history', close: 'Close', recipients: 'recipients', sent: 'sent', failed: 'failed', actionFailed: 'Action failed', retry: 'Try again', all: 'All', new: 'New', returning: 'Returning', inactive: 'Inactive 90+ days', vip: 'VIP', recommended: 'Recommended', scheduleAuto: 'Schedule automatic delivery', scheduleHint: 'When off, the campaign is saved as a draft.', chooseDate: 'Choose delivery date', chooseTime: 'Choose time', draftSaved: 'Draft',
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

function waitlistStatusTone(status: WaitlistStatus, theme: ReturnType<typeof useApp>['theme']) {
  if (status === 'booked') return theme.success;
  if (status === 'cancelled' || status === 'expired') return theme.danger;
  if (status === 'offered') return theme.plum;
  return theme.gold;
}

function campaignStatusTone(status: CampaignStatus, theme: ReturnType<typeof useApp>['theme']) {
  if (status === 'sent') return theme.success;
  if (status === 'failed' || status === 'cancelled') return theme.danger;
  if (status === 'scheduled' || status === 'sending') return theme.plum;
  return theme.muted;
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
      <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
      <View style={[styles.tabs, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Tab title={c.waitlist} selected={tab === 'waitlist'} onPress={() => setTab('waitlist')} />
        <Tab title={c.campaigns} selected={tab === 'campaigns'} onPress={() => setTab('campaigns')} />
      </View>

      {tab === 'waitlist' ? <>
        {waitlist.isLoading ? <ActivityIndicator color={theme.plum} /> : waitlist.isError ? <ErrorState onRetry={() => waitlist.refetch()} /> : waitlist.data?.length ? waitlist.data.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: theme.text }]}>{item.customer_name}</Text>
              <Text style={{ color: theme.muted }}>{item.service?.name ?? '—'} · {formatDateKey(item.desired_date, locale)}</Text>
              <Text style={{ color: theme.muted, marginTop: 2 }}>{item.customer_phone}</Text>
              {item.offered_starts_at ? <Text style={{ color: theme.plum, marginTop: 5, fontWeight: '800' }}>{formatApiDateTime(item.offered_starts_at, locale)} · {item.offered_staff?.name ?? item.staff?.name ?? ''}</Text> : null}
            </View>
            <Text style={[styles.status, { color: waitlistStatusTone(item.status, theme) }]}>{c.waitlistStatus[item.status]}</Text>
          </View>
          <View style={styles.actions}>{item.status === 'waiting' ? <Action title={c.offer} onPress={() => setOfferEntry(item)} primary /> : null}{item.status === 'cancelled' ? <Action title={c.return} onPress={() => updateWaitlist.mutate({ id: item.id, status: 'waiting' })} /> : item.status === 'waiting' ? <Action title={c.cancel} onPress={() => updateWaitlist.mutate({ id: item.id, status: 'cancelled' })} danger /> : null}</View>
          {offerEntry?.id === item.id ? <View style={[styles.panel, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.panelHeader}><Text style={[styles.panelTitle, { color: theme.text }]}>{c.available}</Text><Pressable onPress={() => setOfferEntry(undefined)}><Text style={{ color: theme.muted, fontWeight: '800' }}>{c.close}</Text></Pressable></View>
            {slots.isFetching ? <ActivityIndicator color={theme.plum} /> : slots.isError ? <ErrorState onRetry={() => slots.refetch()} /> : slots.data?.length ? <View style={styles.slotGrid}>{slots.data.slice(0, 30).map((slot) => <Pressable key={`${slot.starts_at}-${slot.staff_id}`} disabled={offer.isPending} onPress={() => offer.mutate({ id: item.id, slot })} style={[styles.slot, { backgroundColor: slot.is_recommended ? theme.plumSoft : theme.surface, borderColor: slot.is_recommended ? theme.success : theme.border }]}><Text style={{ color: slot.is_recommended ? theme.success : theme.text, fontWeight: '900' }}>{slot.is_recommended ? '★ ' : ''}{formatApiTime(slot.starts_at, locale)}</Text><Text numberOfLines={1} style={{ color: theme.muted, fontSize: 10 }}>{slot.is_recommended ? c.recommended : slot.staff_name ?? `#${slot.staff_id}`}</Text>{slot.is_recommended && slot.staff_name ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 9 }}>{slot.staff_name}</Text> : null}</Pressable>)}</View> : <Text style={{ color: theme.muted }}>{c.noSlots}</Text>}
          </View> : null}
        </View>) : <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}><Text style={{ color: theme.muted, textAlign: 'center' }}>{c.emptyWaitlist}</Text></View>}
      </> : <>
        <Pressable onPress={() => beginCampaign()} style={[styles.createButton, { backgroundColor: theme.plum }]}><Text style={styles.white}>{c.create}</Text></Pressable>
        {editing ? <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.plum }]}>
          <Text style={[styles.panelTitle, { color: theme.text }]}>{editing === 'new' ? c.create : c.edit}</Text>
          <Field value={campaignForm.name} onChangeText={(name) => setCampaignForm((value) => ({ ...value, name }))} placeholder={c.name} />
          <Field value={campaignForm.subject} onChangeText={(subject) => setCampaignForm((value) => ({ ...value, subject }))} placeholder={c.subject} />
          <Field value={campaignForm.body} onChangeText={(body) => setCampaignForm((value) => ({ ...value, body }))} placeholder={c.body} multiline />
          <Text style={[styles.smallLabel, { color: theme.muted }]}>{c.segment}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>{segments.map((segment) => <Pressable key={segment} onPress={() => setCampaignForm((value) => ({ ...value, segment }))} style={[styles.segment, { borderColor: campaignForm.segment === segment ? theme.plum : theme.border, backgroundColor: campaignForm.segment === segment ? theme.plumSoft : theme.background }]}><Text style={{ color: campaignForm.segment === segment ? theme.plum : theme.text, fontWeight: '800' }}>{c[segment]}</Text></Pressable>)}</ScrollView>

          <Pressable onPress={() => setScheduleEnabled((value) => !value)} style={[styles.scheduleToggle, { borderColor: scheduleEnabled ? theme.success : theme.border, backgroundColor: scheduleEnabled ? theme.plumSoft : theme.background }]}>
            <View style={[styles.check, { borderColor: scheduleEnabled ? theme.success : theme.border, backgroundColor: scheduleEnabled ? theme.success : 'transparent' }]}><Text style={styles.checkText}>{scheduleEnabled ? '✓' : ''}</Text></View>
            <View style={styles.flex}><Text style={{ color: theme.text, fontWeight: '900' }}>{c.scheduleAuto}</Text><Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>{c.scheduleHint}</Text></View>
          </Pressable>
          {scheduleEnabled ? <View style={[styles.schedulePanel, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <Text style={[styles.smallLabel, { color: theme.text }]}>{c.chooseDate}</Text>
            <CalendarDatePicker value={scheduleDate} onChange={setScheduleDate} minDate={localDateKey()} />
            <Text style={[styles.smallLabel, { color: theme.text }]}>{c.chooseTime}</Text>
            <View style={styles.timeGrid}>{scheduleTimes.map((time) => <Pressable key={time} onPress={() => setScheduleTime(time)} style={[styles.timeChip, { borderColor: scheduleTime === time ? theme.success : theme.border, backgroundColor: scheduleTime === time ? theme.plumSoft : theme.surfaceRaised }]}><Text style={{ color: scheduleTime === time ? theme.success : theme.text, fontWeight: '900' }}>{time}</Text></Pressable>)}</View>
          </View> : null}
          <View style={styles.actions}><Action title={c.close} onPress={() => setEditing(undefined)} /><Pressable disabled={!validCampaign || saveCampaign.isPending} onPress={() => saveCampaign.mutate()} style={[styles.action, { backgroundColor: theme.plum, opacity: validCampaign ? 1 : 0.4 }]}>{saveCampaign.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable></View>
        </View> : null}
        {campaigns.isLoading ? <ActivityIndicator color={theme.plum} /> : campaigns.isError ? <ErrorState onRetry={() => campaigns.refetch()} /> : campaigns.data?.length ? campaigns.data.map((campaign) => <View key={campaign.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          <View style={styles.row}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{campaign.name}</Text><Text style={{ color: theme.muted }}>{campaign.subject}</Text><Text style={{ color: theme.muted, marginTop: 4 }}>{c.recipients}: {campaign.recipient_count} · {c.sent}: {campaign.sent_count} · {c.failed}: {campaign.failed_count}</Text>{campaign.scheduled_for ? <Text style={{ color: theme.plum, marginTop: 4, fontWeight: '800' }}>{formatApiDateTime(campaign.scheduled_for, locale)}</Text> : null}</View><Text style={[styles.status, { color: campaignStatusTone(campaign.status, theme) }]}>{c.campaignStatus[campaign.status]}</Text></View>
          <View style={styles.actions}>{!['sending', 'sent'].includes(campaign.status) ? <Action title={c.edit} onPress={() => beginCampaign(campaign)} /> : null}{!['sending', 'sent', 'cancelled'].includes(campaign.status) ? <Action title={c.send} onPress={() => sendCampaign.mutate(campaign.id)} primary /> : null}{!['sending', 'sent', 'cancelled'].includes(campaign.status) ? <Action title={c.cancel} onPress={() => cancelCampaign.mutate(campaign.id)} danger /> : null}<Action title={c.deliveries} onPress={() => setDeliveriesCampaign(campaign)} /></View>
          {deliveriesCampaign?.id === campaign.id ? <View style={[styles.panel, { backgroundColor: theme.background, borderColor: theme.border }]}><View style={styles.panelHeader}><Text style={[styles.panelTitle, { color: theme.text }]}>{c.deliveries}</Text><Pressable onPress={() => setDeliveriesCampaign(undefined)}><Text style={{ color: theme.muted, fontWeight: '800' }}>{c.close}</Text></Pressable></View>{deliveries.isLoading ? <ActivityIndicator color={theme.plum} /> : deliveries.isError ? <ErrorState onRetry={() => deliveries.refetch()} /> : deliveries.data?.length ? deliveries.data.slice(0, 100).map((delivery: MarketingDelivery) => <View key={delivery.id} style={[styles.delivery, { borderColor: theme.border }]}><View style={styles.flex}><Text numberOfLines={1} style={{ color: theme.text }}>{delivery.email}</Text>{delivery.sent_at ? <Text style={{ color: theme.muted, fontSize: 10, marginTop: 2 }}>{formatApiDateTime(delivery.sent_at, locale)}</Text> : null}</View><Text style={{ color: delivery.status === 'failed' ? theme.danger : delivery.status === 'sent' ? theme.success : theme.muted, fontWeight: '800', fontSize: 11 }}>{c.deliveryStatus[delivery.status]}</Text></View>) : <Text style={{ color: theme.muted }}>—</Text>}</View> : null}
        </View>) : <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}><Text style={{ color: theme.muted, textAlign: 'center' }}>{c.emptyCampaigns}</Text></View>}
      </>}
    </ScrollView>
  </SafeAreaView>;

  function Tab({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.tab, { backgroundColor: selected ? theme.plum : 'transparent' }]}><Text style={{ color: selected ? '#FFF' : theme.text, fontWeight: '900' }}>{title}</Text></Pressable>; }
  function Action({ title, onPress, primary, danger }: { title: string; onPress: () => void; primary?: boolean; danger?: boolean }) { return <Pressable onPress={onPress} style={[styles.action, { backgroundColor: primary ? theme.plum : danger ? theme.dangerSoft : theme.plumSoft }]}><Text style={{ color: primary ? '#FFF' : danger ? theme.danger : theme.plum, fontWeight: '800', textAlign: 'center', fontSize: 12 }}>{title}</Text></Pressable>; }
  function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} placeholderTextColor={theme.muted} style={[styles.input, props.multiline && styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />; }
  function ErrorState({ onRetry }: { onRetry: () => void }) { return <Pressable onPress={onRetry} style={[styles.error, { borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.actionFailed}</Text><Text style={{ color: theme.plum, fontWeight: '900', marginTop: 4 }}>{c.retry}</Text></Pressable>; }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingBottom: 44, gap: 10 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 4 }, tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3, marginBottom: 5 }, tab: { flex: 1, minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, card: { borderWidth: 1, borderRadius: 10, padding: 13, gap: 11 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, flex: { flex: 1 }, name: { fontSize: 16, fontWeight: '900', marginBottom: 4 }, status: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', maxWidth: 105, textAlign: 'right' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, action: { minHeight: 40, minWidth: 86, flexGrow: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 }, panel: { borderWidth: 1, borderRadius: 9, padding: 11, gap: 9 }, panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, panelTitle: { fontSize: 15, fontWeight: '900' }, slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, slot: { width: '31.5%', minHeight: 60, borderWidth: 1.5, borderRadius: 8, padding: 7, alignItems: 'center', justifyContent: 'center', gap: 2 }, createButton: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }, white: { color: '#FFF', fontWeight: '900' }, input: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }, multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' }, smallLabel: { fontSize: 12, fontWeight: '900' }, segmentRow: { gap: 7 }, segment: { minHeight: 39, borderWidth: 1, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 11 }, delivery: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth }, error: { borderWidth: 1, borderRadius: 9, padding: 12 }, empty: { borderWidth: 1, borderRadius: 10, minHeight: 110, alignItems: 'center', justifyContent: 'center', padding: 18 }, scheduleToggle: { minHeight: 64, borderWidth: 1.5, borderRadius: 9, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, checkText: { color: '#FFF', fontWeight: '900' }, schedulePanel: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 10 }, timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, timeChip: { width: '22.5%', minHeight: 40, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});