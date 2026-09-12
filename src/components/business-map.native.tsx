import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { PublicBusiness } from '@/services/api/public';
import { useApp } from '@/providers/app-provider';

type MapKitModule = typeof import('expo-yandex-mapkit');

export function BusinessMap({ businesses, onSelect }: { businesses: PublicBusiness[]; onSelect: (business: PublicBusiness, locationId?: number) => void }) {
  const { locale, mode, theme } = useApp();
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;
  const [mapKit, setMapKit] = useState<MapKitModule | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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
        if (__DEV__) console.warn('[Vizit MapKit] business map unavailable', error);
        if (active) {
          setMapKit(null);
          setMapError(message);
        }
      });

    return () => { active = false; };
  }, [apiKey]);

  const pins = businesses.flatMap((business) => {
    const locations = business.locations.filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng));
    return locations.map((location) => ({
      business,
      latitude: Number(location.lat),
      longitude: Number(location.lng),
      locationId: location.id,
    }));
  });

  if (!apiKey || !mapKit) {
    const hint = !apiKey
      ? locale === 'hy'
        ? 'Ավելացրեք Yandex MapKit Mobile SDK բանալին։'
        : locale === 'ru'
          ? 'Добавьте ключ Yandex MapKit Mobile SDK.'
          : 'Add the Yandex MapKit Mobile SDK key.'
      : mapError
        ? locale === 'hy'
          ? `Yandex MapKit-ը չբացվեց․ ${mapError}`
          : locale === 'ru'
            ? `Yandex MapKit не открылся: ${mapError}`
            : `Yandex MapKit failed to open: ${mapError}`
        : locale === 'hy'
          ? 'Քարտեզը նախապատրաստվում է…'
          : locale === 'ru'
            ? 'Карта загружается…'
            : 'Preparing the map…';

    return (
      <View style={[styles.fallback, { backgroundColor: theme.map }]}>
        <View style={[styles.fallbackBadge, { backgroundColor: theme.accentSoft }]}><Text style={[styles.fallbackTitle, { color: theme.accentText }]}>Yandex MapKit</Text></View>
        <Text style={[styles.fallbackHint, { color: theme.muted }]}>{hint}</Text>
      </View>
    );
  }

  const { YandexMapView, Marker } = mapKit;

  return (
    <YandexMapView
      style={StyleSheet.absoluteFill}
      nightMode={mode === 'dark'}
      cameraPosition={{ latitude: pins[0]?.latitude ?? 40.1872, longitude: pins[0]?.longitude ?? 44.5152, zoom: 12, azimuth: 0, tilt: 0 }}
    >
      {pins.map(({ business, latitude, longitude, locationId }) => (
        <Marker
          key={`${business.business_id}-${locationId}-${latitude}-${longitude}`}
          point={{ latitude, longitude }}
          handled
          onPress={() => onSelect(business, locationId)}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={business.name} style={[styles.pin, ui.shadow.floating, { backgroundColor: theme.primary, borderColor: theme.surfaceElevated, shadowColor: theme.shadow }]}>
            <Text style={[styles.pinText, { color: theme.onPrimary }]}>V</Text>
          </Pressable>
        </Marker>
      ))}
    </YandexMapView>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ui.spacing.xl },
  fallbackBadge: { borderRadius: ui.radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginBottom: ui.spacing.sm },
  fallbackTitle: { fontSize: 14, fontWeight: '900' },
  fallbackHint: { ...ui.type.body, textAlign: 'center' },
  pin: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  pinText: { fontWeight: '900' },
});
