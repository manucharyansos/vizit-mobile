import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessLocation, BusinessService, LocalImageFile } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: { title: 'Ծառայություններ', empty: 'Ծառայություններ դեռ չկան', add: 'Նոր ծառայություն', name: 'Անվանում', description: 'Նկարագրություն', duration: 'Տևողություն՝ րոպե', price: 'Գին՝ ֏', image: 'Ծառայության նկար', chooseImage: 'Ընտրել նկար', removeImage: 'Հեռացնել նկարը', permission: 'Թույլատրեք gallery-ի հասանելիությունը։', save: 'Պահպանել', cancel: 'Չեղարկել', active: 'Ակտիվ', edit: 'Խմբագրել', remove: 'Ջնջել', confirm: 'Ջնջե՞լ այս ծառայությունը', error: 'Չհաջողվեց պահպանել', location: 'Մասնաճյուղ', loadError: 'Չհաջողվեց բեռնել ծառայությունները', retry: 'Կրկին փորձել' },
  ru: { title: 'Услуги', empty: 'Услуг пока нет', add: 'Новая услуга', name: 'Название', description: 'Описание', duration: 'Длительность, минуты', price: 'Цена, ֏', image: 'Фото услуги', chooseImage: 'Выбрать фото', removeImage: 'Удалить фото', permission: 'Разрешите доступ к галерее.', save: 'Сохранить', cancel: 'Отмена', active: 'Активна', edit: 'Изменить', remove: 'Удалить', confirm: 'Удалить эту услугу?', error: 'Не удалось сохранить', location: 'Филиал', loadError: 'Не удалось загрузить услуги', retry: 'Повторить' },
  en: { title: 'Services', empty: 'No services yet', add: 'New service', name: 'Name', description: 'Description', duration: 'Duration, minutes', price: 'Price, ֏', image: 'Service image', chooseImage: 'Choose image', removeImage: 'Remove image', permission: 'Allow photo library access.', save: 'Save', cancel: 'Cancel', active: 'Active', edit: 'Edit', remove: 'Delete', confirm: 'Delete this service?', error: 'Could not save', location: 'Location', loadError: 'Could not load services', retry: 'Try again' },
};

type ServiceForm = { name: string; description: string; duration: string; price: string; imageUrl: string | null; locationId?: number };
const blank = (locationId?: number): ServiceForm => ({ name: '', description: '', duration: '60', price: '', imageUrl: null, locationId });

