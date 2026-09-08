import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/providers/app-provider';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (point: { latitude: number; longitude: number }) => void;
  height?: number;
};

export function LocationPicker({ latitude, longitude, height = 238 }: Props) {
  const { locale, theme } = useApp();
  const hint = locale === 'hy'
    ? 'Yandex MapKit native picker-ը հասանելի է Android/iOS development build-ում։'
    : locale === 'ru'
      ? 'Нативный Yandex MapKit picker доступен в Android/iOS development build.'
      : 'The native Yandex MapKit picker is available in Android/iOS development builds.';
  return <View style={[styles.root, { height, backgroundColor: theme.map, borderColor: theme.border }]}><Text style={[styles.brand, { color: theme.plum }]}>Yandex MapKit</Text><Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text>{typeof latitude === 'number' && typeof longitude === 'number' ? <Text style={[styles.coords, { color: theme.text }]}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  root: { width: '100%', borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  brand: { fontSize: 16, fontWeight: '900', marginBottom: 7 },
  hint: { textAlign: 'center', fontSize: 12, lineHeight: 18 },
  coords: { marginTop: 9, fontSize: 11, fontWeight: '700' },
});
