import { useMutation } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, IconButton, PremiumButton, PremiumInput, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useExistingBusinessSession } from '@/hooks/use-existing-business-session';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';

const copy = {
  hy: { title: 'Գրանցել բիզնես', subtitle: 'Ստեղծիր սեփականատիրոջ հաշիվը և կառավարման տարածքը', business: 'Բիզնեսի անվանում', owner: 'Ձեր անունը', phone: 'Բիզնեսի հեռախոս', address: 'Հասցե', email: 'Էլ․ փոստ', password: 'Գաղտնաբառ՝ առնվազն 8 նիշ', confirm: 'Կրկնել գաղտնաբառը', services: 'Ծառայություններ', healthcare: 'Բժշկություն', submit: 'Ստեղծել բիզնես հաշիվ', login: 'Արդեն ունե՞ք հաշիվ։ Մուտք գործել', mismatch: 'Գաղտնաբառերը չեն համընկնում', failed: 'Գրանցումը չհաջողվեց։ Ստուգեք դաշտերը։', location: 'Սկզբնական կետը Երևանն է․ ճիշտ տեղը կարող եք ընտրել կառավարման բաժնում։', type: 'Բիզնեսի ուղղություն', back: 'Հետ' },
  ru: { title: 'Регистрация бизнеса', subtitle: 'Создайте аккаунт владельца и пространство управления', business: 'Название бизнеса', owner: 'Ваше имя', phone: 'Телефон бизнеса', address: 'Адрес', email: 'Эл. почта', password: 'Пароль — минимум 8 символов', confirm: 'Повторите пароль', services: 'Услуги', healthcare: 'Медицина', submit: 'Создать бизнес-аккаунт', login: 'Уже есть аккаунт? Войти', mismatch: 'Пароли не совпадают', failed: 'Регистрация не удалась. Проверьте поля.', location: 'Начальная точка — Ереван. Точное место можно выбрать в управлении.', type: 'Направление бизнеса', back: 'Назад' },
  en: { title: 'Register a business', subtitle: 'Create an owner account and management workspace', business: 'Business name', owner: 'Your name', phone: 'Business phone', address: 'Address', email: 'Email', password: 'Password — at least 8 characters', confirm: 'Confirm password', services: 'Services', healthcare: 'Healthcare', submit: 'Create business account', login: 'Already have an account? Sign in', mismatch: 'Passwords do not match', failed: 'Registration failed. Check the fields.', location: 'The initial map point is Yerevan. Set the exact location in Management.', type: 'Business vertical', back: 'Back' },
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
  const registration = useMutation({
    mutationFn: () => businessApi.register({ business_name: form.business.trim(), business_phone: form.phone.trim(), business_address: form.address.trim(), latitude: 40.1772, longitude: 44.50349, vertical, name: form.owner.trim(), email: form.email.trim().toLowerCase(), password: form.password, password_confirmation: form.confirmation, plan_code: 'start' }),
    onSuccess: () => router.replace('/(business)/admin' as Href),
    onError: () => Alert.alert(c.failed),
  });

  if (existingSession.isLoading || existingSession.data) {
    return <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} size="large" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <IconButton accessibilityLabel={c.back} ios="chevron.left" android="chevron_left" onPress={() => router.replace('/(business)/login' as Href)} />
            <BrandLockup compact />
          </View>
          <View style={[styles.mark, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="building.2.fill" android="domain" color={theme.accentText} size={28} /></View>
          <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text>

          <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>{c.type}</Text>
          <View style={[styles.segment, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['services', 'healthcare'] as const).map((item) => {
              const selected = vertical === item;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => setVertical(item)}
                  style={({ pressed }) => [styles.segmentItem, { backgroundColor: selected ? theme.primary : 'transparent', opacity: pressed ? 0.76 : 1 }]}
                >
                  <VizitIcon ios={item === 'services' ? 'sparkles' : 'cross.case.fill'} android={item === 'services' ? 'spa' : 'medical_services'} color={selected ? theme.onPrimary : theme.muted} size={18} />
                  <Text style={[styles.segmentText, { color: selected ? theme.onPrimary : theme.muted }]}>{c[item]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Surface style={styles.fields} elevated>
            <PremiumInput label={c.business} placeholder={c.business} value={form.business} onChangeText={(business) => setForm((value) => ({ ...value, business }))} icon={{ ios: 'building.2.fill', android: 'business' }} />
            <PremiumInput label={c.owner} placeholder={c.owner} value={form.owner} onChangeText={(owner) => setForm((value) => ({ ...value, owner }))} icon={{ ios: 'person.fill', android: 'person' }} />
            <PremiumInput label={c.phone} placeholder={c.phone} value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} icon={{ ios: 'phone.fill', android: 'call' }} />
            <PremiumInput label={c.address} placeholder={c.address} value={form.address} onChangeText={(address) => setForm((value) => ({ ...value, address }))} icon={{ ios: 'location.fill', android: 'location_on' }} />
            <PremiumInput label={c.email} placeholder={c.email} value={form.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(email) => setForm((value) => ({ ...value, email }))} icon={{ ios: 'envelope.fill', android: 'mail' }} />
            <PremiumInput label={c.password} placeholder={c.password} value={form.password} secureTextEntry onChangeText={(password) => setForm((value) => ({ ...value, password }))} icon={{ ios: 'lock.fill', android: 'lock' }} />
            <PremiumInput label={c.confirm} placeholder={c.confirm} value={form.confirmation} secureTextEntry onChangeText={(confirmation) => setForm((value) => ({ ...value, confirmation }))} icon={{ ios: 'lock.rotation', android: 'password' }} />
          </Surface>

          <View style={[styles.note, { backgroundColor: theme.accentSubtle }]}>
            <VizitIcon ios="mappin.and.ellipse" android="location_on" color={theme.accentText} size={18} />
            <Text style={[styles.noteText, { color: theme.muted }]}>{c.location}</Text>
          </View>
          <PremiumButton title={c.submit} loading={registration.isPending} disabled={!valid} onPress={() => registration.mutate()} icon={{ ios: 'arrow.right', android: 'arrow_forward' }} />
          <PremiumButton title={c.login} onPress={() => router.replace('/(business)/login')} tone="ghost" compact />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: 40 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  mark: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: ui.type.display,
  subtitle: { ...ui.type.body, marginTop: 7, marginBottom: 22 },
  groupLabel: { ...ui.type.caption, marginLeft: 2, marginBottom: 7 },
  segment: { flexDirection: 'row', borderRadius: ui.radius.medium, borderWidth: 1, padding: 4, marginBottom: 14 },
  segmentItem: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentText: ui.type.button,
  fields: { gap: 13, padding: 16 },
  note: { minHeight: 58, borderRadius: ui.radius.medium, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 12, marginBottom: 14 },
  noteText: { ...ui.type.caption, flex: 1 },
});
