import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationPicker } from '@/components/location-picker';
import { IconButton, PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
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
  const usage = Math.min(1, locations.length / limit);

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <PageHeader title={c.title} eyebrow="Vizit Pro" onBack={() => safeBack('/(business)/more')} backLabel={c.cancel} action={!editing && canAdd ? <IconButton ios="plus" android="add" accessibilityLabel={c.add} tone="primary" onPress={() => { setForm(empty()); setEditing('new'); }} /> : undefined} />
      {query.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}
      {query.isError ? <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void query.refetch()} />} /> : null}
      {!query.isError && query.data ? <Surface style={styles.usageCard}>
        <View style={styles.usageTop}><View><Text style={[styles.kicker, { color: theme.muted }]}>{c.usage}</Text><Text style={[styles.usageValue, { color: theme.text }]}>{locations.length} <Text style={{ color: theme.faint }}>/ {limit}</Text></Text></View><View style={styles.plan}><Text style={[styles.kicker, { color: theme.muted }]}>{c.plan}</Text><StatusPill label={planName} tone="accent" /></View></View>
        <View style={[styles.track, { backgroundColor: theme.surface }]}><View style={[styles.trackFill, { width: `${usage * 100}%`, backgroundColor: theme.accent }]} /></View>
      </Surface> : null}
      {!query.isError && locations.length ? <SectionHeader title={c.title} detail={`${locations.length} / ${limit}`} /> : null}
      {!query.isError ? locations.map((item) => <Surface key={item.id} style={styles.card}>
        <View style={[styles.pin, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="mappin.and.ellipse" android="location_on" color={theme.accentText} size={22} /></View>
        <Pressable accessibilityRole="button" style={styles.locationBody} onPress={() => edit(item)}>
          <View style={styles.locationTitle}><Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{item.name || item.address || '—'}</Text>{item.is_primary ? <StatusPill label={c.primary} tone="accent" /> : null}</View>
          <Text style={[styles.address, { color: theme.muted }]}>{item.address}{item.city ? `, ${item.city}` : ''}</Text>
          {item.latitude != null && item.longitude != null ? <Text style={[styles.coords, { color: theme.faint }]}>{c.point}: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text> : null}
        </Pressable>
        {locations.length > 1 ? <IconButton accessibilityLabel={c.delete} ios="trash" android="delete" tone="danger" onPress={() => Alert.alert(c.delete, c.confirm, [{ text: c.cancel }, { text: c.delete, style: 'destructive', onPress: () => remove.mutate(item.id) }])} /> : null}
      </Surface>) : null}
      {editing ? <Surface elevated style={styles.editor}>
        <SectionHeader title={editing === 'new' ? c.add : c.title} />
        {(['name', 'address', 'city', 'phone'] as const).map((key) => <PremiumInput key={key} label={c[key]} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={c[key]} keyboardType={key === 'phone' ? 'phone-pad' : 'default'} icon={key === 'name' ? { ios: 'building.2', android: 'storefront' } : key === 'address' ? { ios: 'mappin', android: 'location_on' } : key === 'city' ? { ios: 'building.2.crop.circle', android: 'location_city' } : { ios: 'phone', android: 'phone' }} />)}
        <LocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(point) => setForm((current) => ({ ...current, ...point }))} />
        <View style={[styles.toggle, { backgroundColor: theme.surface }]}><View style={styles.toggleText}><Text style={[styles.toggleTitle, { color: theme.text }]}>{c.primary}</Text><Text style={[styles.coords, { color: theme.muted }]}>{c.point}</Text></View><Switch value={form.is_primary} onValueChange={(value) => setForm((current) => ({ ...current, is_primary: value }))} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceElevated} /></View>
        <View style={styles.actions}>
          <PremiumButton title={c.cancel} tone="secondary" onPress={() => setEditing(null)} style={styles.flex} />
          <PremiumButton title={c.save} loading={save.isPending} disabled={!form.address.trim()} onPress={() => save.mutate()} style={styles.flex} />
        </View>
      </Surface> : null}
      {!editing && !query.isError && !canAdd ? <Surface style={styles.limitCard}><View style={[styles.limitIcon, { backgroundColor: theme.warningSoft }]}><VizitIcon ios="lock.fill" android="lock" color={theme.warning} size={20} /></View><Text style={[styles.limitText, { color: theme.text }]}>{c.limit}</Text><PremiumButton title={c.upgrade} compact tone="secondary" onPress={() => router.push('/(business)/billing' as never)} /></Surface> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  loader: { marginVertical: ui.spacing.md },
  usageCard: { gap: ui.spacing.sm },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: ui.type.caption,
  usageValue: { ...ui.type.pageTitle, marginTop: 2 },
  plan: { alignItems: 'flex-end', gap: 6 },
  track: { height: 5, borderRadius: ui.radius.pill, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: ui.radius.pill },
  card: { minHeight: 94, padding: ui.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  pin: { width: 46, height: 46, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' },
  locationBody: { flex: 1, minHeight: ui.touchTarget, justifyContent: 'center' },
  locationTitle: { flexDirection: 'row', alignItems: 'center', gap: ui.spacing.xs },
  name: { ...ui.type.cardTitle, flexShrink: 1 },
  address: { ...ui.type.body, marginTop: 3 },
  coords: ui.type.caption,
  editor: { gap: ui.spacing.sm, borderColor: 'transparent' },
  toggle: { flexDirection: 'row', minHeight: 58, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ui.spacing.sm, borderRadius: ui.radius.medium },
  toggleText: { gap: 2 },
  toggleTitle: ui.type.cardTitle,
  actions: { flexDirection: 'row', gap: ui.spacing.xs },
  flex: { flex: 1 },
  limitCard: { minHeight: 74, padding: ui.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  limitIcon: { width: 42, height: 42, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center' },
  limitText: { ...ui.type.body, flex: 1 },
});
