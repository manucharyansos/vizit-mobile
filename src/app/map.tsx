import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BusinessMap } from '@/components/business-map';
import { IconButton, PageHeader, PremiumButton, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { publicApi, type PublicBusiness } from '@/services/api/public';
import { safeBack } from '@/services/navigation';
import { VizitIcon } from '@/components/vizit-icon';

type SelectedMapBusiness = { business: PublicBusiness; locationId?: number };

export default function MapScreen() {
  const { locale, theme } = useApp();
  const [selected, setSelected] = useState<SelectedMapBusiness | null>(null);
  const businesses = useQuery({ queryKey: ['businesses', locale], queryFn: () => publicApi.businesses({ locale }) });
  const title = locale === 'hy' ? 'Բիզնեսները քարտեզում' : locale === 'ru' ? 'Бизнесы на карте' : 'Businesses on the map';
  const book = locale === 'hy' ? 'Ամրագրել' : locale === 'ru' ? 'Записаться' : 'Book';
  const details = locale === 'hy' ? 'Դիտել էջը' : locale === 'ru' ? 'Открыть страницу' : 'View profile';
  const close = locale === 'hy' ? 'Փակել' : locale === 'ru' ? 'Закрыть' : 'Close';
  const error = locale === 'hy' ? 'Չհաջողվեց բեռնել քարտեզը' : locale === 'ru' ? 'Не удалось загрузить карту' : 'Could not load the map';
  const retry = locale === 'hy' ? 'Կրկին փորձել' : locale === 'ru' ? 'Повторить' : 'Try again';
  const selectedLocation = selected?.locationId ? selected.business.locations.find((location) => location.id === selected.locationId) : selected?.business.locations?.[0];
  const address = selectedLocation?.address ?? selected?.business.address ?? '';

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={styles.header}><PageHeader eyebrow="Vizit" title={title} onBack={() => safeBack('/(customer)/discover')} backLabel={title} /></View>
    {businesses.isError ? <View style={styles.error}><StateCard title={error} tone="danger" action={<PremiumButton title={retry} tone="secondary" onPress={() => void businesses.refetch()} />} /></View> : <View style={styles.map}>
      <BusinessMap businesses={businesses.data ?? []} onSelect={(business, locationId) => setSelected({ business, locationId })} />
      {selected ? <Surface elevated style={[styles.businessCard, { shadowColor: theme.shadow }]}>
        <View style={styles.businessCardTop}>
          <View style={styles.businessText}>
            <Text numberOfLines={1} style={[styles.businessName, { color: theme.text }]}>{selected.business.name}</Text>
            {selected.business.category_name ? <View style={styles.category}><StatusPill label={selected.business.category_name} tone="accent" /></View> : null}
            {address ? <View style={styles.addressRow}><VizitIcon ios="mappin.and.ellipse" android="location_on" color={theme.muted} size={15} /><Text numberOfLines={2} style={[styles.businessAddress, { color: theme.muted }]}>{address}</Text></View> : null}
          </View>
          <IconButton accessibilityLabel={close} ios="xmark" android="close" size={38} onPress={() => setSelected(null)} />
        </View>
        <View style={styles.actions}>
          <PremiumButton title={details} tone="secondary" onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: selected.business.slug } })} style={styles.flex} />
          <PremiumButton title={book} icon={{ ios: 'calendar.badge.plus', android: 'event_available' }} onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: selected.business.slug, ...(selectedLocation?.id ? { locationId: String(selectedLocation.id) } : {}) } })} style={styles.flex} />
        </View>
      </Surface> : null}
    </View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: ui.screenGutter, paddingVertical: ui.spacing.xs },
  map: { flex: 1, overflow: 'hidden' },
  error: { padding: ui.screenGutter },
  businessCard: { position: 'absolute', left: 14, right: 14, bottom: 18, padding: ui.spacing.md, gap: ui.spacing.sm, ...ui.shadow.floating },
  businessCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  businessText: { flex: 1 },
  businessName: ui.type.sectionTitle,
  category: { alignSelf: 'flex-start', marginTop: 5 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  businessAddress: { flex: 1, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: ui.spacing.xs },
  flex: { flex: 1 },
});
