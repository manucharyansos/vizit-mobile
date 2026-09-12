import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton, StateCard } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { TranslationKey } from '@/i18n/translations';
import { useApp } from '@/providers/app-provider';
export function PlaceholderScreen({ titleKey, bodyKey, actionKey, onAction }: { titleKey: TranslationKey; bodyKey: TranslationKey; actionKey?: TranslationKey; onAction?: () => void }) { const { t, theme } = useApp(); return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><StateCard title={t(titleKey)} message={t(bodyKey)} action={actionKey && onAction ? <PremiumButton title={t(actionKey)} onPress={onAction} /> : undefined} /></SafeAreaView>; }
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: ui.screenGutter } });
