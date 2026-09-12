import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, PremiumInput, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessLocation, BusinessService, LocalImageFile } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: { title: 'Ծառայություններ', empty: 'Ծառայություններ դեռ չկան', add: 'Նոր ծառայություն', name: 'Անվանում', description: 'Նկարագրություն', duration: 'Տևողություն՝ րոպե', price: 'Գին՝ ֏', image: 'Ծառայության նկար', chooseImage: 'Ընտրել նկար', removeImage: 'Հեռացնել նկարը', permission: 'Թույլատրեք gallery-ի հասանելիությունը։', save: 'Պահպանել', cancel: 'Չեղարկել', active: 'Ակտիվ', inactive: 'Անջատված', edit: 'Խմբագրել', remove: 'Ջնջել', confirm: 'Ջնջե՞լ այս ծառայությունը', error: 'Չհաջողվեց պահպանել', location: 'Մասնաճյուղ', loadError: 'Չհաջողվեց բեռնել ծառայությունները', retry: 'Կրկին փորձել', subtitle: 'Կատալոգ և հասանելիություն' },
  ru: { title: 'Услуги', empty: 'Услуг пока нет', add: 'Новая услуга', name: 'Название', description: 'Описание', duration: 'Длительность, минуты', price: 'Цена, ֏', image: 'Фото услуги', chooseImage: 'Выбрать фото', removeImage: 'Удалить фото', permission: 'Разрешите доступ к галерее.', save: 'Сохранить', cancel: 'Отмена', active: 'Активна', inactive: 'Отключена', edit: 'Изменить', remove: 'Удалить', confirm: 'Удалить эту услугу?', error: 'Не удалось сохранить', location: 'Филиал', loadError: 'Не удалось загрузить услуги', retry: 'Повторить', subtitle: 'Каталог и доступность' },
  en: { title: 'Services', empty: 'No services yet', add: 'New service', name: 'Name', description: 'Description', duration: 'Duration, minutes', price: 'Price, ֏', image: 'Service image', chooseImage: 'Choose image', removeImage: 'Remove image', permission: 'Allow photo library access.', save: 'Save', cancel: 'Cancel', active: 'Active', inactive: 'Inactive', edit: 'Edit', remove: 'Delete', confirm: 'Delete this service?', error: 'Could not save', location: 'Location', loadError: 'Could not load services', retry: 'Try again', subtitle: 'Catalog and availability' },
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
  const valid = form.name.trim().length >= 2 && Number(form.duration) >= 5 && (locations.length <= 1 || Boolean(form.locationId));

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

  const formOpen = editing !== undefined;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Vizit Business"
          title={c.title}
          subtitle={query.isSuccess ? `${c.subtitle} · ${query.data.length}` : c.subtitle}
          action={<IconButton accessibilityLabel={formOpen ? c.cancel : c.add} ios={formOpen ? 'xmark' : 'plus'} android={formOpen ? 'close' : 'add'} onPress={formOpen ? close : beginCreate} tone="primary" />}
        />

        {formOpen ? (
          <Surface style={styles.form} elevated>
            <Text style={[styles.formTitle, { color: theme.text }]}>{editing ? c.edit : c.add}</Text>
            <Text style={[styles.imageLabel, { color: theme.textSecondary }]}>{c.image}</Text>
            <View style={[styles.imagePreview, { backgroundColor: theme.accentSubtle, borderColor: theme.border }]}>
              {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[styles.imagePlaceholder, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="photo" android="image" color={theme.accentText} size={30} /></View>}
            </View>
            <View style={styles.formRow}>
              <PremiumButton title={c.chooseImage} loading={uploading} onPress={() => void chooseImage()} tone="secondary" compact style={styles.flex} icon={{ ios: 'photo.badge.plus', android: 'add_photo_alternate' }} />
              {form.imageUrl ? <PremiumButton title={c.removeImage} onPress={() => setForm((value) => ({ ...value, imageUrl: null }))} tone="danger" compact style={styles.flex} /> : null}
            </View>
            <PremiumInput label={c.name} value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} placeholder={c.name} icon={{ ios: 'tag.fill', android: 'label' }} />
            <PremiumInput label={c.description} value={form.description} onChangeText={(description) => setForm((value) => ({ ...value, description }))} placeholder={c.description} multiline icon={{ ios: 'text.alignleft', android: 'notes' }} />
            <View style={styles.formRow}>
              <PremiumInput label={c.duration} value={form.duration} onChangeText={(duration) => setForm((value) => ({ ...value, duration }))} placeholder={c.duration} keyboardType="number-pad" containerStyle={styles.flex} icon={{ ios: 'clock.fill', android: 'schedule' }} />
              <PremiumInput label={c.price} value={form.price} onChangeText={(price) => setForm((value) => ({ ...value, price }))} placeholder={c.price} keyboardType="number-pad" containerStyle={styles.flex} icon={{ ios: 'banknote.fill', android: 'payments' }} />
            </View>
            {locations.length > 1 ? (
              <View style={styles.locationBlock}>
                <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>{c.location}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationRow}>
                  {locations.map((location, index) => {
                    const selected = form.locationId === location.id;
                    return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={location.id} onPress={() => setForm((value) => ({ ...value, locationId: location.id }))} style={({ pressed }) => [styles.locationChip, { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accentSoft : theme.surface, opacity: pressed ? 0.74 : 1 }]}><Text style={[styles.locationText, { color: selected ? theme.accentText : theme.text }]}>{location.name || location.address || `${c.location} ${index + 1}`}</Text></Pressable>;
                  })}
                </ScrollView>
              </View>
            ) : null}
            <View style={styles.formRow}>
              <PremiumButton title={c.cancel} onPress={close} tone="secondary" style={styles.flex} />
              <PremiumButton title={c.save} loading={save.isPending} disabled={!valid || uploading} onPress={() => save.mutate()} style={styles.flex} />
            </View>
          </Surface>
        ) : null}

        {query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
          <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} onPress={() => query.refetch()} tone="secondary" />} />
        ) : query.data?.length ? query.data.map((item) => (
          <Surface key={item.id} style={styles.card} elevated>
            <View style={styles.cardTop}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="photo" android="image" color={theme.accentText} size={22} /></View>}
              <View style={styles.body}><Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text style={[styles.meta, { color: theme.muted }]}>{item.duration_minutes} min · {Number(item.price).toLocaleString()} {item.currency}</Text>{locations.length > 1 ? <Text numberOfLines={1} style={[styles.locationMeta, { color: theme.faint }]}>{locations.find((location) => location.id === item.location_id)?.name ?? c.location}</Text> : null}</View>
              <View style={styles.statusControl}><StatusPill label={item.is_active ? c.active : c.inactive} tone={item.is_active ? 'success' : 'neutral'} /><Switch value={item.is_active} onValueChange={() => toggle.mutate(item)} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceRaised} /></View>
            </View>
            <View style={styles.actions}>
              <PremiumButton title={c.edit} onPress={() => beginEdit(item)} tone="secondary" compact style={styles.flex} icon={{ ios: 'pencil', android: 'edit' }} />
              <PremiumButton title={c.remove} onPress={() => confirmRemove(item)} tone="danger" compact style={styles.flex} icon={{ ios: 'trash', android: 'delete' }} />
            </View>
          </Surface>
        )) : <StateCard title={c.empty} icon={{ ios: 'square.grid.2x2.fill', android: 'grid_view' }} action={<PremiumButton title={c.add} onPress={beginCreate} />} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, gap: 11, paddingBottom: 36 },
  form: { padding: 15, gap: 12, marginBottom: 4 },
  formTitle: ui.type.sectionTitle,
  imageLabel: ui.type.caption,
  imagePreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: ui.radius.medium, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  formRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  locationBlock: { gap: 7 },
  locationLabel: ui.type.caption,
  locationRow: { gap: 7 },
  locationChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: ui.radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  locationText: ui.type.caption,
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 13, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  thumb: { width: 64, height: 64, borderRadius: ui.radius.medium, overflow: 'hidden' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  meta: { ...ui.type.caption, marginTop: 4 },
  locationMeta: { fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 3 },
  statusControl: { alignItems: 'flex-end', gap: 6 },
  actions: { flexDirection: 'row', gap: 8 },
});
