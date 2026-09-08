import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PublicBusiness } from '@/services/api/public';
import { useApp } from '@/providers/app-provider';

type MapKitModule = typeof import('react-native-yamap');

export function BusinessMap({ businesses, onSelect }: { businesses: PublicBusiness[]; onSelect: (business: PublicBusiness) => void }) {
  const { locale, mode, theme } = useApp();
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;
  const isExpoGo = Constants.expoGoConfig != null;
  const [mapKit, setMapKit] = useState<MapKitModule | null>(null);

  useEffect(() => {
    let active = true;

    if (!apiKey || isExpoGo) return () => { active = false; };

    void import('react-native-yamap')
      .then(async (module) => {
        await module.default.init(apiKey);
        if (active) setMapKit(module);
      })
      .catch(() => {
        if (active) setMapKit(null);
      });

    return () => { active = false; };
  }, [apiKey, isExpoGo]);

  const pins = businesses.flatMap((business) => {
    const location = business.locations[0];
    return Number.isFinite(location?.lat) && Number.isFinite(location?.lng)
      ? [{ business, lat: Number(location.lat), lon: Number(location.lng) }]
      : [];
  });

  if (!apiKey || isExpoGo || !mapKit) {
    const hint = isExpoGo
      ? locale === 'hy'
        ? 'Քարտեզը հասանելի է development build-ում։'
        : locale === 'ru'
          ? 'Карта доступна в development build.'
          : 'The map is available in a development build.'
      : !apiKey
        ? locale === 'hy'
          ? 'Ավելացրեք Yandex MapKit Mobile SDK բանալին։'
          : locale === 'ru'
            ? 'Добавьте ключ Yandex MapKit Mobile SDK.'
            : 'Add the Yandex MapKit Mobile SDK key.'
        : locale === 'hy'
          ? 'Քարտեզը նախապատրաստվում է…'
          : locale === 'ru'
            ? 'Карта загружается…'
            : 'Preparing the map…';

    return (
      <View style={[styles.fallback, { backgroundColor: theme.map }]}>
        <Text style={[styles.fallbackTitle, { color: theme.plum }]}>Yandex MapKit</Text>
        <Text style={[styles.fallbackHint, { color: theme.muted }]}>{hint}</Text>
      </View>
    );
  }

  const YaMap = mapKit.default;
  const Marker = mapKit.Marker;

  return (
    <YaMap
      style={StyleSheet.absoluteFill}
      nightMode={mode === 'dark'}
      initialRegion={{ lat: pins[0]?.lat ?? 40.1872, lon: pins[0]?.lon ?? 44.5152, zoom: 12, azimuth: 0, tilt: 0 }}
    >
      {pins.map(({ business, lat, lon }) => (
        <Marker key={`${business.business_id}-${lat}-${lon}`} point={{ lat, lon }} onPress={() => onSelect(business)}>
          <Pressable style={[styles.pin, { backgroundColor: theme.plum }]}>
            <Text style={styles.pinText}>V</Text>
          </Pressable>
        </Marker>
      ))}
    </YaMap>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  fallbackTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  fallbackHint: { textAlign: 'center' },
  pin: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#FFF', fontWeight: '900' },
});
