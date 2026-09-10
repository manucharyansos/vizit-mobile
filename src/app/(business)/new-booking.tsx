import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { availabilityApi, AvailabilitySlot } from '@/services/api/availability';
import { businessApi, BusinessLocation, CalendarBooking } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { formatApiTime, localDateKey } from '@/services/date-time';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: {
    title: 'Նոր ամրագրում', location: 'Ընտրեք մասնաճյուղը', service: 'Ընտրեք ծառայությունը', staff: 'Ընտրեք աշխատակցին', client: 'Ընտրեք հաճախորդին կամ լրացրեք նոր տվյալներ', newClient: 'Նոր հաճախորդ', name: 'Հաճախորդի անուն', phone: 'Հեռախոս', email: 'Էլ․ փոստ (ոչ պարտադիր)', date: 'Ընտրեք ամսաթիվը', time: 'Ժամերը', chooseFirst: 'Նախ ընտրեք ծառայությունն ու աշխատակցին', noSlots: 'Այս օրվա համար ազատ ժամեր չկան', notes: 'Նշումներ', save: 'Ստեղծել և հաստատել', required: 'Լրացրեք պարտադիր դաշտերը', success: 'Ամրագրումը ստեղծված է', loadError: 'Չհաջողվեց բեռնել ամրագրման տվյալները', slotsError: 'Չհաջողվեց բեռնել ժամերը', retry: 'Կրկին փորձել', available: 'Ազատ', occupied: 'Զբաղված', recommended: 'Առաջարկվող', occupiedTitle: 'Զբաղված ժամ', customer: 'Հաճախորդ', status: 'Կարգավիճակ', close: 'Փակել' },
  ru: {
    title: 'Новая запись', location: 'Выберите филиал', service: 'Выберите услугу', staff: 'Выберите сотрудника', client: 'Выберите клиента или заполните данные нового', newClient: 'Новый клиент', name: 'Имя клиента', phone: 'Телефон', email: 'Email (необязательно)', date: 'Выберите дату', time: 'Время', chooseFirst: 'Сначала выберите услугу и сотрудника', noSlots: 'На этот день свободного времени нет', notes: 'Заметки', save: 'Создать и подтвердить', required: 'Заполните обязательные поля', success: 'Запись создана', loadError: 'Не удалось загрузить данные для записи', slotsError: 'Не удалось загрузить время', retry: 'Повторить', available: 'Свободно', occupied: 'Занято', recommended: 'Рекомендуем', occupiedTitle: 'Занятое время', customer: 'Клиент', status: 'Статус', close: 'Закрыть' },
  en: {
    title: 'New booking', location: 'Choose a location', service: 'Choose a service', staff: 'Choose a team member', client: 'Choose an existing client or enter a new one', newClient: 'New client', name: 'Client name', phone: 'Phone', email: 'Email (optional)', date: 'Choose a date', time: 'Times', chooseFirst: 'Choose a service and team member first', noSlots: 'No available times on this date', notes: 'Notes', save: 'Create and confirm', required: 'Complete the required fields', success: 'Booking created', loadError: 'Could not load booking data', slotsError: 'Could not load times', retry: 'Try again', available: 'Free', occupied: 'Busy', recommended: 'Recommended', occupiedTitle: 'Occupied time', customer: 'Client', status: 'Status', close: 'Close' },
};

