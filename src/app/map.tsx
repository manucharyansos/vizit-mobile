import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BusinessMap } from '@/components/business-map';
import { useApp } from '@/providers/app-provider';
import { publicApi, type PublicBusiness } from '@/services/api/public';
import { safeBack } from '@/services/navigation';
import { VizitIcon } from '@/components/vizit-icon';

export default function MapScreen() {
  const { locale, theme } = useApp();
  const [selected, setSelected] = useState<PublicBusiness | null>(null);
  const businesses = useQuery({ queryKey: ['businesses', locale], queryFn: () => publicApi.businesses({ locale }) });
  const title = locale === 'hy' ? 'Բիզնեսները քարտեզում' : locale === 'ru' ? 'Бизнесы на карте' : 'Businesses on the map';
  const book = locale === 'hy' ? 'Ամրագրել' : locale === 'ru' ? 'Записаться' : 'Book';
  const details = locale === 'hy' ? 'Դիտել էջը' : locale === 'ru' ? 'Открыть страницу' : 'View profile';
  const address = selected?.locations?.[0]?.address ?? selected?.address ?? '';

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => safeBack('/(customer)/discover')} style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable>
      <View style={styles.titleRow}><VizitIcon ios="map.fill" android="map" color={theme.plum} size={20} /><Text style={[styles.title, { color: theme.text }]}>{title}</Text></View>
      <View style={styles.back} />
    </View>
    {businesses.isError ? <Pressable onPress={() => businesses.refetch()} style={[styles.error, { backgroundColor: theme.peachSoft }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{locale === 'hy' ? 'Չհաջողվեց բեռնել քարտեզը։ Փորձել կրկին' : locale === 'ru' ? 'Не удалось загрузить карту. Повторить' : 'Could not load the map. Try again'}</Text></Pressable> : <View style={styles.map}>
      <BusinessMap businesses={businesses.data ?? []} onSelect={setSelected} />
      {selected ? <View style={[styles.businessCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.businessCardTop}>
          <View style={styles.businessText}>
            <Text numberOfLines={1} style={[styles.businessName, { color: theme.text }]}>{selected.name}</Text>
            {selected.category_name ? <Text numberOfLines={1} style={[styles.businessMeta, { color: theme.muted }]}>{selected.category_name}</Text> : null}
            {address ? <View style={styles.addressRow}><VizitIcon ios="mappin.and.ellipse" android="location_on" color={theme.muted} size={15} /><Text numberOfLines={2} style={[styles.businessAddress, { color: theme.muted }]}>{address}</Text></View> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={[styles.close, { backgroundColor: theme.background }]}><VizitIcon ios="xmark" android="close" color={theme.muted} size={18} /></Pressable>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: selected.slug } })} style={[styles.secondary, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '900' }}>{details}</Text></Pressable>
          <Pressable onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: selected.slug, ...(selected.locations?.[0]?.id ? { locationId: String(selected.locations[0].id) } : {}) } })} style={[styles.primary, { backgroundColor: theme.plum }]}><Text style={styles.primaryText}>{book}</Text><VizitIcon ios="calendar.badge.plus" android="event_available" color="#FFFFFF" size={18} /></Pressable>
        </View>
      </View> : null}
    </View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 16, fontWeight: '900' },
  map: { flex: 1, overflow: 'hidden' },
  error: { margin: 20, padding: 16, borderRadius: 18 },
  businessCard: { position: 'absolute', left: 14, right: 14, bottom: 18, borderWidth: 1, borderRadius: 16, padding: 14, gap: 12, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  businessCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  businessText: { flex: 1 },
  businessName: { fontSize: 18, fontWeight: '900' },
  businessMeta: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  businessAddress: { flex: 1, fontSize: 12, lineHeight: 17 },
  close: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  secondary: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  primary: { flex: 1, minHeight: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
});