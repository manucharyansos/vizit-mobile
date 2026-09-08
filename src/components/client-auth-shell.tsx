import { router } from 'expo-router';
import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from './vizit-icon';

export function ClientAuthShell({ title, subtitle, icon = 'person.crop.circle.badge.plus', children }: PropsWithChildren<{ title: string; subtitle: string; icon?: 'person.crop.circle.badge.plus' | 'key.fill' }>) {
  const { theme, t } = useApp();
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()} style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable><View style={styles.intro}><View style={[styles.icon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios={icon} android={icon === 'key.fill' ? 'key' : 'person_add'} color={theme.plum} size={29} /></View><Text style={[styles.title, { color: theme.text }]}>{title}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text></View><View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>{children}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { flexGrow: 1, padding: 20, justifyContent: 'center' }, back: { position: 'absolute', top: 8, left: 20, width: 43, height: 43, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, intro: { alignItems: 'center', marginTop: 60, marginBottom: 22 }, icon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }, title: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.55, textAlign: 'center' }, subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 320, marginTop: 7 }, card: { padding: 18, borderRadius: 24, gap: 11, shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 } });
