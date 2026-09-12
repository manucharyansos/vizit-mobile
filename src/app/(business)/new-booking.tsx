import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { availabilityApi, AvailabilitySlot } from '@/services/api/availability';
import { businessApi, BusinessLocation, CalendarBooking } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { formatApiTime, localDateKey } from '@/services/date-time';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: {
    title: 'Նոր ամրագրում', location: 'Ընտրեք մասնաճյուղը', service: 'Ընտրեք ծառայությունը', staff: 'Աշխատողի գրաֆիկ', allStaff: 'Բոլոր աշխատողները', client: 'Ընտրեք հաճախորդին կամ լրացրեք նոր տվյալներ', newClient: 'Նոր հաճախորդ', name: 'Հաճախորդի անուն', phone: 'Հեռախոս', email: 'Էլ․ փոստ (ոչ պարտադիր)', date: 'Ընտրեք ամսաթիվը', time: 'Ժամերը', chooseFirst: 'Նախ ընտրեք ծառայությունը', noSlots: 'Այս օրվա համար ազատ ժամեր չկան', notes: 'Նշումներ', save: 'Ստեղծել և հաստատել', required: 'Լրացրեք պարտադիր դաշտերը', success: 'Ամրագրումը ստեղծված է', loadError: 'Չհաջողվեց բեռնել ամրագրման տվյալները', slotsError: 'Չհաջողվեց բեռնել ժամերը', retry: 'Կրկին փորձել', available: 'Ազատ', occupied: 'Զբաղված', recommended: 'Առաջարկվող', occupiedTitle: 'Զբաղված ժամ', customer: 'Հաճախորդ', status: 'Կարգավիճակ', close: 'Փակել' },
  ru: {
    title: 'Новая запись', location: 'Выберите филиал', service: 'Выберите услугу', staff: 'График сотрудника', allStaff: 'Все сотрудники', client: 'Выберите клиента или заполните данные нового', newClient: 'Новый клиент', name: 'Имя клиента', phone: 'Телефон', email: 'Email (необязательно)', date: 'Выберите дату', time: 'Время', chooseFirst: 'Сначала выберите услугу', noSlots: 'На этот день свободного времени нет', notes: 'Заметки', save: 'Создать и подтвердить', required: 'Заполните обязательные поля', success: 'Запись создана', loadError: 'Не удалось загрузить данные для записи', slotsError: 'Не удалось загрузить время', retry: 'Повторить', available: 'Свободно', occupied: 'Занято', recommended: 'Рекомендуем', occupiedTitle: 'Занятое время', customer: 'Клиент', status: 'Статус', close: 'Закрыть' },
  en: {
    title: 'New booking', location: 'Choose a location', service: 'Choose a service', staff: 'Team schedule', allStaff: 'All team members', client: 'Choose an existing client or enter a new one', newClient: 'New client', name: 'Client name', phone: 'Phone', email: 'Email (optional)', date: 'Choose a date', time: 'Times', chooseFirst: 'Choose a service first', noSlots: 'No available times on this date', notes: 'Notes', save: 'Create and confirm', required: 'Complete the required fields', success: 'Booking created', loadError: 'Could not load booking data', slotsError: 'Could not load times', retry: 'Try again', available: 'Free', occupied: 'Busy', recommended: 'Recommended', occupiedTitle: 'Occupied time', customer: 'Client', status: 'Status', close: 'Close' },
};

const terminalStatuses = new Set(['cancelled', 'done', 'no_show']);
const minutes = (time: string) => {
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};
const bookingStaffId = (booking: CalendarBooking) => booking.staff?.id ?? Number((booking as unknown as { staff_id?: number }).staff_id ?? 0);
const slotKey = (slot: AvailabilitySlot) => `${slot.staff_id}|${slot.starts_at}`;

type ScheduleItem =
  | { type: 'free'; key: string; start: number; slot: AvailabilitySlot }
  | { type: 'busy'; key: string; start: number; booking: CalendarBooking };

