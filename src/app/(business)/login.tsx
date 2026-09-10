import { useMutation } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';

const copy = {
  hy: { title: 'Բիզնեսի մուտք', subtitle: 'Կառավարեք օրացույցը և ամրագրումները', email: 'Էլ․ փոստ', password: 'Գաղտնաբառ', submit: 'Մուտք գործել', registerHint: 'Դեռ չունե՞ք բիզնես հաշիվ', register: 'Գրանցել բիզնես', error: 'Մուտքը չհաջողվեց։ Ստուգեք տվյալները։' },
  ru: { title: 'Вход для бизнеса', subtitle: 'Управляйте календарём и записями', email: 'Эл. почта', password: 'Пароль', submit: 'Войти', registerHint: 'Ещё нет бизнес-аккаунта?', register: 'Зарегистрировать бизнес', error: 'Не удалось войти. Проверьте данные.' },
  en: { title: 'Business sign in', subtitle: 'Manage your calendar and bookings', email: 'Email', password: 'Password', submit: 'Sign in', registerHint: 'No business account yet?', register: 'Register a business', error: 'Sign-in failed. Check your details.' },
};

export default function BusinessLogin() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({
    mutationFn: () => businessApi.login(email.trim(), password),
    onSuccess: (user) => router.replace((user.needs_onboarding ? '/(business)/admin' : '/(business)/today') as Href),
    onError: () => Alert.alert(c.error),
  });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={[styles.glow, { backgroundColor: theme.plumSoft }]} />
    <Pressable accessibilityRole="button" onPress={() => router.replace('/(customer)/profile' as Href)} style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable>
    <View style={styles.intro}><View style={[styles.brandMark, { backgroundColor: theme.plum }]}><VizitIcon ios="briefcase.fill" android="business_center" color="#FFFFFF" size={28} /></View><Text style={[styles.brand, { color: theme.gold }]}>VIZIT BUSINESS</Text><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text></View>
    <View style={[styles.card, { backgroundColor: theme.surfaceRaised, shadowColor: theme.shadow, borderColor: theme.border }]}><TextInput value={email} onChangeText={setEmail} placeholder={c.email} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={theme.muted} style={[styles.field, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /><TextInput value={password} onChangeText={setPassword} placeholder={c.password} secureTextEntry placeholderTextColor={theme.muted} style={[styles.field, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /><Pressable disabled={!email || !password || login.isPending} onPress={() => login.mutate()} style={({ pressed }) => [styles.button, { backgroundColor: theme.plum, opacity: !email || !password ? 0.45 : pressed ? 0.88 : 1 }]}>{login.isPending ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.buttonText}>{c.submit}</Text><VizitIcon ios="arrow.right" android="arrow_forward" color="#FFFFFF" size={19} /></>}</Pressable></View>
    <Text style={[styles.registerHint, { color: theme.muted }]}>{c.registerHint}</Text>
    <Pressable onPress={() => router.push('/(business)/register' as Href)} style={[styles.registerButton, { borderColor: theme.plum }]}><VizitIcon ios="building.2.fill" android="domain_add" color={theme.plum} size={19} /><Text style={[styles.registerText, { color: theme.plum }]}>{c.register}</Text></Pressable>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: 20, overflow: 'hidden' }, glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -130, right: -100 }, back: { position: 'absolute', top: 55, left: 20, width: 43, height: 43, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, intro: { alignItems: 'center', marginBottom: 24 }, brandMark: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, brand: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6 }, title: { fontSize: 29, fontWeight: '900', letterSpacing: -0.55, marginTop: 8 }, subtitle: { fontSize: 14, marginTop: 7 }, card: { padding: 18, borderRadius: 24, gap: 12, borderWidth: 1, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3 }, field: { height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, fontSize: 16 }, button: { height: 55, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 5 }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '900' }, registerHint: { textAlign: 'center', marginTop: 21, fontSize: 13 }, registerButton: { height: 52, borderWidth: 1.5, borderRadius: 17, marginTop: 9, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, registerText: { fontSize: 15, fontWeight: '900' } });
