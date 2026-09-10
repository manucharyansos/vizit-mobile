import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { formatApiDateTime } from '@/services/date-time';

const copy = {
  hy: { title: 'Հաճախորդի քարտ', contact: 'Կոնտակտներ', history: 'Այցերի պատմություն', name: 'Անուն', phone: 'Հեռախոս', email: 'Էլ․ փոստ', vip: 'VIP հաճախորդ', save: 'Պահպանել', bookings: 'Ամրագրումներ', spent: 'Ծախսել է', completed: 'Ավարտված', empty: 'Այցեր դեռ չկան', loadError: 'Չհաջողվեց բեռնել հաճախորդի տվյալները', retry: 'Կրկին փորձել' },
  ru: { title: 'Карточка клиента', contact: 'Контакты', history: 'История визитов', name: 'Имя', phone: 'Телефон', email: 'Email', vip: 'VIP-клиент', save: 'Сохранить', bookings: 'Записи', spent: 'Потрачено', completed: 'Завершено', empty: 'Визитов пока нет', loadError: 'Не удалось загрузить данные клиента', retry: 'Повторить' },
  en: { title: 'Client card', contact: 'Contacts', history: 'Visit history', name: 'Name', phone: 'Phone', email: 'Email', vip: 'VIP client', save: 'Save', bookings: 'Bookings', spent: 'Total spent', completed: 'Completed', empty: 'No visits yet', loadError: 'Could not load client details', retry: 'Try again' },
};

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);
  const { locale, theme } = useApp();
  const c = copy[locale];
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['business-client', clientId], queryFn: () => businessApi.client(clientId), enabled: Number.isInteger(clientId) && clientId > 0, retry: false, refetchOnMount: 'always' });
  const [form, setForm] = useState({ name: '', phone: '', email: '', is_vip: false });

  useEffect(() => {
    if (!query.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ name: query.data.name ?? '', phone: query.data.phone ?? '', email: query.data.email ?? '', is_vip: !!query.data.is_vip });
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => businessApi.updateClient(clientId, { ...form, email: form.email || undefined }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['business-client', clientId] }),
        qc.invalidateQueries({ queryKey: ['business-clients'] }),
        qc.invalidateQueries({ queryKey: ['business-dashboard'] }),
      ]);
      await qc.refetchQueries({ queryKey: ['business-client', clientId], type: 'active' });
      Alert.alert(c.save, '✓');
    },
    onError: (error) => Alert.alert(c.save, apiErrorMessage(error)),
  });

  if (query.isLoading) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.plum} /></SafeAreaView>;
  if (query.isError || !query.data) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><VizitIcon ios="exclamationmark.triangle.fill" android="error_outline" color={theme.danger} size={30} /><Text style={[styles.errorTitle, { color: theme.text }]}>{c.loadError}</Text><Text style={[styles.errorText, { color: theme.muted }]}>{apiErrorMessage(query.error)}</Text><Pressable onPress={() => query.refetch()} style={[styles.retry, { backgroundColor: theme.plum }]}><Text style={styles.white}>{c.retry}</Text></Pressable><Pressable onPress={() => router.back()}><Text style={{ color: theme.muted }}>{c.title}</Text></Pressable></SafeAreaView>;

  const data = query.data;
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="arrow_back" color={theme.text} size={21} /></Pressable><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{data.name ?? c.title}</Text><Text style={{ color: theme.muted }}>{c.title}</Text></View></View><View style={styles.stats}><Stat value={data.bookings_count ?? 0} label={c.bookings} /><Stat value={`${Number(data.total_spent ?? 0).toLocaleString()} ֏`} label={c.spent} /><Stat value={data.crm?.completed_count ?? 0} label={c.completed} /></View><View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.section, { color: theme.text }]}>{c.contact}</Text>{(['name', 'phone', 'email'] as const).map((key) => <TextInput key={key} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={c[key]} placeholderTextColor={theme.muted} keyboardType={key === 'phone' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'} autoCapitalize={key === 'email' ? 'none' : undefined} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />)}<View style={styles.toggle}><Text style={{ color: theme.text, fontWeight: '800' }}>{c.vip}</Text><Switch value={form.is_vip} onValueChange={(is_vip) => setForm((current) => ({ ...current, is_vip }))} trackColor={{ false: theme.border, true: theme.plum }} /></View><Pressable disabled={save.isPending || form.name.trim().length < 2} onPress={() => save.mutate()} style={[styles.primary, { backgroundColor: theme.plum, opacity: form.name.trim().length >= 2 ? 1 : 0.4 }]}>{save.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable></View><Text style={[styles.section, { color: theme.text }]}>{c.history}</Text>{data.recent_bookings?.length ? data.recent_bookings.map((booking) => <View key={booking.id} style={[styles.visit, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{booking.service?.name ?? '—'}</Text><Text style={{ color: theme.muted, marginTop: 4 }}>{formatApiDateTime(booking.starts_at, locale)} · {booking.staff?.name ?? '—'}</Text></View><Text style={{ color: theme.plum, fontWeight: '800' }}>{booking.status}</Text></View>) : <Text style={{ color: theme.muted }}>{c.empty}</Text>}</ScrollView></SafeAreaView>;
}

function Stat({ value, label }: { value: string | number; label: string }) { const { theme } = useApp(); return <View style={[styles.stat, { backgroundColor: theme.plumSoft }]}><Text style={[styles.statValue, { color: theme.plum }]}>{value}</Text><Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text></View>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, content: { padding: 18, paddingBottom: 44, gap: 13 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 43, height: 43, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 24, fontWeight: '900' }, stats: { flexDirection: 'row', gap: 7 }, stat: { flex: 1, padding: 10, minHeight: 72, justifyContent: 'center', borderRadius: 9 }, statValue: { fontWeight: '900', fontSize: 15 }, statLabel: { fontSize: 10, marginTop: 3 }, card: { padding: 14, borderWidth: 1, borderRadius: 10, gap: 9 }, section: { fontSize: 17, fontWeight: '900' }, input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }, toggle: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, primary: { height: 51, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, white: { color: '#FFF', fontWeight: '900' }, visit: { minHeight: 72, padding: 13, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 10 }, errorTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' }, errorText: { textAlign: 'center', fontSize: 12 }, retry: { minHeight: 48, paddingHorizontal: 22, borderRadius: 9, alignItems: 'center', justifyContent: 'center' } });