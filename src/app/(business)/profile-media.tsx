import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi, LocalImageFile } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

type Settings = { logo_url?: string | null; cover_url?: string | null; show_logo?: boolean; show_cover?: boolean };
const copy = {
  hy: { title: 'Լոգո և նկարներ', hint: 'Այս նկարները ցուցադրվում են Vizit-ի հրապարակային էջում և որոնման արդյունքներում։', logo: 'Բիզնեսի լոգո', cover: 'Գլխավոր շապիկ', choose: 'Ընտրել gallery-ից', remove: 'Հեռացնել', permission: 'Նկար ընտրելու համար թույլատրեք gallery-ի հասանելիությունը։', saved: 'Նկարը պահպանված է', failed: 'Նկարը չհաջողվեց բեռնել', loadError: 'Չհաջողվեց բեռնել բիզնեսի նկարների կարգավորումները', retry: 'Կրկին փորձել' },
  ru: { title: 'Логотип и фото', hint: 'Эти изображения показываются на публичной странице Vizit и в результатах поиска.', logo: 'Логотип бизнеса', cover: 'Главная обложка', choose: 'Выбрать из галереи', remove: 'Удалить', permission: 'Разрешите доступ к галерее, чтобы выбрать изображение.', saved: 'Изображение сохранено', failed: 'Не удалось загрузить изображение', loadError: 'Не удалось загрузить настройки изображений бизнеса', retry: 'Повторить' },
  en: { title: 'Logo and images', hint: 'These images appear on your public Vizit page and in search results.', logo: 'Business logo', cover: 'Main cover', choose: 'Choose from gallery', remove: 'Remove', permission: 'Allow photo library access to choose an image.', saved: 'Image saved', failed: 'Could not upload image', loadError: 'Could not load business image settings', retry: 'Try again' },
};

export default function ProfileMedia() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const qc = useQueryClient();
  const settings = useQuery<Settings>({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false, refetchOnMount: 'always' });
  const update = useMutation({
    mutationFn: ({ key, value }: { key: 'logo_url' | 'cover_url'; value: string | null }) => businessApi.updateSettings({ [key]: value }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['business-settings'] }); await qc.refetchQueries({ queryKey: ['business-settings'], type: 'active' }); Alert.alert(c.saved); },
    onError: (error) => Alert.alert(c.failed, apiErrorMessage(error)),
  });
  const select = async (key: 'logo_url' | 'cover_url') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert(c.permission); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: key === 'logo_url' ? [1, 1] : [16, 9], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file: LocalImageFile = { uri: asset.uri, name: asset.fileName ?? `${key}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
    try { const uploaded = await businessApi.uploadImage(file, 'businesses'); update.mutate({ key, value: uploaded.url }); } catch (error) { Alert.alert(c.failed, apiErrorMessage(error)); }
  };

  if (settings.isLoading) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.plum} /></SafeAreaView>;
  if (settings.isError) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><VizitIcon ios="exclamationmark.triangle.fill" android="error_outline" color={theme.danger} size={30} /><Text style={[styles.errorTitle, { color: theme.text }]}>{c.loadError}</Text><Text style={[styles.errorText, { color: theme.muted }]}>{apiErrorMessage(settings.error)}</Text><Pressable onPress={() => settings.refetch()} style={[styles.retry, { backgroundColor: theme.plum }]}><Text style={styles.white}>{c.retry}</Text></Pressable><Pressable onPress={() => safeBack('/(business)/more')}><Text style={{ color: theme.muted }}>{c.title}</Text></Pressable></SafeAreaView>;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><Pressable onPress={() => safeBack('/(business)/more')} style={[styles.back, { borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="arrow_back" color={theme.text} size={21} /></Pressable><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text></View><Text style={[styles.hint, { color: theme.muted }]}>{c.hint}</Text><MediaCard title={c.logo} uri={settings.data?.logo_url} shape="logo" choose={c.choose} remove={c.remove} busy={update.isPending} onChoose={() => void select('logo_url')} onRemove={() => update.mutate({ key: 'logo_url', value: null })} /><MediaCard title={c.cover} uri={settings.data?.cover_url} shape="cover" choose={c.choose} remove={c.remove} busy={update.isPending} onChoose={() => void select('cover_url')} onRemove={() => update.mutate({ key: 'cover_url', value: null })} /></ScrollView></SafeAreaView>;
}
function MediaCard({ title, uri, shape, choose, remove, busy, onChoose, onRemove }: { title: string; uri?: string | null; shape: 'logo' | 'cover'; choose: string; remove: string; busy: boolean; onChoose: () => void; onRemove: () => void }) {
  const { theme } = useApp();
  return <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text><View style={[shape === 'logo' ? styles.logoPreview : styles.coverPreview, { backgroundColor: theme.plumSoft }]}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} cachePolicy="none" /> : <VizitIcon ios="photo" android="image" color={theme.plum} size={32} />}</View><Pressable disabled={busy} onPress={onChoose} style={[styles.primary, { backgroundColor: theme.plum }]}>{busy ? <ActivityIndicator color="#FFF" /> : <><VizitIcon ios="photo.on.rectangle" android="photo_library" color="#FFF" size={19} /><Text style={styles.white}>{choose}</Text></>}</Pressable>{uri ? <Pressable disabled={busy} onPress={onRemove} style={[styles.remove, { borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{remove}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, content: { padding: 18, paddingBottom: 44, gap: 13 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 43, height: 43, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, fontSize: 25, fontWeight: '900' }, hint: { fontSize: 13, lineHeight: 19 }, card: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 11 }, cardTitle: { fontSize: 17, fontWeight: '900' }, logoPreview: { width: 120, height: 120, borderRadius: 10, overflow: 'hidden', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, coverPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, primary: { height: 52, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, white: { color: '#FFF', fontWeight: '900' }, remove: { height: 48, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, errorTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' }, errorText: { fontSize: 12, textAlign: 'center' }, retry: { minHeight: 48, paddingHorizontal: 22, borderRadius: 9, alignItems: 'center', justifyContent: 'center' } });