import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { publicApi, Service, Slot, Staff } from '@/services/api/public';
import { checkoutUrlFrom, openIdBankCheckout } from '@/services/payments';
import { VizitIcon } from '@/components/vizit-icon';
import { apiErrorMessage } from '@/services/api/client';
import { guestBookingStore } from '@/services/guest-booking-store';
import { formatApiTime, localDateKey, localDateTimeInputFromApi } from '@/services/date-time';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: { location: 'Մասնաճյուղ', noServices: 'Այս մասնաճյուղում ծառայություններ չկան', noStaff: 'Այս մասնաճյուղում հասանելի աշխատակիցներ չկան', noSlots: 'Այս օրվա համար ազատ ժամ չկա', retry: 'Կրկին փորձել', slotTaken: 'Այս ժամը հենց նոր զբաղեցվեց։ Ընտրեք մեկ այլ ազատ ժամ։' },
  ru: { location: 'Филиал', noServices: 'В этом филиале пока нет услуг', noStaff: 'В этом филиале нет доступных сотрудников', noSlots: 'На этот день свободных слотов нет', retry: 'Повторить', slotTaken: 'Это время только что заняли. Выберите другой свободный слот.' },
  en: { location: 'Location', noServices: 'No services at this location yet', noStaff: 'No available team members at this location', noSlots: 'No available times on this day', retry: 'Try again', slotTaken: 'That time was just taken. Choose another available slot.' },
};

