import { StyleSheet, Text, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import type { BusinessMapProps } from './business-map.types';
import { useApp } from '@/providers/app-provider';
export function BusinessMap({ businesses }: BusinessMapProps) { const { theme, locale } = useApp(); return <View style={[styles.box, { backgroundColor: theme.map }]}><View style={[styles.badge, { backgroundColor: theme.accentSoft }]}><Text style={[styles.brand, { color: theme.accentText }]}>Vizit · {businesses.length}</Text></View><Text style={[styles.hint, { color: theme.muted }]}>{locale === 'hy' ? 'Ընտրիր բիզնեսը ստորև ցանկից' : locale === 'ru' ? 'Выберите бизнес в списке ниже' : 'Choose a business from the list below'}</Text></View>; }
const styles = StyleSheet.create({ box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ui.spacing.sm, padding: ui.spacing.xl }, badge: { borderRadius: ui.radius.pill, paddingHorizontal: 14, paddingVertical: 8 }, brand: { fontSize: 13, fontWeight: '900' }, hint: ui.type.body });
