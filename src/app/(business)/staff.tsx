import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessLocation, BusinessStaff, LocalImageFile } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: { title: 'Աշխատակիցներ', add: 'Ավելացնել աշխատակից', name: 'Անուն', email: 'Էլ․ փոստ', phone: 'Հեռախոս', password: 'Ժամանակավոր գաղտնաբառ', bio: 'Կարճ նկարագրություն (ոչ պարտադիր)', photo: 'Աշխատակցի նկար', choosePhoto: 'Ընտրել նկար', changePhoto: 'Փոխել նկարը', removePhoto: 'Հեռացնել', permission: 'Թույլատրեք gallery-ի հասանելիությունը։', save: 'Ավելացնել', cancel: 'Չեղարկել', schedule: 'Գրաֆիկ', bookable: 'Ամրագրվող', error: 'Չհաջողվեց', empty: 'Աշխատակիցներ չկան', location: 'Մասնաճյուղ', loadError: 'Չհաջողվեց բեռնել աշխատակիցներին', retry: 'Կրկին փորձել' },
  ru: { title: 'Сотрудники', add: 'Добавить сотрудника', name: 'Имя', email: 'Эл. почта', phone: 'Телефон', password: 'Временный пароль', bio: 'Краткое описание (необязательно)', photo: 'Фото сотрудника', choosePhoto: 'Выбрать фото', changePhoto: 'Изменить фото', removePhoto: 'Удалить', permission: 'Разрешите доступ к галерее.', save: 'Добавить', cancel: 'Отмена', schedule: 'График', bookable: 'Доступен для записи', error: 'Не удалось выполнить', empty: 'Сотрудников нет', location: 'Филиал', loadError: 'Не удалось загрузить сотрудников', retry: 'Повторить' },
  en: { title: 'Team', add: 'Add team member', name: 'Name', email: 'Email', phone: 'Phone', password: 'Temporary password', bio: 'Short bio (optional)', photo: 'Team member photo', choosePhoto: 'Choose photo', changePhoto: 'Change photo', removePhoto: 'Remove', permission: 'Allow photo library access.', save: 'Add', cancel: 'Cancel', schedule: 'Schedule', bookable: 'Bookable', error: 'Action failed', empty: 'No team members', location: 'Location', loadError: 'Could not load team members', retry: 'Try again' },
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
  const valid = form.name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 8 && (locations.length <= 1 || !!form.locationId);

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

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={[styles.icon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="person.2.fill" android="group" color={theme.plum} size={25} /></View><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Pressable accessibilityRole="button" onPress={() => showForm ? setShowForm(false) : openCreate()} style={[styles.add, { backgroundColor: theme.plum }]}><VizitIcon ios={showForm ? 'xmark' : 'plus'} android={showForm ? 'close' : 'person_add'} color="#FFF" size={22} /></Pressable></View>
      {showForm ? <View style={[styles.form, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
        <Text style={[styles.formTitle, { color: theme.text }]}>{c.add}</Text>
        <View style={styles.photoRow}><View style={[styles.largeAvatar, { backgroundColor: theme.plumSoft }]}>{form.avatarUrl ? <Image source={{ uri: form.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <VizitIcon ios="person.crop.circle" android="person" color={theme.plum} size={37} />}</View><View style={styles.flex}><Text style={[styles.photoLabel, { color: theme.text }]}>{c.photo}</Text><Pressable disabled={uploading === 'new'} onPress={() => void pickPhoto('new')} style={[styles.photoButton, { borderColor: theme.border }]}>{uploading === 'new' ? <ActivityIndicator color={theme.plum} /> : <Text style={{ color: theme.plum, fontWeight: '900' }}>{c.choosePhoto}</Text>}</Pressable>{form.avatarUrl ? <Pressable onPress={() => setForm((value) => ({ ...value, avatarUrl: null }))}><Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800', marginTop: 6 }}>{c.removePhoto}</Text></Pressable> : null}</View></View>
        {(['name', 'email', 'phone', 'password'] as const).map((key) => <TextInput key={key} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={c[key]} secureTextEntry={key === 'password'} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'} autoCapitalize={key === 'email' ? 'none' : 'sentences'} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />)}
        <TextInput value={form.bio} onChangeText={(bio) => setForm((current) => ({ ...current, bio }))} placeholder={c.bio} placeholderTextColor={theme.muted} multiline style={[styles.input, styles.bio, { color: theme.text, borderColor: theme.border }]} />
        {locations.length > 1 ? <View style={styles.locationBlock}><Text style={[styles.locationLabel, { color: theme.text }]}>{c.location}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationRow}>{locations.map((location) => { const selected = form.locationId === location.id; return <Pressable key={location.id} onPress={() => setForm((current) => ({ ...current, locationId: location.id }))} style={[styles.locationChip, { borderColor: selected ? theme.plum : theme.border, backgroundColor: selected ? theme.plumSoft : theme.background }]}><Text style={{ color: selected ? theme.plum : theme.text, fontWeight: '800' }}>{location.name || location.address || `#${location.id}`}</Text></Pressable>; })}</ScrollView></View> : null}
        <View style={styles.actions}><Pressable onPress={() => setShowForm(false)} style={[styles.button, styles.flex, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800' }}>{c.cancel}</Text></Pressable><Pressable disabled={!valid || create.isPending || uploading === 'new'} onPress={() => create.mutate()} style={[styles.button, styles.flex, { backgroundColor: theme.plum, opacity: valid && uploading !== 'new' ? 1 : 0.4 }]}>{create.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c.save}</Text>}</Pressable></View>
      </View> : null}
      {query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.loadError}</Text><Pressable onPress={() => query.refetch()}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.retry}</Text></Pressable></View> : query.data?.length ? query.data.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.person}><View style={[styles.avatar, { backgroundColor: theme.plumSoft }]}>{item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={[styles.initial, { color: theme.plum }]}>{item.name.charAt(0).toUpperCase()}</Text>}</View><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{item.email} · {item.role}</Text>{item.bio ? <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 11, marginTop: 3 }}>{item.bio}</Text> : null}{locations.length > 1 ? <Text style={{ color: theme.muted, fontSize: 11, marginTop: 3 }}>{locations.find((location) => location.id === item.location_id)?.name ?? c.location}</Text> : null}</View><Switch value={item.is_active} onValueChange={(value) => active.mutate({ id: item.id, value })} trackColor={{ false: theme.border, true: theme.plum }} /></View><View style={styles.photoActions}><Pressable disabled={uploading === item.id} onPress={() => void pickPhoto(item)} style={[styles.smallPhotoButton, { backgroundColor: theme.plumSoft }]}>{uploading === item.id ? <ActivityIndicator size="small" color={theme.plum} /> : <><VizitIcon ios="camera.fill" android="photo_camera" color={theme.plum} size={16} /><Text style={{ color: theme.plum, fontWeight: '800', fontSize: 12 }}>{item.avatar_url ? c.changePhoto : c.choosePhoto}</Text></>}</Pressable>{item.avatar_url ? <Pressable disabled={photoUpdate.isPending} onPress={() => photoUpdate.mutate({ id: item.id, avatar_url: null })} style={[styles.smallPhotoButton, { backgroundColor: theme.dangerSoft }]}><Text style={{ color: theme.danger, fontWeight: '800', fontSize: 12 }}>{c.removePhoto}</Text></Pressable> : null}</View><View style={styles.cardBottom}><View style={styles.bookable}><Switch value={!!item.is_bookable} onValueChange={(value) => bookable.mutate({ id: item.id, value })} trackColor={{ false: theme.border, true: theme.gold }} /><Text style={{ color: theme.text, fontWeight: '700' }}>{c.bookable}</Text></View><Pressable onPress={() => router.push(`/(business)/staff-schedule?id=${item.id}&name=${encodeURIComponent(item.name)}` as Href)} style={[styles.schedule, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="calendar" android="calendar_month" color={theme.plum} size={18} /><Text style={{ color: theme.plum, fontWeight: '800' }}>{c.schedule}</Text></Pressable></View></View>) : <Text style={{ color: theme.muted }}>{c.empty}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, gap: 11, paddingBottom: 35 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, icon: { width: 50, height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, fontSize: 27, fontWeight: '900' }, add: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, form: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 9 }, formTitle: { fontSize: 18, fontWeight: '900' }, photoRow: { flexDirection: 'row', alignItems: 'center', gap: 13 }, largeAvatar: { width: 82, height: 82, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, photoLabel: { fontSize: 13, fontWeight: '900', marginBottom: 7 }, photoButton: { minHeight: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, input: { height: 51, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 }, bio: { height: 78, paddingTop: 12, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: 8 }, button: { height: 48, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, white: { color: '#FFF', fontWeight: '900' }, card: { borderWidth: 1, borderRadius: 12, padding: 13, gap: 12 }, person: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 19, fontWeight: '900' }, name: { fontSize: 16, fontWeight: '900', marginBottom: 3 }, photoActions: { flexDirection: 'row', gap: 7 }, smallPhotoButton: { flex: 1, minHeight: 38, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8 }, cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, bookable: { flexDirection: 'row', alignItems: 'center', gap: 6 }, schedule: { minHeight: 42, paddingHorizontal: 12, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }, locationBlock: { gap: 7 }, locationLabel: { fontSize: 12, fontWeight: '900' }, locationRow: { gap: 7 }, locationChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, error: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 } });
