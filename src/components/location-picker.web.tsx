import { StyleSheet, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { LocationCoordinates } from './location-coordinates';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (point: { latitude: number; longitude: number }) => void;
  height?: number;
};

export function LocationPicker({ latitude, longitude, onChange, height = 238 }: Props) {
  const { theme } = useApp();
  return <View style={[styles.root, { minHeight: height, backgroundColor: theme.map, borderColor: theme.border }]}><LocationCoordinates latitude={latitude} longitude={longitude} onChange={onChange} /></View>;
}

const styles = StyleSheet.create({
  root: { width: '100%', borderRadius: ui.radius.large, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: ui.spacing.lg },
  badge: { borderRadius: ui.radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginBottom: ui.spacing.sm },
  brand: { fontSize: 13, fontWeight: '900' },
  hint: { ...ui.type.caption, textAlign: 'center' },
  coords: { marginTop: ui.spacing.sm, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
