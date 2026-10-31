import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackAppBooking } from '@/services/site-analytics';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from './calendar-date-picker';
import { GuestBookingDetail } from './guest-booking-detail';
import { PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, Surface } from './premium-ui';
import { VizitIcon } from './vizit-icon';
import { LegalConsent } from './legal-consent';
import { LEGAL_DOCUMENT_VERSION } from '@/constants/legal';
import { ui } from '@/constants/vizit-theme';
import { rentalCopy } from '@/i18n/rentals';
import { useApp } from '@/providers/app-provider';
import { apiErrorMessage } from '@/services/api/client';
import type { PublicBusiness } from '@/services/api/public';
import { rentalApi } from '@/services/api/rentals';
import { guestBookingStore } from '@/services/guest-booking-store';
import { safeBack } from '@/services/navigation';
import { dateKeyDiffDays, rentalDateKey, rentalDuration, rentalDurationLabel, rentalLocalStamp, rentalQuote, rentalRangeEnd, rentalSlotWithin, rentalUnitFactors, selectedRentalSlot, validRentalDuration, type RentalUnit } from '@/services/rentals';


export function RentalBookingScreen({ business, manual = false }: { business: PublicBusiness; manual?: boolean }) {
  const { locale, theme, t } = useApp();
  const c = rentalCopy[locale];
  const cache = useQueryClient();
  const scroll = useRef<ScrollView>(null);
  const rates = business.rental;
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(() => rentalDateKey(business.timezone));
  const [unit, setUnit] = useState<RentalUnit>('hours');
  const [quantity, setQuantity] = useState(String((rates?.min_minutes ?? 60) / 60));
  const [startsAt, setStartsAt] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [legal, setLegal] = useState(false);
  const [message, setMessage] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [received, setReceived] = useState(false);
  const duration = rentalDuration(quantity, unit);
  const validDuration = Boolean(rates && validRentalDuration(duration, rates));
  const today = rentalDateKey(business.timezone);
  const slots = useQuery({ queryKey: [manual ? 'business-rental-availability' : 'rental-public-availability', business.slug, date, duration], queryFn: () => manual ? rentalApi.manualSlots(date, duration) : rentalApi.slots(business.slug, date, duration), enabled: !received && step > 0 && validDuration && date >= today, retry: false, staleTime: 0, refetchInterval: received ? false : 15000 });
  const selected = selectedRentalSlot(slots.data, startsAt);
  const validContact = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 8 && (manual && !form.email.trim() || /^\S+@\S+\.\S+$/.test(form.email.trim()));
  const money = (amount: number) => `${amount.toLocaleString(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US')} ֏`;
  const next = (value: number) => { setStep(value); setMessage(''); scroll.current?.scrollTo({ y: 0, animated: true }); };
  const refresh = () => Promise.all([
    cache.invalidateQueries({ queryKey: ['business-rental-bookings'] }), cache.invalidateQueries({ queryKey: ['business-rental-summary'] }),
    cache.invalidateQueries({ queryKey: ['business-clients'] }), cache.invalidateQueries({ queryKey: ['guest-booking-history'] }), cache.invalidateQueries({ queryKey: ['client-bookings'] }), cache.invalidateQueries({ queryKey: ['rental-public-availability'] }),
    cache.invalidateQueries({ queryKey: ['business-rental-availability'] }),
  ]);
  const create = useMutation({
    mutationFn: () => {
      if (!selected || !validDuration || !validContact || date < today || slots.isError || slots.isFetching || !manual && !legal) throw new Error(c.required);
      const payload = { starts_at: selected.starts_at, duration_minutes: duration, client_name: form.name.trim(), client_phone: form.phone.trim(), client_email: form.email.trim() || undefined, notes: form.notes.trim() || null };
      return manual ? rentalApi.create(payload) : rentalApi.publicCreate(business.slug, { ...payload, legal_accepted: legal, terms_version: LEGAL_DOCUMENT_VERSION, privacy_version: LEGAL_DOCUMENT_VERSION });
    },
    onSuccess: async (result) => {
      // Mark success before storage/cache work: an accepted reservation must never
      // be submitted twice because the device keychain or a refresh failed.
      setReceived(true);
      if (!manual) trackAppBooking(`/book/${business.slug}`);
      if (!manual) {
        const response = result.data ?? result;
        const code = typeof response.booking_code === 'string' ? response.booking_code.trim() : '';
        if (code) {
          setCreatedCode(code);
          await guestBookingStore.rememberGuestBooking(code, { businessName: business.name, businessSlug: business.slug, serviceName: c.title, startsAt: selected?.starts_at, endsAt: selected?.ends_at, status: 'pending' }).catch(() => setMessage(c.stored));
        }
      }
      await refresh();
    },
    onError: (error) => { setMessage(apiErrorMessage(error)); setStartsAt(''); setStep(1); void slots.refetch(); scroll.current?.scrollTo({ y: 0, animated: true }); },
  });

  if (createdCode) return <GuestBookingDetail code={createdCode} onBack={() => safeBack('/(customer)/bookings')} />;
  if (!rates || rates.hourly_price == null) return <SafeAreaView style={[styles.screen, styles.content, { backgroundColor: theme.background }]}><PageHeader title={business.name} onBack={() => safeBack(manual ? '/(business)/today' : '/(customer)/discover')} backLabel={c.back} /><StateCard title={c.unavailable} /></SafeAreaView>;
  if (received) return <SafeAreaView style={[styles.screen, styles.content, { backgroundColor: theme.background }]}><PageHeader title={c.success} subtitle={business.name} /><StateCard title={c.success} message={manual ? c.financeHint : c.stored} action={<PremiumButton title={c.back} onPress={() => safeBack(manual ? '/(business)/today' : '/(customer)/bookings')} />} /></SafeAreaView>;

  const changeDuration = (value: string) => { setQuantity(value); setStartsAt(''); };
  const rangeEnd = rentalRangeEnd(date, validDuration ? duration : 0, selected);
  const allowRange = Boolean(rates.allow_overnight) && rates.max_minutes >= 1440;
  // Tapping an end day turns the booking into that many whole days.
  const pickRange = (start: string, end: string | null) => {
    setDate(start); setStartsAt(''); setMessage('');
    if (end === null) return;
    const days = dateKeyDiffDays(start, end);
    if (days <= 0) { if (duration >= 1440) { setUnit('hours'); setQuantity(String(rates.min_minutes / 60)); } return; }
    let minutes = days * 1440;
    if (minutes > rates.max_minutes) { minutes = Math.floor(rates.max_minutes / 1440) * 1440; setMessage(`${c.durationHint}: ${rentalDurationLabel(rates.min_minutes, c)} – ${rentalDurationLabel(rates.max_minutes, c)}`); }
    if (minutes >= rates.min_minutes) { setUnit('days'); setQuantity(String(minutes / 1440)); }
  };
  const estimate = validDuration && rates.hourly_price != null ? rentalQuote(rates.hourly_price, duration, rates.duration_discounts ?? []) : null;
  const validSelection = Boolean(selected && validDuration && date >= today && !slots.isError && !slots.isFetching);
  const canContinue = step === 0 ? validDuration && date >= today : step === 1 ? validSelection : validSelection && validContact && (manual || legal);
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow={c.title} title={manual ? c.newBooking : c.book} subtitle={business.name} onBack={() => { if (create.isPending) return; if (step) next(step - 1); else safeBack(manual ? '/(business)/today' : '/(customer)/discover'); }} backLabel={c.back} />
        <View style={styles.progress}>{[c.date, c.availability, c.details].map((label, index) => <View key={label} style={[styles.progressItem, { borderBottomColor: index <= step ? theme.accent : theme.border }]}><Text style={[styles.progressText, { color: index === step ? theme.accentText : theme.muted }]}>{index + 1}. {label}</Text></View>)}</View>
        {message ? <StateCard title={c.failed} message={message} tone="danger" /> : null}
        {step === 0 ? <>
          <SectionHeader title={c.date} detail={c.intro} />
          <CalendarDatePicker value={date} minDate={today} rangeEnd={rangeEnd} onRangeChange={allowRange ? pickRange : undefined} onChange={(value) => { setDate(value); setStartsAt(''); }} />
          <Surface style={styles.stack}>
            <SectionHeader title={c.duration} />
            <View style={styles.units}>{(['minutes', 'hours', 'days'] as RentalUnit[]).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={c[value]} accessibilityState={{ checked: value === unit }} onPress={() => { setUnit(value); setQuantity(String(duration / rentalUnitFactors[value])); setStartsAt(''); }} style={[styles.unit, { backgroundColor: value === unit ? theme.accentSoft : theme.surface, borderColor: value === unit ? theme.accent : theme.border }]}><Text style={[styles.unitText, { color: value === unit ? theme.accentText : theme.textSecondary }]}>{c[value]}</Text></Pressable>)}</View>
            <PremiumInput label={`${c.duration}, ${c[unit]}`} value={quantity} keyboardType="decimal-pad" onChangeText={changeDuration} maxLength={10} error={validDuration ? undefined : `${c.durationHint}: ${rentalDurationLabel(rates.min_minutes, c)} – ${rentalDurationLabel(rates.max_minutes, c)}`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{Array.from(new Set([rates.min_minutes, 60, 120, 180, 1440, 4320])).filter((value) => validRentalDuration(value, rates)).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: duration === value }} onPress={() => { setQuantity(String(value / rentalUnitFactors[unit])); setStartsAt(''); }} style={[styles.preset, { borderColor: duration === value ? theme.accent : theme.border }]}><Text style={[styles.unitText, { color: duration === value ? theme.accentText : theme.text }]}>{rentalDurationLabel(value, c)}</Text></Pressable>)}</ScrollView>
            <Text style={[styles.caption, { color: theme.muted }]}>{c.durationHint}: {rentalDurationLabel(rates.min_minutes, c)} – {rentalDurationLabel(rates.max_minutes, c)} · {c.step}: {rates.slot_step_minutes} {c.minutes}</Text>
            {rates.duration_discounts?.length ? <Text style={[styles.caption, { color: theme.success }]}>{[...rates.duration_discounts].sort((x, y) => x.min_minutes - y.min_minutes).map((tier) => c.discountTier(String(Math.round(tier.min_minutes / 60 * 100) / 100), tier.percent)).join(' · ')}</Text> : null}
            <Text style={[styles.caption, { color: theme.muted }]}>{c.dayHelp}</Text>
          </Surface>
        </> : <>
          <Surface style={[styles.stack, { backgroundColor: theme.accentSubtle }]}>
            <View style={styles.row}><VizitIcon ios="calendar" android="calendar_month" color={theme.accentText} size={20} /><Text style={[styles.body, { color: theme.text }]}>{rangeEnd > date ? `${date} → ${rangeEnd}` : date} · {rentalDurationLabel(duration, c)}</Text></View>
            {selected ? <><Text style={[styles.body, { color: theme.text }]}>{c.arrival}: {rentalLocalStamp(selected.starts_at, locale)}</Text><Text style={[styles.body, { color: theme.text }]}>{c.departure}: {rentalLocalStamp(selected.ends_at, locale)}</Text></> : null}
          </Surface>
          {step === 1 ? <>
            <SectionHeader title={c.availability} detail={rates.allow_overnight ? c.overnight : c.withinHours} />
            {slots.isLoading ? <ActivityIndicator color={theme.accent} accessibilityLabel={c.loading} /> : slots.isError ? <StateCard title={t('loadError')} message={apiErrorMessage(slots.error)} action={<PremiumButton title={c.retry} onPress={() => void slots.refetch()} tone="secondary" />} /> : !slots.data?.length ? <StateCard title={c.noSlots} /> : <View style={styles.slots}>{slots.data.map((slot) => <Pressable key={slot.starts_at} accessibilityRole="button" accessibilityLabel={`${c.arrival}: ${rentalLocalStamp(slot.starts_at, locale)}, ${c.departure}: ${rentalLocalStamp(slot.ends_at, locale)}`} accessibilityState={{ selected: slot.starts_at === startsAt }} onPress={() => setStartsAt(slot.starts_at)} style={[styles.slot, slot.starts_at === startsAt ? { backgroundColor: theme.primary, borderColor: theme.primary } : rentalSlotWithin(slot, selected) ? { backgroundColor: theme.accentSoft, borderColor: theme.accent } : { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.slotStart, { color: slot.starts_at === startsAt ? theme.onPrimary : theme.text }]}>{slot.starts_at.slice(11, 16)}</Text><Text style={[styles.caption, { color: slot.starts_at === startsAt ? theme.onPrimary : theme.muted }]}>– {slot.ends_at.slice(0, 10) === date ? slot.ends_at.slice(11, 16) : rentalLocalStamp(slot.ends_at, locale)}</Text></Pressable>)}</View>}
          </> : <>
            {!selected && !slots.isFetching ? <StateCard title={c.taken} action={<PremiumButton title={c.availability} onPress={() => next(1)} tone="secondary" />} /> : null}
            <Surface style={styles.stack}>
              <SectionHeader title={c.details} detail={manual ? undefined : c.pending} />
              <PremiumInput label={c.name} value={form.name} maxLength={120} autoComplete="name" onChangeText={(name) => setForm((value) => ({ ...value, name }))} />
              <PremiumInput label={c.phone} value={form.phone} maxLength={40} keyboardType="phone-pad" autoComplete="tel" onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} />
              <PremiumInput label={manual ? c.optionalEmail : c.email} value={form.email} maxLength={150} autoCapitalize="none" keyboardType="email-address" autoComplete="email" onChangeText={(email) => setForm((value) => ({ ...value, email }))} />
              <PremiumInput label={c.notes} value={form.notes} maxLength={2000} multiline onChangeText={(notes) => setForm((value) => ({ ...value, notes }))} />
            </Surface>
            {!manual ? <LegalConsent checked={legal} onChange={setLegal} /> : null}
          </>}
        </>}
        <Text style={[styles.caption, { color: theme.muted }]}>{c.timezone}: {business.timezone || 'Asia/Yerevan'}</Text>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
        <View style={styles.footerPrice}><Text style={[styles.caption, { color: theme.muted }]}>{selected || estimate ? c.total : c.hourly}</Text><Text style={[styles.price, { color: theme.text }]}>{money(selected?.price ?? estimate?.price ?? rates.hourly_price)}</Text>{(selected?.discount_percent ?? estimate?.percent) ? <Text style={[styles.caption, { color: theme.success }]}>{c.discountApplied((selected?.discount_percent ?? estimate?.percent)!)} · {money(selected?.gross_price ?? estimate?.gross ?? 0)}</Text> : null}</View>
        <PremiumButton title={step < 2 ? t('continue') : manual ? c.create : c.confirm} disabled={!canContinue || create.isSuccess} loading={create.isPending} onPress={() => { if (!canContinue) return; if (step < 2) next(step + 1); else if (!create.isPending && !create.isSuccess) create.mutate(); }} style={styles.footerButton} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: ui.screenGutter, paddingBottom: 28, gap: 18 }, stack: { gap: 12 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }, flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 8 }, progressItem: { flex: 1, paddingBottom: 10, borderBottomWidth: 3 }, progressText: { ...ui.type.caption },
  units: { flexDirection: 'row', gap: 8 }, unit: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center', padding: 8 }, unitText: ui.type.caption,
  chips: { gap: 8 }, preset: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: ui.radius.small },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, slot: { minWidth: 130, flexBasis: '45%', flexGrow: 1, borderWidth: 1, borderRadius: ui.radius.medium, minHeight: 74, justifyContent: 'center', padding: 12, gap: 4 }, slotStart: { ...ui.type.cardTitle },
  body: ui.type.body, caption: ui.type.caption, consent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: ui.screenGutter, paddingVertical: 12, borderTopWidth: 1 }, footerPrice: { flex: 1, minWidth: 0, gap: 4 }, footerButton: { flex: 1, minWidth: 0 }, price: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
});
