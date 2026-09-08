import { StyleSheet, Text, View } from 'react-native';
import { PublicBusiness } from '@/services/api/public';
import { useApp } from '@/providers/app-provider';
export function BusinessMap({ businesses }: { businesses: PublicBusiness[]; onSelect: (business: PublicBusiness) => void }) { const { theme } = useApp(); return <View style={[styles.box, { backgroundColor: theme.map }]}><Text style={{ color: theme.plum, fontWeight: '800' }}>Yandex MapKit · {businesses.length}</Text><Text style={{ color: theme.muted }}>Native development build only</Text></View>; }
const styles = StyleSheet.create({ box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 } });
