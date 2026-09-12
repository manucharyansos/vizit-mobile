import { router } from 'expo-router';
import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from './vizit-icon';
import { BrandLockup, IconButton, Surface } from './premium-ui';

export function ClientAuthShell({ title, subtitle, icon = 'person.crop.circle.badge.plus', children }: PropsWithChildren<{ title: string; subtitle: string; icon?: 'person.crop.circle.badge.plus' | 'key.fill' }>) {
  const { theme, t } = useApp();
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={styles.topBar}><IconButton accessibilityLabel={t('back')} ios="chevron.left" android="chevron_left" onPress={() => router.back()} /><BrandLockup compact /></View><View style={styles.intro}><View style={[styles.icon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios={icon} android={icon === 'key.fill' ? 'key' : 'person_add'} color={theme.accentText} size={27} /></View><Text style={[styles.title, { color: theme.text }]}>{title}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text></View><Surface style={styles.card} elevated>{children}</Surface></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { flexGrow: 1, padding: ui.screenGutter, justifyContent: 'center' }, topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }, intro: { alignItems: 'flex-start', marginBottom: 22 }, icon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, title: { ...ui.type.pageTitle }, subtitle: { ...ui.type.body, maxWidth: 340, marginTop: 7 }, card: { padding: 18, gap: 13 } });
