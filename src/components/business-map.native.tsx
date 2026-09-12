import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { validPoint } from '@/services/geo';
import type { BusinessMapProps } from './business-map.types';
import type { YandexMapViewRef } from 'expo-yandex-mapkit';

type MapKitModule = typeof import('expo-yandex-mapkit');

export function BusinessMap({ businesses, onSelect, selectedLocationId, userPosition, focus, onChooseOrigin }: BusinessMapProps) {
  const { locale, mode, theme } = useApp();
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;
  const [mapKit, setMapKit] = useState<MapKitModule | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<YandexMapViewRef>(null);
  const [ready, setReady] = useState(false);

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

  const pins = useMemo(() => businesses.flatMap((business) => {
    const locations = business.locations.filter((location) => validPoint(location.lat, location.lng));
    return locations.map((location) => ({
      business,
      latitude: Number(location.lat),
      longitude: Number(location.lng),
      locationId: location.id,
    }));
  }), [businesses]);
  const initialCamera = useMemo(() => ({ latitude: 40.1872, longitude: 44.5152, zoom: 11, azimuth: 0, tilt: 0 }), []);
  useEffect(() => {
    if (!ready) return;
    if (focus) void mapRef.current?.setCenter({ ...focus, zoom: 14 }).catch(() => undefined);
    else if (pins.length) void mapRef.current?.fitMarkers(pins.map((pin) => ({ latitude: pin.latitude, longitude: pin.longitude })), { edgePadding: { top: 60, left: 35, right: 60, bottom: 45 } }).catch(() => undefined);
  }, [focus, ready, pins]);

  if (!apiKey || !mapKit) {
    const loading = apiKey && !mapError;
    const hint = loading ? (locale === 'hy' ? 'Քարտեզը բեռնվում է…' : locale === 'ru' ? 'Карта загружается…' : 'Loading map…') : (locale === 'hy' ? 'Քարտեզը հասանելի չէ։ Ընտրիր բիզնեսը ցանկից կամ բացիր երթուղին։' : locale === 'ru' ? 'Карта недоступна. Выберите бизнес в списке или откройте маршрут.' : 'Map unavailable. Choose a business from the list or open directions.');

    return (
      <View style={[styles.fallback, { backgroundColor: theme.map }]}>
        {loading ? <ActivityIndicator color={theme.accent} /> : null}
        <Text style={[styles.fallbackHint, { color: theme.muted }]}>{hint}</Text>
      </View>
    );
  }

  const { YandexMapView, Marker } = mapKit;

  return (
    <YandexMapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      nightMode={mode === 'dark'}
      cameraPosition={initialCamera}
      onMapReady={() => setReady(true)}
      onMapLongPress={(event) => onChooseOrigin?.(event.nativeEvent.point)}
      logoPosition={{ horizontal: 'left', vertical: 'bottom' }}
    >
      {pins.map(({ business, latitude, longitude, locationId }) => (
        <Marker
          key={`${business.business_id}-${locationId}-${latitude}-${longitude}`}
          point={{ latitude, longitude }}
          handled
          onPress={() => onSelect(business, locationId)}
        >
          <View accessibilityLabel={business.name} style={[styles.pin, ui.shadow.floating, { backgroundColor: selectedLocationId === locationId ? theme.accentSoft : theme.primary, borderColor: selectedLocationId === locationId ? theme.accent : theme.surfaceElevated, shadowColor: theme.shadow }]}>
            <Text style={[styles.pinText, { color: selectedLocationId === locationId ? theme.accentText : theme.onPrimary }]}>V</Text>
          </View>
        </Marker>
      ))}
      {userPosition ? <Marker point={userPosition} zIndex={20}><View style={[styles.origin, { backgroundColor: theme.accent, borderColor: theme.surfaceElevated }]} /></Marker> : null}
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
  origin: { width: 22, height: 22, borderRadius: 11, borderWidth: 4 },
});
