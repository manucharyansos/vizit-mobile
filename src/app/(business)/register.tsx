import { useMutation } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useExistingBusinessSession } from '@/hooks/use-existing-business-session';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';

const copy = {
  hy: { title: 'Գրանցել բիզնես', subtitle: 'Ստեղծիր սեփականատիրոջ հաշիվը և կառավարման տարածքը', business: 'Բիզնեսի անվանում', owner: 'Ձեր անունը', phone: 'Բիզնեսի հեռախոս', address: 'Հասցե', email: 'Էլ․ փոստ', password: 'Գաղտնաբառ՝ առնվազն 8 նիշ', confirm: 'Կրկնել գաղտնաբառը', services: 'Ծառայություններ', healthcare: 'Բժշկություն', submit: 'Ստեղծել բիզնես հաշիվ', login: 'Արդեն ունե՞ք հաշիվ։ Մուտք գործել', mismatch: 'Գաղտնաբառերը չեն համընկնում', failed: 'Գրանցումը չհաջողվեց։ Ստուգեք դաշտերը։', location: 'Սկզբնական կետը Երևանն է․ ճիշտ տեղը կարող եք ընտրել կառավարման բաժնում։' },
  ru: { title: 'Регистрация бизнеса', subtitle: 'Создайте аккаунт владельца и пространство управления', business: 'Название бизнеса', owner: 'Ваше имя', phone: 'Телефон бизнеса', address: 'Адрес', email: 'Эл. почта', password: 'Пароль — минимум 8 символов', confirm: 'Повторите пароль', services: 'Услуги', healthcare: 'Медицина', submit: 'Создать бизнес-аккаунт', login: 'Уже есть аккаунт? Войти', mismatch: 'Пароли не совпадают', failed: 'Регистрация не удалась. Проверьте поля.', location: 'Начальная точка — Ереван. Точное место можно выбрать в управлении.' },
  en: { title: 'Register a business', subtitle: 'Create an owner account and management workspace', business: 'Business name', owner: 'Your name', phone: 'Business phone', address: 'Address', email: 'Email', password: 'Password — at least 8 characters', confirm: 'Confirm password', services: 'Services', healthcare: 'Healthcare', submit: 'Create business account', login: 'Already have an account? Sign in', mismatch: 'Passwords do not match', failed: 'Registration failed. Check the fields.', location: 'The initial map point is Yerevan. Set the exact location in Management.' },
};

export default function BusinessRegister() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const existingSession = useExistingBusinessSession();
  const redirected = useRef(false);
  const [vertical, setVertical] = useState<'services' | 'healthcare'>('services');
  const [form, setForm] = useState({ business: '', owner: '', phone: '', address: '', email: '', password: '', confirmation: '' });

  useEffect(() => {
    if (!existingSession.data || redirected.current) return;
    redirected.current = true;
    router.replace('/(business)/today' as Href);
  }, [existingSession.data]);

  const valid = form.business.trim().length > 1 && form.owner.trim().length > 1 && form.phone.trim().length > 4 && form.address.trim().length > 2 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8 && form.password === form.confirmation;
  const registration = useMutation({ mutationFn: () => businessApi.register({ business_name: form.business.trim(), business_phone: form.phone.trim(), business_address: form.address.trim(), latitude: 40.1772, longitude: 44.50349, vertical, name: form.owner.trim(), email: form.email.trim().toLowerCase(), password: form.password, password_confirmation: form.confirmation, plan_code: 'start' }), onSuccess: () => router.replace('/(business)/admin' as Href), onError: () => Alert.alert(c.failed) });
  const field = (key: keyof typeof form, placeholder: string, props: Partial<React.ComponentProps<typeof TextInput>> = {}) => <TextInput {...props} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={theme.muted} style={[styles.field, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />;

  if (existingSession.isLoading || existingSession.data) {
    return <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.plum} /></SafeAreaView>;
  }

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.replace('/(business)/login' as Href)} style={[styles.back, { backgroundColor: theme.surface }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable><View style={[styles.mark, { backgroundColor: theme.plum }]}><VizitIcon ios="building.2.fill" android="domain" color="#FFF" size={29} /></View><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text><View style={[styles.segment, { backgroundColor: theme.surface }]}>{(['services', 'healthcare'] as const).map((item) => <Pressable key={item} onPress={() => setVertical(item)} style={[styles.segmentItem, vertical === item && { backgroundColor: theme.plum }]}><Text style={{ color: vertical === item ? '#FFF' : theme.muted, fontWeight: '800' }}>{c[item]}</Text></Pressable>)}</View><View style={styles.fields}>{field('business', c.business)}{field('owner', c.owner)}{field('phone', c.phone, { keyboardType: 'phone-pad' })}{field('address', c.address)}{field('email', c.email, { keyboardType: 'email-address', autoCapitalize: 'none' })}{field('password', c.password, { secureTextEntry: true })}{field('confirmation', c.confirm, { secureTextEntry: true })}</View><Text style={[styles.note, { color: theme.muted, backgroundColor: theme.plumSoft }]}>{c.location}</Text><Pressable disabled={!valid || registration.isPending} onPress={() => registration.mutate()} style={[styles.primary, { backgroundColor: theme.plum, opacity: valid ? 1 : 0.4 }]}>{registration.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{c.submit}</Text>}</Pressable><Pressable onPress={() => router.replace('/(business)/login')}><Text style={[styles.login, { color: theme.gold }]}>{c.login}</Text></Pressable></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, screen: { flex: 1 }, content: { padding: 20, paddingBottom: 40 }, back: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }, mark: { width: 62, height: 62, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 20 }, segment: { flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: 16 }, segmentItem: { flex: 1, height: 45, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, fields: { gap: 11 }, field: { height: 54, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, fontSize: 15 }, note: { fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 9, marginTop: 13 }, primary: { height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, primaryText: { color: '#FFF', fontSize: 15, fontWeight: '900' }, login: { textAlign: 'center', fontWeight: '800', padding: 18 } });