export default function ServicesScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['business-services'], queryFn: businessApi.services, retry: false });
  const settings = useQuery<{ locations?: BusinessLocation[] }>({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const locations = (settings.data?.locations ?? []).filter((location) => location.is_active);
  const defaultLocationId = locations[0]?.id;
  const [editing, setEditing] = useState<BusinessService | null>();
  const [form, setForm] = useState<ServiceForm>(blank());
  const [uploading, setUploading] = useState(false);

  const close = () => { setEditing(undefined); setForm(blank(defaultLocationId)); };
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['business-services'] }),
      cache.invalidateQueries({ queryKey: ['services'] }),
      cache.invalidateQueries({ queryKey: ['business-onboarding'] }),
    ]);
    await cache.refetchQueries({ queryKey: ['business-services'], type: 'active' });
  };
  const save = useMutation({
    mutationFn: () => editing
      ? businessApi.updateService(editing.id, { name: form.name.trim(), description: form.description.trim() || null, image_url: form.imageUrl, duration_minutes: Number(form.duration), price: Number(form.price || 0), location_id: form.locationId })
      : businessApi.createService({ name: form.name.trim(), description: form.description.trim() || undefined, image_url: form.imageUrl, duration_minutes: Number(form.duration), price: Number(form.price || 0), currency: 'AMD', location_id: form.locationId }),
    onSuccess: async () => { close(); await refresh(); },
    onError: (error) => Alert.alert(c.error, apiErrorMessage(error)),
  });
  const toggle = useMutation({ mutationFn: (item: BusinessService) => businessApi.updateService(item.id, { is_active: !item.is_active }), onSuccess: refresh, onError: (error) => Alert.alert(c.error, apiErrorMessage(error)) });
  const remove = useMutation({ mutationFn: businessApi.deleteService, onSuccess: refresh, onError: (error) => Alert.alert(c.error, apiErrorMessage(error)) });
  const beginEdit = (item: BusinessService) => { setEditing(item); setForm({ name: item.name, description: item.description ?? '', duration: String(item.duration_minutes), price: String(item.price ?? 0), imageUrl: item.image_url ?? null, locationId: item.location_id ?? defaultLocationId }); };
  const beginCreate = () => { setEditing(null); setForm(blank(defaultLocationId)); };
  const confirmRemove = (item: BusinessService) => Alert.alert(c.remove, c.confirm, [{ text: c.cancel, style: 'cancel' }, { text: c.remove, style: 'destructive', onPress: () => remove.mutate(item.id) }]);
  const valid = form.name.trim().length >= 2 && Number(form.duration) >= 5 && (locations.length <= 1 || !!form.locationId);

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert(c.permission); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file: LocalImageFile = { uri: asset.uri, name: asset.fileName ?? `service-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
    setUploading(true);
    try {
      const uploaded = await businessApi.uploadImage(file, 'services');
      setForm((current) => ({ ...current, imageUrl: uploaded.url }));
    } catch (error) {
      Alert.alert(c.error, apiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={[styles.headerIcon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="square.grid.2x2.fill" android="grid_view" color={theme.plum} size={25} /></View><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Pressable accessibilityRole="button" onPress={beginCreate} style={[styles.add, { backgroundColor: theme.plum }]}><VizitIcon ios="plus" android="add" color="#FFF" size={22} /></Pressable></View>
      {editing !== undefined ? <View style={[styles.form, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
        <Text style={[styles.formTitle, { color: theme.text }]}>{editing ? c.edit : c.add}</Text>
        <Text style={[styles.imageLabel, { color: theme.text }]}>{c.image}</Text>
        <View style={[styles.imagePreview, { backgroundColor: theme.plumSoft, borderColor: theme.border }]}>{form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <VizitIcon ios="photo" android="image" color={theme.plum} size={34} />}</View>
        <View style={styles.formRow}><Pressable disabled={uploading} onPress={() => void chooseImage()} style={[styles.secondary, styles.flex, { borderColor: theme.border }]}>{uploading ? <ActivityIndicator color={theme.plum} /> : <Text style={{ color: theme.text, fontWeight: '800' }}>{c.chooseImage}</Text>}</Pressable>{form.imageUrl ? <Pressable onPress={() => setForm((value) => ({ ...value, imageUrl: null }))} style={[styles.secondary, styles.flex, { borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.removeImage}</Text></Pressable> : null}</View>
        <TextInput value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} placeholder={c.name} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
        <TextInput value={form.description} onChangeText={(description) => setForm((value) => ({ ...value, description }))} placeholder={c.description} placeholderTextColor={theme.muted} multiline style={[styles.input, styles.description, { color: theme.text, borderColor: theme.border }]} />
        <View style={styles.formRow}><TextInput value={form.duration} onChangeText={(duration) => setForm((value) => ({ ...value, duration }))} keyboardType="number-pad" placeholder={c.duration} placeholderTextColor={theme.muted} style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border }]} /><TextInput value={form.price} onChangeText={(price) => setForm((value) => ({ ...value, price }))} keyboardType="number-pad" placeholder={c.price} placeholderTextColor={theme.muted} style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border }]} /></View>
        {locations.length > 1 ? <View style={styles.locationBlock}><Text style={[styles.locationLabel, { color: theme.text }]}>{c.location}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationRow}>{locations.map((location) => { const selected = form.locationId === location.id; return <Pressable key={location.id} onPress={() => setForm((value) => ({ ...value, locationId: location.id }))} style={[styles.locationChip, { borderColor: selected ? theme.plum : theme.border, backgroundColor: selected ? theme.plumSoft : theme.background }]}><Text style={{ color: selected ? theme.plum : theme.text, fontWeight: '800' }}>{location.name || location.address || `#${location.id}`}</Text></Pressable>; })}</ScrollView></View> : null}
        <View style={styles.formRow}><Pressable onPress={close} style={[styles.secondary, styles.flex, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800' }}>{c.cancel}</Text></Pressable><Pressable disabled={!valid || save.isPending || uploading} onPress={() => save.mutate()} style={[styles.primary, styles.flex, { backgroundColor: theme.plum, opacity: valid && !uploading ? 1 : 0.4 }]}>{save.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable></View>
      </View> : null}
      {query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.loadError}</Text><Pressable onPress={() => query.refetch()}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.retry}</Text></Pressable></View> : query.data?.length ? query.data.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.cardTop}>{item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="photo" android="image" color={theme.plum} size={23} /></View>}<View style={styles.body}><Text style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text style={{ color: theme.muted }}>{item.duration_minutes} min · {Number(item.price).toLocaleString()} {item.currency}</Text>{locations.length > 1 ? <Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{locations.find((location) => location.id === item.location_id)?.name ?? c.location}</Text> : null}</View><Switch value={item.is_active} onValueChange={() => toggle.mutate(item)} trackColor={{ false: theme.border, true: theme.plum }} /></View><View style={styles.actions}><Pressable onPress={() => beginEdit(item)} style={[styles.action, { backgroundColor: theme.plumSoft }]}><Text style={{ color: theme.plum, fontWeight: '800' }}>{c.edit}</Text></Pressable><Pressable onPress={() => confirmRemove(item)} style={[styles.action, { backgroundColor: theme.goldSoft }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.remove}</Text></Pressable></View></View>) : <Text style={{ color: theme.muted }}>{c.empty}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, gap: 11, paddingBottom: 35 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, headerIcon: { width: 50, height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, fontSize: 27, fontWeight: '900' }, add: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, form: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }, formTitle: { fontSize: 18, fontWeight: '900' }, imageLabel: { fontSize: 12, fontWeight: '900' }, imagePreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, input: { minHeight: 51, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 }, description: { height: 80, paddingTop: 12, textAlignVertical: 'top' }, formRow: { flexDirection: 'row', gap: 9 }, flex: { flex: 1 }, primary: { height: 49, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, secondary: { minHeight: 49, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, white: { color: '#FFF', fontWeight: '900' }, card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, thumb: { width: 58, height: 58, borderRadius: 10, overflow: 'hidden' }, thumbFallback: { alignItems: 'center', justifyContent: 'center' }, body: { flex: 1 }, name: { fontSize: 16, fontWeight: '900', marginBottom: 4 }, actions: { flexDirection: 'row', gap: 8 }, action: { flex: 1, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, locationBlock: { gap: 7 }, locationLabel: { fontSize: 12, fontWeight: '900' }, locationRow: { gap: 7 }, locationChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, error: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 } });