export default function NewBooking() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: localDateKey(), notes: '' });
  const [locationId, setLocationId] = useState<number>();
  const [serviceId, setServiceId] = useState<number>();
  const [staffId, setStaffId] = useState<number>();
  const [clientId, setClientId] = useState<number>();
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>();

  const settings = useQuery({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const services = useQuery({ queryKey: ['business-services'], queryFn: businessApi.services, retry: false, refetchOnMount: 'always' });
  const staff = useQuery({ queryKey: ['business-staff'], queryFn: businessApi.staff, retry: false, refetchOnMount: 'always' });
  const clients = useQuery({ queryKey: ['business-clients'], queryFn: businessApi.clients, retry: false, refetchOnMount: 'always' });

  const locations = useMemo(() => (settings.data?.locations ?? []).filter((location: BusinessLocation) => location.is_active), [settings.data?.locations]);
  const effectiveLocationId = locationId ?? (locations.length === 1 ? locations[0]?.id : undefined);
  const visibleServices = useMemo(() => (services.data ?? []).filter((item) => item.is_active && (!effectiveLocationId || item.location_id == null || item.location_id === effectiveLocationId)), [effectiveLocationId, services.data]);
  const visibleStaff = useMemo(() => (staff.data ?? []).filter((item) => item.is_active && item.is_bookable !== false && (!effectiveLocationId || item.location_id == null || item.location_id === effectiveLocationId)), [effectiveLocationId, staff.data]);
  const effectiveServiceId = serviceId && visibleServices.some((item) => item.id === serviceId) ? serviceId : undefined;
  const effectiveStaffId = staffId && visibleStaff.some((item) => item.id === staffId) ? staffId : undefined;
  const showingAllStaff = !effectiveStaffId;

  const selectedStaffSlots = useQuery({
    queryKey: ['business-availability', form.date, effectiveServiceId, effectiveStaffId, effectiveLocationId],
    queryFn: () => availabilityApi.slots({ date: form.date, service_id: effectiveServiceId!, staff_id: effectiveStaffId!, location_id: effectiveLocationId }),
    enabled: Boolean(effectiveServiceId && effectiveStaffId),
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    staleTime: 0,
  });
  const allStaffSlotQueries = useQueries({
    queries: visibleStaff.map((member) => ({
      queryKey: ['business-availability', form.date, effectiveServiceId, member.id, effectiveLocationId],
      queryFn: () => availabilityApi.slots({ date: form.date, service_id: effectiveServiceId!, staff_id: member.id, location_id: effectiveLocationId }),
      enabled: Boolean(effectiveServiceId && showingAllStaff),
      retry: false,
      refetchOnMount: 'always' as const,
      refetchInterval: 10_000,
      staleTime: 0,
    })),
  });
  const slotData = effectiveStaffId
    ? selectedStaffSlots.data ?? []
    : allStaffSlotQueries.flatMap((query) => query.data ?? []);

  const dayBookings = useQuery({
    queryKey: ['calendar', form.date],
    queryFn: () => businessApi.calendar(form.date, form.date),
    enabled: Boolean(effectiveServiceId),
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const busyBookings = useMemo(() => (dayBookings.data ?? []).filter((booking) => !terminalStatuses.has(booking.status) && (!effectiveStaffId || bookingStaffId(booking) === effectiveStaffId)), [dayBookings.data, effectiveStaffId]);
  const busyRanges = busyBookings.map((booking) => ({
    booking,
    staffId: bookingStaffId(booking),
    start: minutes(formatApiTime(booking.starts_at, locale)),
    end: minutes(formatApiTime(booking.ends_at, locale)),
  }));
  const freeItems: ScheduleItem[] = slotData
    .filter((slot) => {
      const start = minutes(formatApiTime(slot.starts_at, locale));
      const end = minutes(formatApiTime(slot.ends_at, locale));
      return !busyRanges.some((busy) => busy.staffId === slot.staff_id && busy.start < end && busy.end > start);
    })
    .map((slot) => ({ type: 'free', key: `free-${slotKey(slot)}`, start: minutes(formatApiTime(slot.starts_at, locale)), slot }));
  const busyItems: ScheduleItem[] = busyRanges.map(({ booking, start }) => ({ type: 'busy', key: `busy-${booking.id}`, start, booking }));
  const schedule = [...freeItems, ...busyItems].sort((a, b) => a.start - b.start || (a.type === 'busy' ? -1 : 1));

  const selectedFreeItem = selectedSlotKey ? schedule.find((item): item is Extract<ScheduleItem, { type: 'free' }> => item.type === 'free' && slotKey(item.slot) === selectedSlotKey) : undefined;
  const effectiveSelectedStart = selectedFreeItem?.slot.starts_at;
  const selectedBookingStaffId = selectedFreeItem?.slot.staff_id ?? effectiveStaffId;
  const valid = Boolean(effectiveServiceId && selectedBookingStaffId && effectiveSelectedStart && (locations.length <= 1 || effectiveLocationId) && form.name.trim().length > 1 && form.phone.trim().length > 3);
  const anyLoadError = settings.isError || services.isError || staff.isError || clients.isError;
  const firstLoadError = settings.error ?? services.error ?? staff.error ?? clients.error;

  const refetchSlots = async () => {
    if (effectiveStaffId) {
      await selectedStaffSlots.refetch();
      return;
    }
    await Promise.all(allStaffSlotQueries.map((query) => query.refetch()));
  };

  const create = useMutation({
    mutationFn: () => businessApi.createBooking({
      service_id: effectiveServiceId!, staff_id: selectedBookingStaffId!, location_id: effectiveLocationId,
      starts_at: effectiveSelectedStart!.replace('T', ' ').slice(0, 16),
      client_name: form.name.trim(), client_phone: form.phone.trim(), client_email: form.email.trim() || undefined,
      client_id: clientId, notes: form.notes.trim() || undefined,
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['calendar'] }),
        qc.invalidateQueries({ queryKey: ['business-clients'] }),
        qc.invalidateQueries({ queryKey: ['business-client'] }),
        qc.invalidateQueries({ queryKey: ['business-dashboard'] }),
        qc.invalidateQueries({ queryKey: ['business-availability'] }),
      ]);
      Alert.alert(c.success, '', [{ text: 'OK', onPress: () => safeBack('/(business)/today') }]);
    },
    onError: async (error) => {
      setSelectedSlotKey(undefined);
      await Promise.all([refetchSlots(), dayBookings.refetch()]);
      Alert.alert(c.required, apiErrorMessage(error));
    },
  });

  const retryAll = () => void Promise.all([settings.refetch(), services.refetch(), staff.refetch(), clients.refetch()]);
  const selectLocation = (id: number) => { setLocationId(id); setServiceId(undefined); setStaffId(undefined); setSelectedSlotKey(undefined); };
  const selectDate = (date: string) => { setForm((current) => ({ ...current, date })); setSelectedSlotKey(undefined); };
  const selectClient = (item: { id: number; name: string; phone?: string; email?: string }) => {
    setClientId(item.id);
    setForm((current) => ({ ...current, name: item.name ?? '', phone: item.phone ?? '', email: item.email ?? '' }));
  };
  const newClient = () => { setClientId(undefined); setForm((current) => ({ ...current, name: '', phone: '', email: '' })); };
  const showBusy = (booking: CalendarBooking) => {
    const name = booking.client_name ?? booking.customer_name ?? booking.client?.name ?? '—';
    const phone = booking.client_phone ?? booking.client?.phone ?? '';
    const serviceName = booking.service?.name ?? '—';
    const employee = booking.staff?.name ?? '—';
    const range = `${formatApiTime(booking.starts_at, locale)}–${formatApiTime(booking.ends_at, locale)}`;
    Alert.alert(c.occupiedTitle, `${range}\n${c.customer}: ${name}${phone ? ` · ${phone}` : ''}\n${serviceName} · ${employee}\n${c.status}: ${booking.status}${booking.notes ? `\n${booking.notes}` : ''}`, [{ text: c.close }]);
  };

  const input = (key: 'name' | 'phone' | 'email' | 'notes', label: string, keyboardType?: 'default' | 'phone-pad' | 'email-address') => (
    <PremiumInput
      label={label}
      value={form[key]}
      onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
      placeholder={label}
      keyboardType={keyboardType}
      autoCapitalize={key === 'email' ? 'none' : undefined}
      multiline={key === 'notes'}
      icon={key === 'name' ? { ios: 'person', android: 'person_outline' } : key === 'phone' ? { ios: 'phone', android: 'phone' } : key === 'email' ? { ios: 'envelope', android: 'mail_outline' } : { ios: 'note.text', android: 'notes' }}
    />
  );

  const slotQueriesLoading = effectiveStaffId ? selectedStaffSlots.isLoading : allStaffSlotQueries.some((query) => query.isLoading);
  const slotQueriesError = effectiveStaffId ? selectedStaffSlots.isError : allStaffSlotQueries.some((query) => query.isError);
  const timesLoading = slotQueriesLoading || dayBookings.isLoading;
  const timesError = slotQueriesError || dayBookings.isError;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <PageHeader title={c.title} eyebrow="Vizit Pro" onBack={() => safeBack('/(business)/today')} backLabel={c.close} />

    {settings.isLoading || services.isLoading || staff.isLoading || clients.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}
    {anyLoadError ? <StateCard title={c.loadError} message={apiErrorMessage(firstLoadError)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={retryAll} />} /> : null}

    {!anyLoadError ? <Surface style={styles.section}>
      {locations.length > 1 ? <><SectionHeader title={c.location} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{locations.map((location) => <Choice key={location.id} selected={effectiveLocationId === location.id} title={location.name || location.address || c.location} onPress={() => selectLocation(location.id)} />)}</ScrollView></> : null}
      <SectionHeader title={c.service} /><View style={styles.chips}>{visibleServices.map((item) => <Choice key={item.id} selected={effectiveServiceId === item.id} title={item.name} onPress={() => { setServiceId(item.id); if (!locationId && item.location_id) setLocationId(item.location_id); setSelectedSlotKey(undefined); }} />)}</View>
      <SectionHeader title={c.staff} /><View style={styles.chips}><Choice selected={showingAllStaff} title={c.allStaff} onPress={() => { setStaffId(undefined); setSelectedSlotKey(undefined); }} />{visibleStaff.map((item) => <Choice key={item.id} selected={effectiveStaffId === item.id} title={item.name} onPress={() => { setStaffId(item.id); if (!locationId && item.location_id) setLocationId(item.location_id); setSelectedSlotKey(undefined); }} />)}</View>
    </Surface> : null}

    {!anyLoadError ? <Surface style={styles.section}>
      <SectionHeader title={c.client} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}><Choice selected={clientId == null} title={c.newClient} onPress={newClient} />{clients.data?.slice(0, 30).map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => selectClient(item)} style={[styles.clientChip, { borderColor: clientId === item.id ? theme.accent : theme.border, backgroundColor: clientId === item.id ? theme.accentSoft : theme.surface }]}><View style={[styles.clientAvatar, { backgroundColor: theme.primary }]}><Text style={[styles.clientInitial, { color: theme.onPrimary }]}>{item.name.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '800', maxWidth: 110 }}>{item.name}</Text></Pressable>)}</ScrollView>
      {input('name', c.name)}{input('phone', c.phone, 'phone-pad')}{input('email', c.email, 'email-address')}
    </Surface> : null}

    {!anyLoadError ? <Surface style={styles.section}>
      <SectionHeader title={c.date} /><CalendarDatePicker value={form.date} onChange={selectDate} />
      <View style={styles.timeHeader}><SectionHeader title={c.time} /><View style={styles.legend}><View style={[styles.dot, { backgroundColor: theme.success }]} /><Text style={{ color: theme.muted, fontSize: 11 }}>{c.available}</Text><View style={[styles.dot, { backgroundColor: theme.danger }]} /><Text style={{ color: theme.muted, fontSize: 11 }}>{c.occupied}</Text></View></View>
      {!effectiveServiceId ? <Text style={[styles.helper, { color: theme.muted }]}>{c.chooseFirst}</Text> : timesLoading ? <ActivityIndicator color={theme.accent} /> : timesError ? <StateCard title={c.slotsError} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" compact onPress={() => void Promise.all([refetchSlots(), dayBookings.refetch()])} />} /> : schedule.length ? <View style={styles.slotGrid}>{schedule.map((item) => item.type === 'free' ? <FreeSlot key={item.key} slot={item.slot} selected={selectedSlotKey === slotKey(item.slot)} label={c.recommended} locale={locale} showStaff={showingAllStaff} onPress={() => setSelectedSlotKey(slotKey(item.slot))} /> : <BusySlot key={item.key} booking={item.booking} locale={locale} showStaff={showingAllStaff} onPress={() => showBusy(item.booking)} />)}</View> : <Text style={[styles.helper, { color: theme.muted }]}>{c.noSlots}</Text>}
    </Surface> : null}
    {!anyLoadError ? <Surface style={styles.section}>{input('notes', c.notes)}<PremiumButton title={c.save} loading={create.isPending} disabled={!valid || anyLoadError} onPress={() => create.mutate()} icon={{ ios: 'checkmark', android: 'check' }} /></Surface> : null}
  </ScrollView></SafeAreaView>;
}

