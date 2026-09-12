import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PremiumButton, PremiumInput, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { publicApi, Service, Slot, Staff } from '@/services/api/public';
import { checkoutUrlFrom, openIdBankCheckout } from '@/services/payments';
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
  const visibleSlots = useMemo(() => (slots.data ?? []).filter((item) => !staff || item.staff_id === staff.id), [slots.data, staff]);
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

  const valid = Boolean(locationId && service && slot && form.name.trim().length >= 2 && form.phone.trim().length >= 5 && /^\S+@\S+\.\S+$/.test(form.email.trim()));
  const currentStep = slot ? 4 : service ? 3 : 1;
  const changeLocation = (id: number) => {
    if (id === locationId) return;
    setChosenLocationId(id);
    setService(undefined);
    setStaff(undefined);
    setSlot(undefined);
  };
  const leaveBooking = () => safeBack({ pathname: '/business/[slug]', params: { slug } });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('back')} ios="chevron.left" android="chevron_left" onPress={leaveBooking} />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('bookNow')}</Text>
          <Text style={[styles.stepLabel, { color: theme.muted }]}>{currentStep}/4</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
        <View style={[styles.progressValue, { backgroundColor: theme.accent, width: `${currentStep * 25}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {business.isLoading ? <ActivityIndicator color={theme.accent} size="large" /> : business.isError ? (
          <InlineError title={t('loadError')} retryLabel={c.retry} onRetry={() => business.refetch()} />
        ) : locations.length > 1 ? (
          <View style={styles.locationBlock}>
            <Text style={[styles.locationTitle, { color: theme.text }]}>{c.location}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
              {locations.map((location, index) => {
                const selected = location.id === locationId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={location.id}
                    onPress={() => changeLocation(location.id)}
                    style={({ pressed }) => [styles.locationChip, { backgroundColor: selected ? theme.accentSoft : theme.surfaceRaised, borderColor: selected ? theme.accent : theme.border, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <VizitIcon ios="mappin" android="location_on" color={selected ? theme.accentText : theme.faint} size={16} />
                    <Text style={[styles.locationChipText, { color: selected ? theme.accentText : theme.text }]}>{location.name || location.address || `${c.location} ${index + 1}`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <ChoiceSection step="1" title={t('chooseService')} loading={services.isLoading} error={services.isError} retry={() => services.refetch()} empty={services.data && !services.data.length ? c.noServices : undefined} retryLabel={c.retry}>
          {services.data?.map((item) => (
            <Choice
              key={item.id}
              selected={service?.id === item.id}
              label={item.name}
              detail={`${item.duration_minutes} min · ${item.price.toLocaleString()} ${item.currency}`}
              onPress={() => { setService(item); setStaff(undefined); setSlot(undefined); }}
            />
          ))}
        </ChoiceSection>

        {service ? (
          <ChoiceSection step="2" title={t('chooseStaff')} loading={staffList.isLoading} error={staffList.isError} retry={() => staffList.refetch()} empty={staffList.data && !staffList.data.length ? c.noStaff : undefined} retryLabel={c.retry}>
            <Choice selected={!staff} label={t('anyStaff')} icon="person.2.fill" onPress={() => { setStaff(undefined); setSlot(undefined); }} />
            {staffList.data?.map((item) => <Choice key={item.id} selected={staff?.id === item.id} label={item.name} icon="person.fill" onPress={() => { setStaff(item); setSlot(undefined); }} />)}
          </ChoiceSection>
        ) : null}

        {service ? (
          <Section step="3" title={t('chooseDate')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
              {dates.map((item) => <DateChoice key={item} value={item} selected={date === item} locale={locale} onPress={() => { setDate(item); setSlot(undefined); }} />)}
            </ScrollView>
            <Text style={[styles.timeTitle, { color: theme.text }]}>{t('chooseTime')}</Text>
            {slots.isFetching && !slots.data ? <ActivityIndicator color={theme.accent} /> : slots.isError ? (
              <InlineError title={t('loadError')} retryLabel={c.retry} onRetry={() => slots.refetch()} />
            ) : !visibleSlots.length ? <Text style={[styles.emptyText, { color: theme.muted }]}>{c.noSlots}</Text> : (
              <View style={styles.slotGrid}>
                {visibleSlots.map((item) => (
                  <Choice
                    key={`${item.starts_at}-${item.staff_id}`}
                    compact
                    recommended={Boolean(item.is_recommended)}
                    selected={slot?.starts_at === item.starts_at && slot.staff_id === item.staff_id}
                    label={`${formatApiTime(item.starts_at, locale)}–${formatApiTime(item.ends_at, locale)}`}
                    detail={!staff ? item.staff_name : item.is_recommended ? t('recommended') : undefined}
                    onPress={() => setSlot(item)}
                  />
                ))}
              </View>
            )}
          </Section>
        ) : null}

        {slot ? (
          <Section step="4" title={t('customerDetails')}>
            <Surface style={styles.formCard}>
              <PremiumInput label={t('fullName')} placeholder={t('fullName')} value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} icon={{ ios: 'person.fill', android: 'person' }} />
              <PremiumInput label={t('phone')} placeholder={t('phone')} value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} icon={{ ios: 'phone.fill', android: 'call' }} />
              <PremiumInput label={t('email')} placeholder={t('email')} value={form.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(email) => setForm((value) => ({ ...value, email }))} icon={{ ios: 'envelope.fill', android: 'mail' }} />
              <PremiumInput label={t('notes')} placeholder={t('notes')} value={form.notes} multiline onChangeText={(notes) => setForm((value) => ({ ...value, notes }))} icon={{ ios: 'text.alignleft', android: 'notes' }} />
            </Surface>
          </Section>
        ) : null}

        {slot ? (
          <PremiumButton
            title={t('confirmBooking')}
            loading={booking.isPending}
            disabled={!valid}
            onPress={() => booking.mutate()}
            icon={{ ios: 'arrow.right', android: 'arrow_forward' }}
            style={styles.submit}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InlineError({ title, retryLabel, onRetry }: { title: string; retryLabel: string; onRetry: () => void }) {
  const { theme } = useApp();
  return (
    <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.errorState, { borderColor: theme.danger, backgroundColor: theme.dangerSoft, opacity: pressed ? 0.76 : 1 }]}>
      <View style={styles.errorCopy}><VizitIcon ios="exclamationmark.circle.fill" android="error" color={theme.danger} size={19} /><Text style={[styles.errorTitle, { color: theme.danger }]}>{title}</Text></View>
      <Text style={[styles.retryText, { color: theme.danger }]}>{retryLabel}</Text>
    </Pressable>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  const { theme } = useApp();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={[styles.stepCircle, { backgroundColor: theme.accentSoft }]}><Text style={[styles.stepNumber, { color: theme.accentText }]}>{step}</Text></View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ChoiceSection({ step, title, loading, error, retry, retryLabel, empty, children }: { step: string; title: string; loading: boolean; error?: boolean; retry: () => void; retryLabel: string; empty?: string; children: React.ReactNode }) {
  const { theme, t } = useApp();
  return (
    <Section step={step} title={title}>
      {loading ? <ActivityIndicator color={theme.accent} /> : error ? <InlineError title={t('loadError')} retryLabel={retryLabel} onRetry={retry} /> : empty ? <Text style={[styles.emptyText, { color: theme.muted }]}>{empty}</Text> : children}
    </Section>
  );
}

function Choice({ selected, label, detail, onPress, compact, icon, recommended = false }: { selected: boolean; label: string; detail?: string; onPress: () => void; compact?: boolean; icon?: 'person.fill' | 'person.2.fill'; recommended?: boolean }) {
  const { theme } = useApp();
  const accent = recommended ? theme.success : theme.accent;
  const selectedBackground = recommended ? theme.successSoft : theme.accentSoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, compact && styles.compact, { backgroundColor: selected || recommended ? selectedBackground : theme.surfaceRaised, borderColor: selected || recommended ? accent : theme.border, opacity: pressed ? 0.76 : 1 }]}
    >
      {icon ? <View style={[styles.choiceIcon, { backgroundColor: selected ? theme.surfaceRaised : theme.accentSubtle }]}><VizitIcon ios={icon} android={icon === 'person.fill' ? 'person' : 'group'} color={selected ? theme.accentText : theme.faint} size={20} /></View> : null}
      <View style={compact ? styles.compactText : styles.choiceText}>
        <Text numberOfLines={compact ? 1 : 2} style={[styles.choiceTitle, { color: recommended ? theme.success : theme.text }]}>{label}</Text>
        {detail ? <Text numberOfLines={1} style={[styles.choiceDetail, { color: theme.muted }]}>{detail}</Text> : null}
      </View>
      {selected && !compact ? <VizitIcon ios="checkmark.circle.fill" android="check_circle" color={theme.accentText} size={22} /> : null}
    </Pressable>
  );
}

function DateChoice({ value, selected, locale, onPress }: { value: string; selected: boolean; locale: string; onPress: () => void }) {
  const { theme } = useApp();
  const date = new Date(`${value}T12:00:00`);
  const day = new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.dateChoice, { backgroundColor: selected ? theme.primary : theme.surfaceRaised, borderColor: selected ? theme.primary : theme.border, opacity: pressed ? 0.76 : 1 }]}
    >
      <Text style={[styles.weekday, { color: selected ? theme.onPrimary : theme.muted }]}>{weekday}</Text>
      <Text style={[styles.day, { color: selected ? theme.onPrimary : theme.text }]}>{day}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ui.screenGutter, gap: 12 },
  headerCenter: { alignItems: 'center' },
  headerSpacer: { width: ui.touchTarget, height: ui.touchTarget },
  headerTitle: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  stepLabel: { ...ui.type.caption, marginTop: 1 },
  progressTrack: { height: 3 },
  progressValue: { height: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  content: { padding: ui.screenGutter, paddingBottom: 48 },
  locationBlock: { marginBottom: 24, gap: 9 },
  locationTitle: ui.type.cardTitle,
  locationChip: { minHeight: 42, borderWidth: 1, borderRadius: ui.radius.small, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  locationChipText: ui.type.caption,
  horizontal: { gap: 8, paddingRight: ui.screenGutter },
  section: { marginBottom: 30, gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  stepCircle: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  sectionTitle: ui.type.sectionTitle,
  choice: { minHeight: 66, padding: 12, borderRadius: ui.radius.medium, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  compact: { minWidth: 104, minHeight: 54, justifyContent: 'center', flexGrow: 1, flexBasis: '30%', paddingHorizontal: 9 },
  choiceIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, minWidth: 0 },
  compactText: { alignItems: 'center', minWidth: 0 },
  choiceTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  choiceDetail: { ...ui.type.caption, marginTop: 3 },
  dateChoice: { width: 60, height: 70, borderRadius: ui.radius.medium, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 10, lineHeight: 14, fontWeight: '700', textTransform: 'uppercase' },
  day: { fontSize: 20, lineHeight: 24, fontWeight: '800', marginTop: 3 },
  timeTitle: { ...ui.type.cardTitle, marginTop: 12 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formCard: { padding: 14, gap: 13 },
  submit: { marginTop: -5 },
  emptyText: ui.type.body,
  errorState: { minHeight: 58, borderWidth: 1, borderRadius: ui.radius.medium, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  errorCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  errorTitle: { ...ui.type.caption, flex: 1 },
  retryText: { ...ui.type.caption, fontWeight: '800' },
});
