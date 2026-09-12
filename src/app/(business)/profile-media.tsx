import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, StateCard, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
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

  if (settings.isLoading) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} /></SafeAreaView>;
  if (settings.isError) return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><View style={styles.errorPage}><PageHeader eyebrow="Vizit Pro" title={c.title} onBack={() => safeBack('/(business)/more')} backLabel={c.title} /><StateCard title={c.loadError} message={apiErrorMessage(settings.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void settings.refetch()} />} /></View></SafeAreaView>;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><PageHeader eyebrow="Vizit Pro" title={c.title} subtitle={c.hint} onBack={() => safeBack('/(business)/more')} backLabel={c.title} /><MediaCard title={c.logo} uri={settings.data?.logo_url} shape="logo" choose={c.choose} remove={c.remove} busy={update.isPending} onChoose={() => void select('logo_url')} onRemove={() => update.mutate({ key: 'logo_url', value: null })} /><MediaCard title={c.cover} uri={settings.data?.cover_url} shape="cover" choose={c.choose} remove={c.remove} busy={update.isPending} onChoose={() => void select('cover_url')} onRemove={() => update.mutate({ key: 'cover_url', value: null })} /></ScrollView></SafeAreaView>;
}
function MediaCard({ title, uri, shape, choose, remove, busy, onChoose, onRemove }: { title: string; uri?: string | null; shape: 'logo' | 'cover'; choose: string; remove: string; busy: boolean; onChoose: () => void; onRemove: () => void }) {
  const { theme } = useApp();
  return <Surface elevated style={styles.card}><View style={styles.cardHeading}><Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.format, { color: theme.faint }]}>{shape === 'logo' ? '1:1' : '16:9'}</Text></View><View style={[shape === 'logo' ? styles.logoPreview : styles.coverPreview, { backgroundColor: theme.accentSubtle, borderColor: theme.border }]}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} cachePolicy="none" /> : <VizitIcon ios="photo" android="image" color={theme.accentText} size={32} />}</View><PremiumButton title={choose} loading={busy} onPress={onChoose} icon={{ ios: 'photo.on.rectangle', android: 'photo_library' }} />{uri ? <PremiumButton title={remove} disabled={busy} tone="danger" onPress={onRemove} /> : null}</Surface>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorPage: { padding: ui.screenGutter, gap: ui.spacing.xl },
  content: { padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.md },
  card: { gap: ui.spacing.sm },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: ui.type.sectionTitle,
  format: { ...ui.type.caption, letterSpacing: 1 },
  logoPreview: { width: 132, height: 132, borderRadius: ui.radius.large, borderWidth: 1, overflow: 'hidden', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  coverPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: ui.radius.medium, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
