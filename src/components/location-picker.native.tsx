import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/providers/app-provider';

type MapKitModule = typeof import('react-native-yamap');
type Point = { lat: number; lon: number };

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (point: { latitude: number; longitude: number }) => void;
  height?: number;
};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function pointFromEvent(value: unknown): Point | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const nativeEvent = record.nativeEvent && typeof record.nativeEvent === 'object'
    ? record.nativeEvent as Record<string, unknown>
    : null;
  const candidate = nativeEvent ?? record;
  const nested = candidate.point && typeof candidate.point === 'object'
    ? candidate.point as Record<string, unknown>
    : candidate;
  const lat = nested.lat;
  const lon = nested.lon;
  return finite(lat) && finite(lon) ? { lat, lon } : null;
}

export function LocationPicker({ latitude, longitude, onChange, height = 238 }: Props) {
  const { locale, mode, theme } = useApp();
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;
  const isExpoGo = Constants.expoGoConfig != null;
  const [mapKit, setMapKit] = useState<MapKitModule | null>(null);

  const point = useMemo<Point>(() => ({
    lat: finite(latitude) ? latitude : 40.1772,
    lon: finite(longitude) ? longitude : 44.50349,
  }), [latitude, longitude]);

  useEffect(() => {
    let active = true;
    if (!apiKey || isExpoGo) return () => { active = false; };

    void import('react-native-yamap')
      .then(async (module) => {
        await module.default.init(apiKey);
        if (active) setMapKit(module);
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('[Vizit MapKit] location picker unavailable', error);
        if (active) setMapKit(null);
      });

    return () => { active = false; };
  }, [apiKey, isExpoGo]);

  const fallback = isExpoGo
    ? locale === 'hy' ? 'Yandex քարտեզը հասանելի է development build-ում։ Հասցեն կարող եք պահպանել նաև առանց քարտեզի։' : locale === 'ru' ? 'Yandex-карта доступна в development build. Адрес можно сохранить и без карты.' : 'Yandex MapKit is available in a development build. You can still save the address without the map.'
    : !apiKey
      ? locale === 'hy' ? 'Yandex MapKit API key-ը բացակայում է։' : locale === 'ru' ? 'Не найден ключ Yandex MapKit.' : 'Yandex MapKit API key is missing.'
      : locale === 'hy' ? 'Yandex քարտեզը բեռնվում է…' : locale === 'ru' ? 'Yandex-карта загружается…' : 'Loading Yandex MapKit…';

  if (!apiKey || isExpoGo || !mapKit) {
    return <View style={[styles.fallback, { height, backgroundColor: theme.map, borderColor: theme.border }]}><Text style={[styles.brand, { color: theme.plum }]}>Yandex MapKit</Text><Text style={[styles.hint, { color: theme.muted }]}>{fallback}</Text>{finite(latitude) && finite(longitude) ? <Text style={[styles.coords, { color: theme.text }]}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text> : null}</View>;
  }

  const YaMap = mapKit.default;
  const Marker = mapKit.Marker;
  const select = (event: unknown) => {
    const selected = pointFromEvent(event);
    if (selected) onChange({ latitude: selected.lat, longitude: selected.lon });
  };
  const instruction = locale === 'hy' ? 'Սեղմեք քարտեզի վրա՝ կետը ընտրելու համար' : locale === 'ru' ? 'Нажмите на карту, чтобы выбрать точку' : 'Tap the map to choose the exact point';

  return <View style={[styles.mapWrap, { height, borderColor: theme.border }]}>
    <YaMap
      style={StyleSheet.absoluteFill}
      nightMode={mode === 'dark'}
      showUserPosition={false}
      followUser={false}
      initialRegion={{ lat: point.lat, lon: point.lon, zoom: 15, azimuth: 0, tilt: 0 }}
      onMapPress={select}
    >
      <Marker point={point}>
        <View style={[styles.pin, { backgroundColor: theme.plum }]}><Text style={styles.pinText}>V</Text></View>
      </Marker>
    </YaMap>
    <View pointerEvents="none" style={[styles.instruction, { backgroundColor: theme.surfaceRaised }]}><Text style={[styles.instructionText, { color: theme.text }]}>{instruction}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  mapWrap: { width: '100%', overflow: 'hidden', borderRadius: 10, borderWidth: 1 },
  fallback: { width: '100%', borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  brand: { fontSize: 16, fontWeight: '900', marginBottom: 7 },
  hint: { textAlign: 'center', fontSize: 12, lineHeight: 18 },
  coords: { marginTop: 9, fontSize: 11, fontWeight: '700' },
  pin: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#FFFFFF', fontWeight: '900' },
  instruction: { position: 'absolute', left: 10, right: 10, bottom: 10, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, opacity: 0.94 },
  instructionText: { textAlign: 'center', fontSize: 11, fontWeight: '800' },
});
