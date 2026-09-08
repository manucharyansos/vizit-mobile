import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BusinessMap } from '@/components/business-map';
import { useApp } from '@/providers/app-provider';
import { publicApi } from '@/services/api/public';
import { VizitIcon } from '@/components/vizit-icon';

export default function MapScreen() {
  const { locale, theme } = useApp(); const businesses = useQuery({ queryKey: ['businesses', locale], queryFn: () => publicApi.businesses({ locale }) });
  const title = locale === 'hy' ? 'Բիզնեսները քարտեզում' : locale === 'ru' ? 'Бизнесы на карте' : 'Businesses on the map';
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable><View style={styles.titleRow}><VizitIcon ios="map.fill" android="map" color={theme.plum} size={20} /><Text style={[styles.title, { color: theme.text }]}>{title}</Text></View><View style={styles.back} /></View>{businesses.isError ? <Pressable onPress={() => businesses.refetch()} style={[styles.error, { backgroundColor: theme.peachSoft }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{locale === 'hy' ? 'Չհաջողվեց բեռնել քարտեզը։ Փորձել կրկին' : locale === 'ru' ? 'Не удалось загрузить карту. Повторить' : 'Could not load the map. Try again'}</Text></Pressable> : <View style={styles.map}><BusinessMap businesses={businesses.data ?? []} onSelect={(business) => router.push({ pathname: '/business/[slug]', params: { slug: business.slug } })} /></View>}</SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, header: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, title: { fontSize: 16, fontWeight: '900' }, map: { flex: 1, overflow: 'hidden' }, error: { margin: 20, padding: 16, borderRadius: 18 } });
