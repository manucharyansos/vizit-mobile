import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import YaMap, { Marker } from 'react-native-yamap';
import { PublicBusiness } from '@/services/api/public';
import { useApp } from '@/providers/app-provider';

export function BusinessMap({ businesses, onSelect }: { businesses: PublicBusiness[]; onSelect: (business: PublicBusiness) => void }) {
  const { mode, theme } = useApp(); const apiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY; const [ready, setReady] = useState(false);
  useEffect(() => { if (!apiKey) return; YaMap.init(apiKey).then(() => setReady(true)).catch(() => setReady(false)); }, [apiKey]);
  const pins = businesses.flatMap((business) => { const location = business.locations[0]; return Number.isFinite(location?.lat) && Number.isFinite(location?.lng) ? [{ business, lat: Number(location.lat), lon: Number(location.lng) }] : []; });
  if (!apiKey || !ready) return <View style={[styles.fallback, { backgroundColor: theme.map }]}><Text style={[styles.fallbackTitle, { color: theme.plum }]}>Yandex MapKit</Text><Text style={{ color: theme.muted, textAlign: 'center' }}>Development build + API key required</Text></View>;
  return <YaMap style={StyleSheet.absoluteFill} nightMode={mode === 'dark'} initialRegion={{ lat: pins[0]?.lat ?? 40.1872, lon: pins[0]?.lon ?? 44.5152, zoom: 12, azimuth: 0, tilt: 0 }}>{pins.map(({ business, lat, lon }) => <Marker key={`${business.business_id}-${lat}-${lon}`} point={{ lat, lon }} onPress={() => onSelect(business)}><Pressable style={[styles.pin, { backgroundColor: theme.plum }]}><Text style={styles.pinText}>V</Text></Pressable></Marker>)}</YaMap>;
}
const styles = StyleSheet.create({ fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, fallbackTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8 }, pin: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, pinText: { color: '#FFF', fontWeight: '900' } });
