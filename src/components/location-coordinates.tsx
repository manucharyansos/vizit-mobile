import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PremiumButton, PremiumInput } from './premium-ui';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useApp } from '@/providers/app-provider';
import { ui } from '@/constants/vizit-theme';
import { validPoint } from '@/services/geo';

/** A usable location choice when the optional native map is unavailable. */
export function LocationCoordinates({ latitude, longitude, onChange }: { latitude?: number | null; longitude?: number | null; onChange: (point: { latitude: number; longitude: number }) => void }) {
  const { locale, theme } = useApp();
  const location = useDeviceLocation();
  const [lat, setLat] = useState<string>();
  const [lng, setLng] = useState<string>();
  const c = { hy: { gps: 'Օգտագործել իմ գտնվելու վայրը', lat: 'Լայնություն', lng: 'Երկայնություն', help: 'Ընտրեք ձեր գտնվելու վայրը կամ նշեք հասցեի կոորդինատները։', error: 'Վայրը չորոշվեց։ Կարող եք նշել կոորդինատները ստորև։' }, ru: { gps: 'Моё местоположение', lat: 'Широта', lng: 'Долгота', help: 'Выберите ваше местоположение или введите координаты адреса.', error: 'Не удалось определить место. Можно ввести координаты ниже.' }, en: { gps: 'Use my location', lat: 'Latitude', lng: 'Longitude', help: 'Use your location or enter the address coordinates.', error: 'Could not locate you. You can enter coordinates below.' } }[locale];
  const a = lat ?? (latitude == null ? '' : String(latitude));
  const b = lng ?? (longitude == null ? '' : String(longitude));
  const candidate = a.trim() && b.trim() ? validPoint(Number(a.replace(',', '.')), Number(b.replace(',', '.'))) : null;
  const edit = (a: string, b: string) => { setLat(a); setLng(b); };
  return <View style={styles.stack}>
    <Text style={[ui.type.caption, { color: theme.muted }]}>{c.help}</Text>
    <PremiumButton title={c.gps} tone="secondary" loading={location.loading} onPress={() => { void location.locate().then((point) => { if (point) { setLat(undefined); setLng(undefined); onChange(point); } }); }} />
    {location.error ? <Text accessibilityLiveRegion="polite" style={[ui.type.caption, { color: theme.danger }]}>{c.error}</Text> : null}
    <View style={styles.row}>
      <PremiumInput label={c.lat} value={lat ?? (latitude == null ? '' : String(latitude))} keyboardType="numbers-and-punctuation" onChangeText={(value) => edit(value, lng ?? (longitude == null ? '' : String(longitude)))} containerStyle={styles.flex} />
      <PremiumInput label={c.lng} value={lng ?? (longitude == null ? '' : String(longitude))} keyboardType="numbers-and-punctuation" onChangeText={(value) => edit(lat ?? (latitude == null ? '' : String(latitude)), value)} containerStyle={styles.flex} />
    </View>
    <PremiumButton title={locale === 'hy' ? 'Ընտրել նշված կետը' : locale === 'ru' ? 'Выбрать эту точку' : 'Use these coordinates'} tone="secondary" disabled={!candidate} onPress={() => { if (candidate) onChange(candidate); }} />
    {typeof latitude === 'number' && typeof longitude === 'number' ? <Text style={[ui.type.caption, { color: theme.accentText }]}>{locale === 'hy' ? 'Ընտրված կետը' : locale === 'ru' ? 'Выбранная точка' : 'Selected location'}: {latitude.toFixed(5)}, {longitude.toFixed(5)}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ stack: { alignSelf: 'stretch', gap: 12 }, row: { flexDirection: 'row', gap: 10 }, flex: { flex: 1, minWidth: 0 } });
