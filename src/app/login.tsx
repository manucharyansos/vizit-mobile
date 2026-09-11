import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { BusinessUser } from '@/services/api/business';
import { TokenAudience } from '@/services/api/client';
import { unifiedAuthApi } from '@/services/api/unified-auth';

const copy = {
  hy: {
    title: 'Մուտք Vizit',
    subtitle: 'Մեկ մուտք՝ հաճախորդների և բիզնեսների համար',
    identity: 'Email կամ հեռախոս',
    password: 'Գաղտնաբառ',
    submit: 'Մուտք գործել',
    failed: 'Մուտքը չհաջողվեց։ Ստուգեք տվյալները։',
    chooseTitle: 'Ընտրեք հաշիվը',
    chooseText: 'Այս տվյալներով հասանելի է երկու հաշիվ։ Որտե՞ղ շարունակել։',
    client: 'Հաճախորդ',
    business: 'Բիզնես',
    clientRegister: 'Ստեղծել հաճախորդի հաշիվ',
    businessRegister: 'Գրանցել բիզնես',
  },
  ru: {
    title: 'Вход в Vizit',
    subtitle: 'Один вход для клиентов и бизнеса',
    identity: 'Email или телефон',
    password: 'Пароль',
    submit: 'Войти',
    failed: 'Не удалось войти. Проверьте данные.',
    chooseTitle: 'Выберите аккаунт',
    chooseText: 'С этими данными доступны два аккаунта. Куда продолжить?',
    client: 'Клиент',
    business: 'Бизнес',
    clientRegister: 'Создать аккаунт клиента',
    businessRegister: 'Зарегистрировать бизнес',
  },
  en: {
    title: 'Sign in to Vizit',
    subtitle: 'One sign-in for clients and businesses',
    identity: 'Email or phone',
    password: 'Password',
    submit: 'Sign in',
    failed: 'Sign-in failed. Check your details.',
    chooseTitle: 'Choose account',
    chooseText: 'These credentials match two accounts. Where would you like to continue?',
    client: 'Client',
    business: 'Business',
    clientRegister: 'Create client account',
    businessRegister: 'Register a business',
  },
};

export default function UnifiedLoginScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: (audience?: TokenAudience) => unifiedAuthApi.login(identity.trim(), password, audience),
    onSuccess: (result) => {
      if (result.requires_selection) {
        Alert.alert(c.chooseTitle, c.chooseText, [
          { text: c.client, onPress: () => login.mutate('client') },
          { text: c.business, onPress: () => login.mutate('business') },
          { text: locale === 'hy' ? 'Չեղարկել' : locale === 'ru' ? 'Отмена' : 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      setPassword('');
      if (result.audience === 'client') {
        queryClient.invalidateQueries({ queryKey: ['client-existing-session'] });
        queryClient.invalidateQueries({ queryKey: ['client-me'] });
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
        router.replace('/(customer)/profile' as Href);
        return;
      }

      const user = result.user as BusinessUser;
      queryClient.invalidateQueries({ queryKey: ['business-existing-session'] });
      router.replace((user.needs_onboarding ? '/(business)/admin' : '/(business)/today') as Href);
    },
    onError: () => Alert.alert(c.failed),
  });

  const canSubmit = Boolean(identity.trim() && password) && !login.isPending;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.glow, { backgroundColor: theme.plumSoft }]} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/(customer)/discover' as Href)}
        style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} />
      </Pressable>

      <View style={styles.intro}>
        <View style={[styles.brandMark, { backgroundColor: theme.plum }]}>
          <VizitIcon ios="person.crop.circle.fill" android="account_circle" color="#FFFFFF" size={31} />
        </View>
        <Text style={[styles.brand, { color: theme.gold }]}>VIZIT</Text>
        <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surfaceRaised, shadowColor: theme.shadow, borderColor: theme.border }]}>
        <TextInput
          value={identity}
          onChangeText={setIdentity}
          placeholder={c.identity}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholderTextColor={theme.muted}
          style={[styles.field, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={c.password}
          secureTextEntry
          placeholderTextColor={theme.muted}
          style={[styles.field, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <Pressable
          disabled={!canSubmit}
          onPress={() => login.mutate(undefined)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.plum, opacity: !canSubmit ? 0.45 : pressed ? 0.88 : 1 },
          ]}
        >
          {login.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>{c.submit}</Text>
              <VizitIcon ios="arrow.right" android="arrow_forward" color="#FFFFFF" size={19} />
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.registrationRow}>
        <Pressable
          onPress={() => router.push('/client/register' as Href)}
          style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <VizitIcon ios="person.badge.plus" android="person_add" color={theme.plum} size={18} />
          <Text style={[styles.secondaryText, { color: theme.text }]}>{c.clientRegister}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(business)/register' as Href)}
          style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <VizitIcon ios="building.2.fill" android="domain_add" color={theme.plum} size={18} />
          <Text style={[styles.secondaryText, { color: theme.text }]}>{c.businessRegister}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 20, overflow: 'hidden' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -140, right: -110 },
  back: { position: 'absolute', top: 55, left: 20, width: 43, height: 43, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { alignItems: 'center', marginBottom: 24 },
  brandMark: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 29, fontWeight: '900', letterSpacing: -0.55, marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 7, textAlign: 'center' },
  card: { padding: 18, borderRadius: 14, gap: 12, borderWidth: 1, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  field: { height: 54, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, fontSize: 16 },
  button: { height: 55, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  registrationRow: { gap: 9, marginTop: 16 },
  secondaryButton: { minHeight: 50, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  secondaryText: { fontSize: 14, fontWeight: '800' },
});
