import { StyleSheet, Text, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { PublicBusiness } from '@/services/api/public';
import { useApp } from '@/providers/app-provider';
export function BusinessMap({ businesses }: { businesses: PublicBusiness[]; onSelect: (business: PublicBusiness, locationId?: number) => void }) { const { theme } = useApp(); return <View style={[styles.box, { backgroundColor: theme.map }]}><View style={[styles.badge, { backgroundColor: theme.accentSoft }]}><Text style={[styles.brand, { color: theme.accentText }]}>Yandex MapKit · {businesses.length}</Text></View><Text style={[styles.hint, { color: theme.muted }]}>Native development build only</Text></View>; }
const styles = StyleSheet.create({ box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ui.spacing.sm, padding: ui.spacing.xl }, badge: { borderRadius: ui.radius.pill, paddingHorizontal: 14, paddingVertical: 8 }, brand: { fontSize: 13, fontWeight: '900' }, hint: ui.type.body });
