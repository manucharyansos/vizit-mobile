import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, PremiumInput, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessLocation, BusinessStaff, LocalImageFile } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: { title: 'Աշխատակիցներ', add: 'Ավելացնել աշխատակից', name: 'Անուն', email: 'Էլ․ փոստ', phone: 'Հեռախոս', password: 'Ժամանակավոր գաղտնաբառ', bio: 'Կարճ նկարագրություն (ոչ պարտադիր)', photo: 'Աշխատակցի նկար', choosePhoto: 'Ընտրել նկար', changePhoto: 'Փոխել նկարը', removePhoto: 'Հեռացնել', permission: 'Թույլատրեք gallery-ի հասանելիությունը։', save: 'Ավելացնել', cancel: 'Չեղարկել', schedule: 'Գրաֆիկ', bookable: 'Ամրագրվող', error: 'Չհաջողվեց', empty: 'Աշխատակիցներ չկան', location: 'Մասնաճյուղ', loadError: 'Չհաջողվեց բեռնել աշխատակիցներին', retry: 'Կրկին փորձել', subtitle: 'Թիմ և հասանելիություն', active: 'Ակտիվ', inactive: 'Անջատված' },
  ru: { title: 'Сотрудники', add: 'Добавить сотрудника', name: 'Имя', email: 'Эл. почта', phone: 'Телефон', password: 'Временный пароль', bio: 'Краткое описание (необязательно)', photo: 'Фото сотрудника', choosePhoto: 'Выбрать фото', changePhoto: 'Изменить фото', removePhoto: 'Удалить', permission: 'Разрешите доступ к галерее.', save: 'Добавить', cancel: 'Отмена', schedule: 'График', bookable: 'Доступен для записи', error: 'Не удалось выполнить', empty: 'Сотрудников нет', location: 'Филиал', loadError: 'Не удалось загрузить сотрудников', retry: 'Повторить', subtitle: 'Команда и доступность', active: 'Активен', inactive: 'Отключён' },
  en: { title: 'Team', add: 'Add team member', name: 'Name', email: 'Email', phone: 'Phone', password: 'Temporary password', bio: 'Short bio (optional)', photo: 'Team member photo', choosePhoto: 'Choose photo', changePhoto: 'Change photo', removePhoto: 'Remove', permission: 'Allow photo library access.', save: 'Add', cancel: 'Cancel', schedule: 'Schedule', bookable: 'Bookable', error: 'Action failed', empty: 'No team members', location: 'Location', loadError: 'Could not load team members', retry: 'Try again', subtitle: 'Team and availability', active: 'Active', inactive: 'Inactive' },
};

type StaffForm = { name: string; email: string; phone: string; password: string; bio: string; avatarUrl: string | null; locationId?: number };
const blank = (locationId?: number): StaffForm => ({ name: '', email: '', phone: '', password: '', bio: '', avatarUrl: null, locationId });