function Choice({ selected, title, onPress }: { selected: boolean; title: string; onPress: () => void }) {
  const { theme } = useApp();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.chip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surface, opacity: pressed ? 0.76 : 1 }]}><Text style={{ color: selected ? theme.onPrimary : theme.text, fontWeight: '800' }}>{title}</Text></Pressable>;
}
function FreeSlot({ slot, selected, label, locale, showStaff, onPress }: { slot: AvailabilitySlot; selected: boolean; label: string; locale: 'hy' | 'ru' | 'en'; showStaff: boolean; onPress: () => void }) {
  const { theme } = useApp();
  const start = formatApiTime(slot.starts_at, locale);
  const end = formatApiTime(slot.ends_at, locale);
  const recommended = !!slot.is_recommended;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.slot, { borderColor: selected ? theme.primary : recommended ? theme.success : theme.border, backgroundColor: selected ? theme.primary : recommended ? theme.successSoft : theme.surface, opacity: pressed ? 0.78 : 1 }]}><Text style={{ color: selected ? theme.onPrimary : recommended ? theme.success : theme.text, fontWeight: '900', fontSize: 14 }}>{start}–{end}</Text>{showStaff && slot.staff_name ? <Text numberOfLines={1} style={{ color: selected ? theme.onPrimary : theme.muted, fontSize: 10, fontWeight: '700', marginTop: 3 }}>{slot.staff_name}</Text> : recommended ? <Text numberOfLines={1} style={{ color: selected ? theme.onPrimary : theme.success, fontSize: 9, fontWeight: '900', marginTop: 3 }}>★ {label}</Text> : null}</Pressable>;
}
function BusySlot({ booking, locale, showStaff, onPress }: { booking: CalendarBooking; locale: 'hy' | 'ru' | 'en'; showStaff: boolean; onPress: () => void }) {
  const { theme } = useApp();
  const subtitle = showStaff ? booking.staff?.name ?? booking.client_name ?? booking.customer_name ?? booking.client?.name ?? '—' : booking.client_name ?? booking.customer_name ?? booking.client?.name ?? '—';
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.slot, { borderColor: theme.danger, backgroundColor: theme.dangerSoft, opacity: pressed ? 0.78 : 1 }]}><Text style={{ color: theme.danger, fontWeight: '900', fontSize: 14 }}>{formatApiTime(booking.starts_at, locale)}–{formatApiTime(booking.ends_at, locale)}</Text><Text numberOfLines={1} style={{ color: theme.danger, fontSize: 10, fontWeight: '700', marginTop: 3 }}>{subtitle}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  section: { gap: ui.spacing.sm },
  loader: { marginVertical: ui.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.xs },
  horizontal: { gap: ui.spacing.xs, paddingVertical: 2 },
  chip: { minHeight: ui.touchTarget, justifyContent: 'center', borderWidth: 1, borderRadius: ui.radius.pill, paddingHorizontal: 14 },
  timeHeader: { gap: ui.spacing.xs },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 4 },
  helper: { ...ui.type.body },
  slotGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.xs },
  slot: { width: '31%', flexGrow: 1, minWidth: 98, minHeight: 62, borderWidth: 1, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 8 },
  clientChip: { minHeight: 50, borderWidth: 1, borderRadius: ui.radius.small, paddingHorizontal: 9, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  clientAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clientInitial: { fontWeight: '900' },
});
