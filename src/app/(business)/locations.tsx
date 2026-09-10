import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationPicker } from '@/components/location-picker';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessLocation, BusinessSettings } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

type LocationForm = { name: string; address: string; city: string; phone: string; is_primary: boolean; latitude: number | null; longitude: number | null };

const copy = {
  hy: { title: 'Հասցեներ', usage: 'Օգտագործված հասցեներ', plan: 'Պլան', add: 'Ավելացնել հասցե', upgrade: 'Դիտել պլանները', name: 'Մասնաճյուղի անուն', address: 'Հասցե', city: 'Քաղաք', phone: 'Հեռախոս', primary: 'Հիմնական հասցե', save: 'Պահպանել', cancel: 'Չեղարկել', delete: 'Ջնջել', limit: 'Այս պլանի հասցեների սահմանաչափը լրացել է', confirm: 'Ջնջե՞լ այս հասցեն։', retry: 'Կրկին փորձել', loadError: 'Չհաջողվեց բեռնել հասցեները', point: 'Քարտեզի կետ' },
  ru: { title: 'Адреса', usage: 'Использовано адресов', plan: 'Тариф', add: 'Добавить адрес', upgrade: 'Посмотреть тарифы', name: 'Название филиала', address: 'Адрес', city: 'Город', phone: 'Телефон', primary: 'Основной адрес', save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить', limit: 'Лимит адресов для этого тарифа исчерпан', confirm: 'Удалить этот адрес?', retry: 'Повторить', loadError: 'Не удалось загрузить адреса', point: 'Точка на карте' },
  en: { title: 'Locations', usage: 'Locations used', plan: 'Plan', add: 'Add location', upgrade: 'View plans', name: 'Location name', address: 'Address', city: 'City', phone: 'Phone', primary: 'Primary location', save: 'Save', cancel: 'Cancel', delete: 'Delete', limit: 'This plan has reached its location limit', confirm: 'Delete this location?', retry: 'Try again', loadError: 'Could not load locations', point: 'Map point' },
};

const empty = (): LocationForm => ({ name: '', address: '', city: '', phone: '', is_primary: false, latitude: 40.1772, longitude: 44.50349 });

export default function Locations() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const qc = useQueryClient();
  const query = useQuery<BusinessSettings>({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false, refetchOnMount: 'always' });
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<LocationForm>(empty);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['business-settings'] });
    await qc.refetchQueries({ queryKey: ['business-settings'], type: 'active' });
  };
  const fail = (error: unknown) => Alert.alert(c.title, apiErrorMessage(error));
  const save = useMutation({
    mutationFn: () => editing === 'new'
      ? businessApi.createLocation({ ...form, is_active: true })
      : businessApi.updateLocation(editing!, form),
    onSuccess: async () => { setEditing(null); setForm(empty()); await refresh(); },
    onError: fail,
  });
  const remove = useMutation({ mutationFn: businessApi.deleteLocation, onSuccess: refresh, onError: fail });
  const edit = (item: BusinessLocation) => {
    setEditing(item.id);
    setForm({
      name: item.name ?? '',
      address: item.address ?? '',
      city: item.city ?? '',
      phone: item.phone ?? '',
      is_primary: item.is_primary,
      latitude: item.latitude ?? 40.1772,
      longitude: item.longitude ?? 44.50349,
    });
  };
  const locations = query.data?.locations ?? [];
  const limit = Math.max(1, query.data?.location_limit ?? 1);
  const canAdd = locations.length < limit;
  const planName = query.data?.plan?.name ?? query.data?.plan?.code ?? '—';

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => safeBack('/(business)/more')} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="arrow_back" color={theme.text} size={21} /></Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
      </View>
      {query.isLoading ? <ActivityIndicator color={theme.plum} /> : null}
      {query.isError ? <View style={[styles.error, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.loadError}</Text><Pressable onPress={() => query.refetch()}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.retry}</Text></Pressable></View> : null}
      {!query.isError && query.data ? <View style={[styles.usageCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View><Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800' }}>{c.usage}</Text><Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 3 }}>{locations.length} / {limit}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800' }}>{c.plan}</Text><Text style={{ color: theme.plum, fontSize: 14, fontWeight: '900', marginTop: 3 }}>{planName}</Text></View></View> : null}
      {!query.isError ? locations.map((item) => <View key={item.id} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}>
        <View style={[styles.pin, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="mappin.and.ellipse" android="location_on" color={theme.plum} size={22} /></View>
        <Pressable style={{ flex: 1 }} onPress={() => edit(item)}>
          <Text style={{ color: theme.text, fontWeight: '900', fontSize: 15 }}>{item.name || item.address || '—'}</Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>{item.address}{item.city ? `, ${item.city}` : ''}</Text>
          {item.latitude != null && item.longitude != null ? <Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{c.point}: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text> : null}
          {item.is_primary ? <Text style={{ color: theme.plum, fontSize: 11, fontWeight: '900', marginTop: 5 }}>{c.primary}</Text> : null}
        </Pressable>
        {locations.length > 1 ? <Pressable accessibilityRole="button" onPress={() => Alert.alert(c.delete, c.confirm, [{ text: c.cancel }, { text: c.delete, style: 'destructive', onPress: () => remove.mutate(item.id) }])}><VizitIcon ios="trash" android="delete" color={theme.danger} size={20} /></Pressable> : null}
      </View>) : null}
      {editing ? <View style={[styles.editor, { borderColor: theme.plum, backgroundColor: theme.surfaceRaised }]}>
        {(['name', 'address', 'city', 'phone'] as const).map((key) => <TextInput key={key} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={c[key]} placeholderTextColor={theme.muted} keyboardType={key === 'phone' ? 'phone-pad' : 'default'} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />)}
        <LocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(point) => setForm((current) => ({ ...current, ...point }))} />
        <View style={styles.toggle}><Text style={{ color: theme.text, fontWeight: '800' }}>{c.primary}</Text><Switch value={form.is_primary} onValueChange={(value) => setForm((current) => ({ ...current, is_primary: value }))} trackColor={{ false: theme.border, true: theme.plum }} /></View>
        <View style={styles.actions}>
          <Pressable onPress={() => setEditing(null)} style={[styles.secondary, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800' }}>{c.cancel}</Text></Pressable>
          <Pressable disabled={!form.address.trim() || save.isPending} onPress={() => save.mutate()} style={[styles.primary, { backgroundColor: theme.plum, opacity: form.address.trim() ? 1 : 0.4 }]}>{save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable>
        </View>
      </View> : null}
      {!editing && !query.isError && canAdd ? <Pressable onPress={() => { setForm(empty()); setEditing('new'); }} style={[styles.add, { borderColor: theme.plum }]}><VizitIcon ios="plus" android="add" color={theme.plum} size={20} /><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.add}</Text></Pressable> : null}
      {!editing && !query.isError && !canAdd ? <View style={[styles.limitCard, { backgroundColor: theme.plumSoft, borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800', flex: 1 }}>{c.limit}</Text><Pressable onPress={() => router.push('/(business)/billing' as never)}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.upgrade}</Text></Pressable></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingBottom: 44, gap: 10 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, back: { width: 43, height: 43, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 26, fontWeight: '900' }, usageCard: { borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, card: { borderWidth: 1, borderRadius: 10, minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }, pin: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, editor: { borderWidth: 1, borderRadius: 10, padding: 13, gap: 9 }, input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }, toggle: { flexDirection: 'row', minHeight: 46, alignItems: 'center', justifyContent: 'space-between' }, actions: { flexDirection: 'row', gap: 8 }, secondary: { flex: 1, height: 50, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, primary: { flex: 1, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, white: { color: '#FFF', fontWeight: '900' }, add: { minHeight: 55, borderWidth: 1, borderRadius: 9, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 8 }, limitCard: { minHeight: 62, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, error: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 },
});