export default function StaffScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StaffForm>(blank());
  const [uploading, setUploading] = useState<number | 'new' | null>(null);
  const query = useQuery({ queryKey: ['business-staff'], queryFn: businessApi.staff, retry: false, refetchOnMount: 'always' });
  const settings = useQuery<{ locations?: BusinessLocation[] }>({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const locations = (settings.data?.locations ?? []).filter((location) => location.is_active);
  const defaultLocationId = locations[0]?.id;
  const fail = (error: unknown) => Alert.alert(c.error, apiErrorMessage(error));

  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['business-staff'] }),
      cache.invalidateQueries({ queryKey: ['staff'] }),
      cache.invalidateQueries({ queryKey: ['business-onboarding'] }),
    ]);
    await cache.refetchQueries({ queryKey: ['business-staff'], type: 'active' });
  };
  const openCreate = () => { setForm(blank(defaultLocationId)); setShowForm(true); };
  const create = useMutation({
    mutationFn: () => businessApi.createStaff({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, phone: form.phone.trim() || undefined, bio: form.bio.trim() || undefined, avatar_url: form.avatarUrl, location_id: form.locationId }),
    onSuccess: async () => { setForm(blank(defaultLocationId)); setShowForm(false); await refresh(); },
    onError: fail,
  });
  const active = useMutation({ mutationFn: ({ id, value }: { id: number; value: boolean }) => businessApi.setStaffActive(id, value), onSuccess: refresh, onError: fail });
  const bookable = useMutation({ mutationFn: ({ id, value }: { id: number; value: boolean }) => businessApi.updateStaff(id, { is_bookable: value, show_in_public_team: value }), onSuccess: refresh, onError: fail });
  const photoUpdate = useMutation({ mutationFn: ({ id, avatar_url }: { id: number; avatar_url: string | null }) => businessApi.updateStaff(id, { avatar_url }), onSuccess: refresh, onError: fail });
  const valid = form.name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 8 && (locations.length <= 1 || Boolean(form.locationId));

  const pickPhoto = async (target: 'new' | BusinessStaff) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert(c.permission); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file: LocalImageFile = { uri: asset.uri, name: asset.fileName ?? `staff-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
    const id = target === 'new' ? 'new' : target.id;
    setUploading(id);
    try {
      const uploaded = await businessApi.uploadImage(file, 'staff');
      if (target === 'new') setForm((current) => ({ ...current, avatarUrl: uploaded.url }));
      else await photoUpdate.mutateAsync({ id: target.id, avatar_url: uploaded.url });
    } catch (error) {
      fail(error);
    } finally {
      setUploading(null);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Vizit Business"
          title={c.title}
          subtitle={query.isSuccess ? `${c.subtitle} · ${query.data.length}` : c.subtitle}
          action={<IconButton accessibilityLabel={showForm ? c.cancel : c.add} ios={showForm ? 'xmark' : 'plus'} android={showForm ? 'close' : 'person_add'} onPress={() => showForm ? setShowForm(false) : openCreate()} tone="primary" />}
        />

        {showForm ? (
          <Surface style={styles.form} elevated>
            <Text style={[styles.formTitle, { color: theme.text }]}>{c.add}</Text>
            <View style={styles.photoRow}>
              <View style={[styles.largeAvatar, { backgroundColor: theme.accentSubtle }]}>
                {form.avatarUrl ? <Image source={{ uri: form.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <VizitIcon ios="person.crop.circle" android="person" color={theme.accentText} size={36} />}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.photoLabel, { color: theme.textSecondary }]}>{c.photo}</Text>
                <PremiumButton title={c.choosePhoto} loading={uploading === 'new'} onPress={() => void pickPhoto('new')} tone="secondary" compact icon={{ ios: 'camera.fill', android: 'photo_camera' }} />
                {form.avatarUrl ? <PremiumButton title={c.removePhoto} onPress={() => setForm((value) => ({ ...value, avatarUrl: null }))} tone="ghost" compact /> : null}
              </View>
            </View>
            <PremiumInput label={c.name} value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} placeholder={c.name} icon={{ ios: 'person.fill', android: 'person' }} />
            <PremiumInput label={c.email} value={form.email} onChangeText={(email) => setForm((value) => ({ ...value, email }))} placeholder={c.email} keyboardType="email-address" autoCapitalize="none" icon={{ ios: 'envelope.fill', android: 'mail' }} />
            <PremiumInput label={c.phone} value={form.phone} onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} placeholder={c.phone} keyboardType="phone-pad" icon={{ ios: 'phone.fill', android: 'call' }} />
            <PremiumInput label={c.password} value={form.password} onChangeText={(password) => setForm((value) => ({ ...value, password }))} placeholder={c.password} secureTextEntry icon={{ ios: 'lock.fill', android: 'lock' }} />
            <PremiumInput label={c.bio} value={form.bio} onChangeText={(bio) => setForm((value) => ({ ...value, bio }))} placeholder={c.bio} multiline icon={{ ios: 'text.alignleft', android: 'notes' }} />
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
            <View style={styles.actions}>
              <PremiumButton title={c.cancel} onPress={() => setShowForm(false)} tone="secondary" style={styles.flex} />
              <PremiumButton title={c.save} loading={create.isPending} disabled={!valid || uploading === 'new'} onPress={() => create.mutate()} style={styles.flex} />
            </View>
          </Surface>
        ) : null}

        {query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
          <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} onPress={() => query.refetch()} tone="secondary" />} />
        ) : query.data?.length ? query.data.map((item) => (
          <Surface key={item.id} style={styles.card} elevated>
            <View style={styles.person}>
              <View style={[styles.avatar, { backgroundColor: theme.accentSubtle }]}>
                {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={[styles.initial, { color: theme.accentText }]}>{item.name.charAt(0).toLocaleUpperCase()}</Text>}
              </View>
              <View style={styles.flex}><View style={styles.nameRow}><Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{item.name}</Text><StatusPill label={item.is_active ? c.active : c.inactive} tone={item.is_active ? 'success' : 'neutral'} /></View><Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>{item.email} · {item.role}</Text>{item.bio ? <Text numberOfLines={2} style={[styles.bio, { color: theme.muted }]}>{item.bio}</Text> : null}{locations.length > 1 ? <Text numberOfLines={1} style={[styles.locationMeta, { color: theme.faint }]}>{locations.find((location) => location.id === item.location_id)?.name ?? c.location}</Text> : null}</View>
              <Switch value={item.is_active} onValueChange={(value) => active.mutate({ id: item.id, value })} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceRaised} />
            </View>
            <View style={styles.photoActions}>
              <PremiumButton title={item.avatar_url ? c.changePhoto : c.choosePhoto} loading={uploading === item.id} onPress={() => void pickPhoto(item)} tone="secondary" compact style={styles.flex} icon={{ ios: 'camera.fill', android: 'photo_camera' }} />
              {item.avatar_url ? <PremiumButton title={c.removePhoto} loading={photoUpdate.isPending} onPress={() => photoUpdate.mutate({ id: item.id, avatar_url: null })} tone="danger" compact style={styles.flex} /> : null}
            </View>
            <View style={[styles.cardBottom, { backgroundColor: theme.accentSubtle }]}>
              <View style={styles.bookable}><Switch value={Boolean(item.is_bookable)} onValueChange={(value) => bookable.mutate({ id: item.id, value })} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceRaised} /><Text style={[styles.bookableText, { color: theme.text }]}>{c.bookable}</Text></View>
              <PremiumButton title={c.schedule} onPress={() => router.push(`/(business)/staff-schedule?id=${item.id}&name=${encodeURIComponent(item.name)}` as Href)} tone="ghost" compact icon={{ ios: 'calendar', android: 'calendar_month' }} />
            </View>
          </Surface>
        )) : <StateCard title={c.empty} icon={{ ios: 'person.2.fill', android: 'group' }} action={<PremiumButton title={c.add} onPress={openCreate} />} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, gap: 11, paddingBottom: 36 },
  form: { padding: 15, gap: 12 },
  formTitle: ui.type.sectionTitle,
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  largeAvatar: { width: 84, height: 84, borderRadius: ui.radius.large, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoLabel: { ...ui.type.caption, marginBottom: 7 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  locationBlock: { gap: 7 },
  locationLabel: ui.type.caption,
  locationRow: { gap: 7 },
  locationChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: ui.radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  locationText: ui.type.caption,
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 13, gap: 12 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 56, height: 56, borderRadius: ui.radius.medium, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 20, lineHeight: 25, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  meta: ui.type.caption,
  bio: { fontSize: 11, lineHeight: 15, marginTop: 3 },
  locationMeta: { fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 3 },
  photoActions: { flexDirection: 'row', gap: 7 },
  cardBottom: { minHeight: 52, marginHorizontal: -3, marginBottom: -3, borderRadius: ui.radius.medium, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  bookable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  bookableText: { ...ui.type.caption, flex: 1 },
});