const terminalStatuses = new Set(['cancelled', 'done', 'no_show']);
const minutes = (time: string) => {
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};
const bookingStaffId = (booking: CalendarBooking) => booking.staff?.id ?? Number((booking as unknown as { staff_id?: number }).staff_id ?? 0);

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
  const [selectedStart, setSelectedStart] = useState<string>();

  const settings = useQuery({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const services = useQuery({ queryKey: ['business-services'], queryFn: businessApi.services, retry: false, refetchOnMount: 'always' });
  const staff = useQuery({ queryKey: ['business-staff'], queryFn: businessApi.staff, retry: false, refetchOnMount: 'always' });
  const clients = useQuery({ queryKey: ['business-clients'], queryFn: businessApi.clients, retry: false, refetchOnMount: 'always' });

  const locations = useMemo(() => (settings.data?.locations ?? []).filter((location: BusinessLocation) => location.is_active), [settings.data?.locations]);
  const effectiveLocationId = locationId ?? (locations.length === 1 ? locations[0]?.id : undefined);
  const visibleServices = useMemo(() => (services.data ?? []).filter((item) => item.is_active && (!effectiveLocationId || item.location_id == null || item.location_id === effectiveLocationId)), [effectiveLocationId, services.data]);
  const visibleStaff = useMemo(() => (staff.data ?? []).filter((item) => item.is_active && item.is_bookable !== false && (!effectiveLocationId || item.location_id == null || item.location_id === effectiveLocationId)), [effectiveLocationId, staff.data]);

  useEffect(() => {
    if (serviceId && !visibleServices.some((item) => item.id === serviceId)) {
      setServiceId(undefined);
      setSelectedStart(undefined);
    }
    if (staffId && !visibleStaff.some((item) => item.id === staffId)) {
      setStaffId(undefined);
      setSelectedStart(undefined);
    }
  }, [serviceId, staffId, visibleServices, visibleStaff]);

  const slots = useQuery({
    queryKey: ['business-availability', form.date, serviceId, staffId, effectiveLocationId],
    queryFn: () => availabilityApi.slots({ date: form.date, service_id: serviceId!, staff_id: staffId!, location_id: effectiveLocationId }),
    enabled: Boolean(serviceId && staffId),
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    staleTime: 0,
  });
  const dayBookings = useQuery({
    queryKey: ['calendar', form.date],
    queryFn: () => businessApi.calendar(form.date, form.date),
    enabled: Boolean(staffId),
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const busyBookings = useMemo(() => (dayBookings.data ?? []).filter((booking) => bookingStaffId(booking) === staffId && !terminalStatuses.has(booking.status)), [dayBookings.data, staffId]);

  const schedule = useMemo<ScheduleItem[]>(() => {
    const busyRanges = busyBookings.map((booking) => ({
      booking,
      start: minutes(formatApiTime(booking.starts_at, locale)),
      end: minutes(formatApiTime(booking.ends_at, locale)),
    }));
    const free = (slots.data ?? []).filter((slot) => {
      const start = minutes(formatApiTime(slot.starts_at, locale));
      const end = minutes(formatApiTime(slot.ends_at, locale));
      return !busyRanges.some((busy) => busy.start < end && busy.end > start);
    }).map((slot): ScheduleItem => ({ type: 'free', key: `free-${slot.staff_id}-${slot.starts_at}`, start: minutes(formatApiTime(slot.starts_at, locale)), slot }));
    const busy = busyRanges.map(({ booking, start }): ScheduleItem => ({ type: 'busy', key: `busy-${booking.id}`, start, booking }));
    return [...free, ...busy].sort((a, b) => a.start - b.start || (a.type === 'busy' ? -1 : 1));
  }, [busyBookings, locale, slots.data]);

  useEffect(() => {
    if (selectedStart && schedule.length && !schedule.some((item) => item.type === 'free' && item.slot.starts_at === selectedStart)) setSelectedStart(undefined);
  }, [selectedStart, schedule]);

  const valid = Boolean(serviceId && staffId && selectedStart && (locations.length <= 1 || effectiveLocationId) && form.name.trim().length > 1 && form.phone.trim().length > 3);
  const anyLoadError = settings.isError || services.isError || staff.isError || clients.isError;
  const firstLoadError = settings.error ?? services.error ?? staff.error ?? clients.error;

  const create = useMutation({
    mutationFn: () => businessApi.createBooking({
      service_id: serviceId!, staff_id: staffId!, location_id: effectiveLocationId,
      starts_at: selectedStart!.replace('T', ' ').slice(0, 16),
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
      setSelectedStart(undefined);
      await Promise.all([slots.refetch(), dayBookings.refetch()]);
      Alert.alert(c.required, apiErrorMessage(error));
    },
  });

  const retryAll = () => void Promise.all([settings.refetch(), services.refetch(), staff.refetch(), clients.refetch()]);
  const selectLocation = (id: number) => { setLocationId(id); setServiceId(undefined); setStaffId(undefined); setSelectedStart(undefined); };
  const selectDate = (date: string) => { setForm((current) => ({ ...current, date })); setSelectedStart(undefined); };
  const selectClient = (item: { id: number; name: string; phone?: string; email?: string }) => {
    setClientId(item.id);
    setForm((current) => ({ ...current, name: item.name ?? '', phone: item.phone ?? '', email: item.email ?? '' }));
  };
  const newClient = () => { setClientId(undefined); setForm((current) => ({ ...current, name: '', phone: '', email: '' })); };
  const showBusy = (booking: CalendarBooking) => {
    const name = booking.client_name ?? booking.customer_name ?? booking.client?.name ?? '—';
    const phone = booking.client_phone ?? booking.client?.phone ?? '';
    const service = booking.service?.name ?? '—';
    const employee = booking.staff?.name ?? '—';
    const range = `${formatApiTime(booking.starts_at, locale)}–${formatApiTime(booking.ends_at, locale)}`;
    Alert.alert(c.occupiedTitle, `${range}\n${c.customer}: ${name}${phone ? ` · ${phone}` : ''}\n${service} · ${employee}\n${c.status}: ${booking.status}${booking.notes ? `\n${booking.notes}` : ''}`, [{ text: c.close }]);
  };

  const input = (key: 'name' | 'phone' | 'email' | 'notes', placeholder: string, keyboardType?: 'default' | 'phone-pad' | 'email-address') => (
    <TextInput value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={theme.muted} keyboardType={keyboardType} autoCapitalize={key === 'email' ? 'none' : undefined} multiline={key === 'notes'} style={[styles.input, key === 'notes' && styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised }]} />
  );

  const timesLoading = slots.isLoading || dayBookings.isLoading;
  const timesError = slots.isError || dayBookings.isError;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={() => safeBack('/(business)/today')} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="arrow_back" color={theme.text} size={21} /></Pressable><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text></View>

    {settings.isLoading || services.isLoading || staff.isLoading || clients.isLoading ? <ActivityIndicator color={theme.plum} /> : null}
    {anyLoadError ? <View style={[styles.error, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.loadError}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{apiErrorMessage(firstLoadError)}</Text><Pressable onPress={retryAll}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.retry}</Text></Pressable></View> : null}

    {locations.length > 1 ? <><Text style={[styles.label, { color: theme.text }]}>{c.location}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{locations.map((location) => <Choice key={location.id} selected={effectiveLocationId === location.id} title={location.name || location.address || `#${location.id}`} onPress={() => selectLocation(location.id)} />)}</ScrollView></> : null}

    <Text style={[styles.label, { color: theme.text }]}>{c.service}</Text><View style={styles.chips}>{visibleServices.map((item) => <Choice key={item.id} selected={serviceId === item.id} title={item.name} onPress={() => { setServiceId(item.id); if (!locationId && item.location_id) setLocationId(item.location_id); setSelectedStart(undefined); }} />)}</View>

    <Text style={[styles.label, { color: theme.text }]}>{c.staff}</Text><View style={styles.chips}>{visibleStaff.map((item) => <Choice key={item.id} selected={staffId === item.id} title={item.name} onPress={() => { setStaffId(item.id); if (!locationId && item.location_id) setLocationId(item.location_id); setSelectedStart(undefined); }} />)}</View>

    <Text style={[styles.label, { color: theme.text }]}>{c.client}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}><Choice selected={clientId == null} title={c.newClient} onPress={newClient} />{clients.data?.slice(0, 30).map((item) => <Pressable key={item.id} onPress={() => selectClient(item)} style={[styles.clientChip, { borderColor: clientId === item.id ? theme.plum : theme.border, backgroundColor: clientId === item.id ? theme.plumSoft : theme.surfaceRaised }]}><View style={[styles.clientAvatar, { backgroundColor: theme.plum }]}><Text style={styles.clientInitial}>{item.name.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '800', maxWidth: 110 }}>{item.name}</Text></Pressable>)}</ScrollView>

    {input('name', c.name)}{input('phone', c.phone, 'phone-pad')}{input('email', c.email, 'email-address')}
    <Text style={[styles.label, { color: theme.text }]}>{c.date}</Text><CalendarDatePicker value={form.date} onChange={selectDate} />
    <View style={styles.timeHeader}><Text style={[styles.label, { color: theme.text }]}>{c.time}</Text><View style={styles.legend}><View style={[styles.dot, { backgroundColor: theme.success }]} /><Text style={{ color: theme.muted, fontSize: 11 }}>{c.available}</Text><View style={[styles.dot, { backgroundColor: theme.danger }]} /><Text style={{ color: theme.muted, fontSize: 11 }}>{c.occupied}</Text></View></View>
    {!serviceId || !staffId ? <Text style={{ color: theme.muted }}>{c.chooseFirst}</Text> : timesLoading ? <ActivityIndicator color={theme.plum} /> : timesError ? <View style={[styles.error, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.slotsError}</Text><Pressable onPress={() => void Promise.all([slots.refetch(), dayBookings.refetch()])}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.retry}</Text></Pressable></View> : schedule.length ? <View style={styles.slotGrid}>{schedule.map((item) => item.type === 'free' ? <FreeSlot key={item.key} slot={item.slot} selected={selectedStart === item.slot.starts_at} label={c.recommended} locale={locale} onPress={() => setSelectedStart(item.slot.starts_at)} /> : <BusySlot key={item.key} booking={item.booking} locale={locale} onPress={() => showBusy(item.booking)} />)}</View> : <Text style={{ color: theme.muted }}>{c.noSlots}</Text>}
    {input('notes', c.notes)}
    <Pressable disabled={!valid || create.isPending || anyLoadError} onPress={() => create.mutate()} style={[styles.primary, { backgroundColor: theme.plum, opacity: valid && !anyLoadError ? 1 : 0.4 }]}>{create.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{c.save}</Text>}</Pressable>
  </ScrollView></SafeAreaView>;
}

function Choice({ selected, title, onPress }: { selected: boolean; title: string; onPress: () => void }) {
  const { theme } = useApp();
  return <Pressable onPress={onPress} style={[styles.chip, { borderColor: selected ? theme.plum : theme.border, backgroundColor: selected ? theme.plumSoft : theme.surfaceRaised }]}><Text style={{ color: selected ? theme.plum : theme.text, fontWeight: '800' }}>{title}</Text></Pressable>;
}
function FreeSlot({ slot, selected, label, locale, onPress }: { slot: AvailabilitySlot; selected: boolean; label: string; locale: 'hy' | 'ru' | 'en'; onPress: () => void }) {
  const { theme } = useApp();
  const start = formatApiTime(slot.starts_at, locale);
  const end = formatApiTime(slot.ends_at, locale);
  const recommended = !!slot.is_recommended;
  return <Pressable onPress={onPress} style={[styles.slot, { borderColor: selected || recommended ? theme.success : theme.border, backgroundColor: selected ? theme.success : theme.successSoft }]}><Text style={{ color: selected ? '#FFF' : theme.success, fontWeight: '900', fontSize: 14 }}>{start}–{end}</Text>{recommended ? <Text numberOfLines={1} style={{ color: selected ? '#FFF' : theme.success, fontSize: 9, fontWeight: '900', marginTop: 3 }}>★ {label}</Text> : null}</Pressable>;
}
function BusySlot({ booking, locale, onPress }: { booking: CalendarBooking; locale: 'hy' | 'ru' | 'en'; onPress: () => void }) {
  const { theme } = useApp();
  return <Pressable onPress={onPress} style={[styles.slot, { borderColor: theme.danger, backgroundColor: theme.dangerSoft }]}><Text style={{ color: theme.danger, fontWeight: '900', fontSize: 14 }}>{formatApiTime(booking.starts_at, locale)}–{formatApiTime(booking.ends_at, locale)}</Text><Text numberOfLines={1} style={{ color: theme.danger, fontSize: 9, fontWeight: '800', marginTop: 3 }}>{booking.client_name ?? booking.customer_name ?? booking.client?.name ?? '—'}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingBottom: 44, gap: 12 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, back: { width: 43, height: 43, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 25, fontWeight: '900', flex: 1 }, label: { fontSize: 15, fontWeight: '900', marginTop: 5 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, horizontal: { gap: 8, paddingVertical: 2 }, chip: { minHeight: 43, justifyContent: 'center', borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 }, timeHeader: { gap: 8 }, legend: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 }, slotGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slot: { width: '31%', flexGrow: 1, minWidth: 98, minHeight: 58, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 8 }, clientChip: { minHeight: 48, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }, clientAvatar: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, clientInitial: { color: '#FFF', fontWeight: '900' }, input: { minHeight: 52, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 }, notes: { minHeight: 82, paddingTop: 13, textAlignVertical: 'top' }, primary: { height: 55, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 5 }, primaryText: { color: '#FFF', fontWeight: '900' }, error: { borderWidth: 1, borderRadius: 9, padding: 13, gap: 8 },
});