export default function BookingScreen() {
  const { slug, locationId: locationParam } = useLocalSearchParams<{ slug: string; locationId?: string }>();
  const requestedLocationId = Number(locationParam) || undefined;
  const { locale, t, theme } = useApp();
  const c = copy[locale];
  const [chosenLocationId, setChosenLocationId] = useState<number | undefined>(requestedLocationId);
  const [service, setService] = useState<Service>();
  const [staff, setStaff] = useState<Staff>();
  const [date, setDate] = useState(localDateKey(0));
  const [slot, setSlot] = useState<Slot>();
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  const business = useQuery({ queryKey: ['business', slug], queryFn: () => publicApi.business(slug), enabled: Boolean(slug), retry: false, refetchOnMount: 'always' });
  const locations = useMemo(() => business.data?.locations ?? [], [business.data?.locations]);
  const chosenLocation = chosenLocationId ? locations.find((location) => location.id === chosenLocationId) : undefined;
  const requestedLocation = requestedLocationId ? locations.find((location) => location.id === requestedLocationId) : undefined;
  const locationId = chosenLocation?.id ?? requestedLocation?.id ?? locations[0]?.id;

  const services = useQuery({ queryKey: ['services', slug, locationId], queryFn: () => publicApi.services(slug, locationId), enabled: Boolean(slug && locationId), retry: false, refetchOnMount: 'always' });
  const staffList = useQuery({ queryKey: ['staff', slug, locationId], queryFn: () => publicApi.staff(slug, locationId), enabled: Boolean(slug && locationId), retry: false, refetchOnMount: 'always' });
  const slots = useQuery({
    queryKey: ['availability', slug, service?.id, staff?.id, date, locationId],
    queryFn: () => publicApi.availability(slug, { date, service_id: service!.id, staff_id: staff?.id, location_id: locationId }),
    enabled: Boolean(slug && locationId && service && date),
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: 5_000,
    staleTime: 0,
  });
  const dates = useMemo(() => Array.from({ length: 10 }, (_, index) => localDateKey(index)), []);

  const booking = useMutation({
    mutationFn: () => publicApi.createBooking(slug, {
      service_id: service!.id,
      staff_id: slot?.staff_id ?? staff?.id,
      starts_at: localDateTimeInputFromApi(slot!.starts_at),
      client_name: form.name.trim(),
      client_phone: form.phone.trim(),
      client_email: form.email.trim(),
      notes: form.notes.trim() || null,
      source: 'mobile',
      location_id: locationId,
    }),
    onSuccess: async (result) => {
      const response = result.data ?? result;
      const bookingReference = response.booking_code;
      if (typeof bookingReference === 'string' && bookingReference.trim()) {
        await guestBookingStore.rememberCode(bookingReference).catch(() => undefined);
      }
      const checkoutUrl = checkoutUrlFrom(result);
      if (checkoutUrl) await openIdBankCheckout(checkoutUrl);
      Alert.alert(t('bookingSuccess'), t('bookingOtpHint'), [{ text: 'OK', onPress: () => router.replace('/(customer)/bookings') }]);
    },
    onError: async (error) => {
      setSlot(undefined);
      await slots.refetch();
      const message = apiErrorMessage(error);
      Alert.alert(t('loadError'), /not available|already booked|занят|զբաղ/i.test(message) ? c.slotTaken : message);
    },
  });

  const valid = !!locationId && !!service && !!slot && form.name.trim().length >= 2 && form.phone.trim().length >= 5 && /^\S+@\S+\.\S+$/.test(form.email.trim());
  const currentStep = slot ? 4 : service ? 3 : 1;
  const changeLocation = (id: number) => {
    if (id === locationId) return;
    setChosenLocationId(id);
    setService(undefined);
    setStaff(undefined);
    setSlot(undefined);
  };
  const leaveBooking = () => safeBack({ pathname: '/business/[slug]', params: { slug } });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={leaveBooking} style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable><View style={styles.headerCenter}><Text style={[styles.headerTitle, { color: theme.text }]}>{t('bookNow')}</Text><Text style={[styles.stepLabel, { color: theme.muted }]}>{currentStep}/4</Text></View><View style={styles.back} /></View>
    <View style={[styles.progressTrack, { backgroundColor: theme.border }]}><View style={[styles.progressValue, { backgroundColor: theme.plum, width: `${currentStep * 25}%` }]} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {business.isLoading ? <ActivityIndicator color={theme.plum} /> : business.isError ? <ErrorState onRetry={() => business.refetch()} /> : locations.length > 1 ? <View style={styles.locationBlock}><Text style={[styles.locationTitle, { color: theme.text }]}>{c.location}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{locations.map((location) => { const selected = location.id === locationId; return <Pressable key={location.id} onPress={() => changeLocation(location.id)} style={[styles.locationChip, { backgroundColor: selected ? theme.plumSoft : theme.surface, borderColor: selected ? theme.plum : theme.border }]}><Text style={{ color: selected ? theme.plum : theme.text, fontWeight: '800' }}>{location.name || location.address || `#${location.id}`}</Text></Pressable>; })}</ScrollView></View> : null}

      <ChoiceSection step="1" title={t('chooseService')} loading={services.isLoading} error={services.isError} retry={() => services.refetch()} empty={services.data && !services.data.length ? c.noServices : undefined}>{services.data?.map((item) => <Choice key={item.id} selected={service?.id === item.id} label={item.name} detail={`${item.duration_minutes} min · ${item.price.toLocaleString()} ${item.currency}`} onPress={() => { setService(item); setStaff(undefined); setSlot(undefined); }} />)}</ChoiceSection>

      {service ? <ChoiceSection step="2" title={t('chooseStaff')} loading={staffList.isLoading} error={staffList.isError} retry={() => staffList.refetch()} empty={staffList.data && !staffList.data.length ? c.noStaff : undefined}><Choice selected={!staff} label={t('anyStaff')} icon="person.2.fill" onPress={() => { setStaff(undefined); setSlot(undefined); }} />{staffList.data?.map((item) => <Choice key={item.id} selected={staff?.id === item.id} label={item.name} icon="person.fill" onPress={() => { setStaff(item); setSlot(undefined); }} />)}</ChoiceSection> : null}

      {service ? <Section step="3" title={t('chooseDate')}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{dates.map((item) => <DateChoice key={item} value={item} selected={date === item} locale={locale} onPress={() => { setDate(item); setSlot(undefined); }} />)}</ScrollView><Text style={[styles.timeTitle, { color: theme.text }]}>{t('chooseTime')}</Text>{slots.isFetching && !slots.data ? <ActivityIndicator color={theme.plum} /> : slots.isError ? <ErrorState onRetry={() => slots.refetch()} /> : !slots.data?.length ? <Text style={[styles.emptyText, { color: theme.muted }]}>{c.noSlots}</Text> : <View style={styles.slotGrid}>{slots.data.map((item) => <Choice key={`${item.starts_at}-${item.staff_id}`} compact recommended={Boolean(item.is_recommended)} selected={slot?.starts_at === item.starts_at && slot.staff_id === item.staff_id} label={`${item.is_recommended ? '★ ' : ''}${formatApiTime(item.starts_at, locale)}–${formatApiTime(item.ends_at, locale)}`} detail={!staff ? item.staff_name : item.is_recommended ? t('recommended') : undefined} onPress={() => setSlot(item)} />)}</View>}</Section> : null}

      {slot ? <Section step="4" title={t('customerDetails')}><View style={[styles.formCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}><Field placeholder={t('fullName')} value={form.name} onChangeText={(name) => setForm({ ...form, name })} /><Field placeholder={t('phone')} value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm({ ...form, phone })} /><Field placeholder={t('email')} value={form.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(email) => setForm({ ...form, email })} /><Field placeholder={t('notes')} value={form.notes} multiline onChangeText={(notes) => setForm({ ...form, notes })} /></View></Section> : null}

      {slot ? <Pressable disabled={!valid || booking.isPending} onPress={() => booking.mutate()} style={({ pressed }) => [styles.submit, { backgroundColor: theme.plum, opacity: !valid ? 0.42 : pressed ? 0.88 : 1 }]}>{booking.isPending ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.submitText}>{t('confirmBooking')}</Text><VizitIcon ios="arrow.right" android="arrow_forward" color="#FFFFFF" size={19} /></>}</Pressable> : null}
    </ScrollView>
  </SafeAreaView>;

  function ErrorState({ onRetry }: { onRetry: () => void }) {
    return <Pressable onPress={onRetry} style={[styles.errorState, { borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{t('loadError')}</Text><Text style={{ color: theme.plum, fontWeight: '900', marginTop: 4 }}>{c.retry}</Text></Pressable>;
  }
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) { const { theme } = useApp(); return <View style={styles.section}><View style={styles.sectionHeading}><View style={[styles.stepCircle, { backgroundColor: theme.plumSoft }]}><Text style={[styles.stepNumber, { color: theme.plum }]}>{step}</Text></View><Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text></View>{children}</View>; }
function ChoiceSection({ step, title, loading, error, retry, empty, children }: { step: string; title: string; loading: boolean; error?: boolean; retry: () => void; empty?: string; children: React.ReactNode }) { const { theme, t } = useApp(); return <Section step={step} title={title}>{loading ? <ActivityIndicator color={theme.plum} /> : error ? <Pressable onPress={retry} style={[styles.errorState, { borderColor: theme.border }]}><Text style={{ color: theme.danger }}>{t('loadError')}</Text></Pressable> : empty ? <Text style={[styles.emptyText, { color: theme.muted }]}>{empty}</Text> : children}</Section>; }
function Choice({ selected, label, detail, onPress, compact, icon, recommended = false }: { selected: boolean; label: string; detail?: string; onPress: () => void; compact?: boolean; icon?: 'person.fill' | 'person.2.fill'; recommended?: boolean }) { const { theme } = useApp(); const accent = recommended ? theme.success : theme.plum; const selectedBackground = recommended ? theme.successSoft : theme.plumSoft; return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, compact && styles.compact, { backgroundColor: selected || recommended ? selectedBackground : theme.surface, borderColor: selected || recommended ? accent : theme.border, opacity: pressed ? 0.86 : 1 }]}>{icon ? <VizitIcon ios={icon} android={icon === 'person.fill' ? 'person' : 'group'} color={selected ? theme.plum : theme.muted} size={21} /> : null}<View style={{ flex: compact ? undefined : 1 }}><Text style={[styles.choiceTitle, { color: recommended ? theme.success : theme.text }]}>{label}</Text>{detail ? <Text numberOfLines={1} style={{ color: theme.muted, marginTop: 3, fontSize: 12 }}>{detail}</Text> : null}</View>{selected && !compact ? <VizitIcon ios="checkmark.circle.fill" android="check_circle" color={theme.plum} size={22} /> : null}</Pressable>; }
function DateChoice({ value, selected, locale, onPress }: { value: string; selected: boolean; locale: string; onPress: () => void }) { const { theme } = useApp(); const date = new Date(`${value}T12:00:00`); const day = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date); const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date); return <Pressable onPress={onPress} style={[styles.dateChoice, { backgroundColor: selected ? theme.plum : theme.surface, borderColor: selected ? theme.plum : theme.border }]}><Text style={[styles.weekday, { color: selected ? '#FFFFFFCC' : theme.muted }]}>{weekday}</Text><Text style={[styles.day, { color: selected ? '#FFFFFF' : theme.text }]}>{day}</Text></Pressable>; }
function Field(props: React.ComponentProps<typeof TextInput>) { const { theme } = useApp(); return <TextInput {...props} placeholderTextColor={theme.muted} style={[styles.field, props.multiline && styles.multiline, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} />; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }, back: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headerCenter: { alignItems: 'center' }, headerTitle: { fontSize: 18, fontWeight: '900' }, stepLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 }, progressTrack: { height: 3 }, progressValue: { height: 3 }, content: { padding: 18, paddingBottom: 50 },
  locationBlock: { marginBottom: 22, gap: 8 }, locationTitle: { fontSize: 14, fontWeight: '900' }, locationChip: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, horizontal: { gap: 8 },
  section: { marginBottom: 29, gap: 9 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 3 }, stepCircle: { width: 29, height: 29, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, stepNumber: { fontSize: 13, fontWeight: '900' }, sectionTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.25 },
  choice: { minHeight: 62, padding: 13, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, compact: { minWidth: 101, minHeight: 50, justifyContent: 'center', flexGrow: 1 }, choiceTitle: { fontSize: 15, fontWeight: '800' }, dateChoice: { width: 62, height: 68, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, weekday: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }, day: { fontSize: 21, fontWeight: '900', marginTop: 3 },
  timeTitle: { fontSize: 16, fontWeight: '900', marginTop: 10 }, slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, formCard: { padding: 13, gap: 9, borderRadius: 10, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }, field: { minHeight: 52, borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, fontSize: 16 }, multiline: { minHeight: 86, paddingTop: 14, textAlignVertical: 'top' }, submit: { height: 55, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, submitText: { color: '#FFF', fontSize: 16, fontWeight: '900' }, emptyText: { fontSize: 13, lineHeight: 19 }, errorState: { borderWidth: 1, borderRadius: 9, padding: 13 },
});