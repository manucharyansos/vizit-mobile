import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { PremiumButton } from './premium-ui';
import { VizitIcon } from './vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { rentalCopy } from '@/i18n/rentals';
import { useApp } from '@/providers/app-provider';
import { PUBLIC_WEB_URL } from '@/services/api/client';

export function LegalConsent({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const { theme, locale, t } = useApp();
  const c = rentalCopy[locale];
  const open = (path: string) => void Linking.openURL(PUBLIC_WEB_URL + path).catch(() => Alert.alert(t('loadError')));
  return <View style={styles.stack}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={c.consent} accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.consent}>
      <VizitIcon ios={checked ? 'checkmark.square.fill' : 'square'} android={checked ? 'check_box' : 'check_box_outline_blank'} color={checked ? theme.accentText : theme.muted} size={24} />
      <Text style={[ui.type.body, styles.flex, { color: theme.textSecondary }]}>{c.consent}</Text>
    </Pressable>
    <View style={styles.links}><PremiumButton title={c.terms} tone="ghost" compact onPress={() => open('/terms')} /><PremiumButton title={c.privacy} tone="ghost" compact onPress={() => open('/privacy-policy')} /></View>
  </View>;
}
const styles = StyleSheet.create({ stack: { gap: 8 }, flex: { flex: 1 }, consent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: ui.touchTarget }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
