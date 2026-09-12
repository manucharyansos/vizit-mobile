import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';

type MapKitModule = typeof import('expo-yandex-mapkit');
type Point = { latitude: number; longitude: number };

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (point: Point) => void;
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
  const latitude = nested.latitude;
  const longitude = nested.longitude;
  return finite(latitude) && finite(longitude) ? { latitude, longitude } : null;
}

export function LocationPicker({ latitude, longitude, onChange, height = 238 }: Props) {
  const { locale, mode, theme } = useApp();
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;
  const [mapKit, setMapKit] = useState<MapKitModule | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const point = useMemo<Point>(() => ({
    latitude: finite(latitude) ? latitude : 40.1772,
    longitude: finite(longitude) ? longitude : 44.50349,
  }), [latitude, longitude]);

  useEffect(() => {
    let active = true;
    if (!apiKey) return () => { active = false; };

    void import('expo-yandex-mapkit')
      .then(async (module) => {
        await module.initialize(apiKey);
        if (active) setMapKit(module);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (__DEV__) console.warn('[Vizit MapKit] location picker unavailable', error);
        if (active) {
          setMapKit(null);
          setMapError(message);
        }
      });

    return () => { active = false; };
  }, [apiKey]);

  const fallback = !apiKey
    ? locale === 'hy' ? 'Yandex MapKit API key-ը բացակայում է։' : locale === 'ru' ? 'Не найден ключ Yandex MapKit.' : 'Yandex MapKit API key is missing.'
    : mapError
      ? locale === 'hy' ? `Yandex MapKit-ը չբացվեց․ ${mapError}` : locale === 'ru' ? `Yandex MapKit не открылся: ${mapError}` : `Yandex MapKit failed to open: ${mapError}`
      : locale === 'hy' ? 'Yandex քարտեզը բեռնվում է…' : locale === 'ru' ? 'Yandex-карта загружается…' : 'Loading Yandex MapKit…';

  if (!apiKey || !mapKit) {
    return <View style={[styles.fallback, { height, backgroundColor: theme.map, borderColor: theme.border }]}><View style={[styles.mapBadge, { backgroundColor: theme.accentSoft }]}><Text style={[styles.brand, { color: theme.accentText }]}>Yandex MapKit</Text></View><Text style={[styles.hint, { color: theme.muted }]}>{fallback}</Text>{finite(latitude) && finite(longitude) ? <Text style={[styles.coords, { color: theme.text }]}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text> : null}</View>;
  }

  const { YandexMapView, Marker } = mapKit;
  const select = (event: unknown) => {
    const selected = pointFromEvent(event);
    if (selected) onChange(selected);
  };
  const instruction = locale === 'hy' ? 'Սեղմեք քարտեզի վրա՝ կետը ընտրելու համար' : locale === 'ru' ? 'Нажмите на карту, чтобы выбрать точку' : 'Tap the map to choose the exact point';

  return <View style={[styles.mapWrap, { height, borderColor: theme.border }]}>
    <YandexMapView
      style={StyleSheet.absoluteFill}
      nightMode={mode === 'dark'}
      showUserPosition={false}
      followUser={false}
      cameraPosition={{ latitude: point.latitude, longitude: point.longitude, zoom: 15, azimuth: 0, tilt: 0 }}
      onMapPress={select}
    >
      <Marker point={point}>
        <View style={[styles.pin, { backgroundColor: theme.primary, borderColor: theme.surfaceElevated }]}><Text style={[styles.pinText, { color: theme.onPrimary }]}>V</Text></View>
      </Marker>
    </YandexMapView>
    <View pointerEvents="none" style={[styles.instruction, ui.shadow.floating, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, shadowColor: theme.shadow }]}><Text style={[styles.instructionText, { color: theme.text }]}>{instruction}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  mapWrap: { width: '100%', overflow: 'hidden', borderRadius: ui.radius.large, borderWidth: 1 },
  fallback: { width: '100%', borderRadius: ui.radius.large, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: ui.spacing.lg },
  mapBadge: { borderRadius: ui.radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginBottom: ui.spacing.sm },
  brand: { fontSize: 13, fontWeight: '900' },
  hint: { ...ui.type.caption, textAlign: 'center' },
  coords: { marginTop: ui.spacing.sm, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pin: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  pinText: { fontWeight: '900' },
  instruction: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: ui.radius.medium, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 12, opacity: 0.96 },
  instructionText: { textAlign: 'center', fontSize: 11, lineHeight: 15, fontWeight: '800' },
});
