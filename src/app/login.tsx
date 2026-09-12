import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, IconButton, PremiumButton, PremiumInput, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
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
    forgot: 'Մոռացե՞լ ես գաղտնաբառը',
    eyebrow: 'Անվտանգ միասնական մուտք',
    security: 'Հաճախորդի և բիզնեսի տվյալները պահվում են առանձին անվտանգ սեսիաներում։',
    theme: 'Փոխել թեման',
    language: 'Փոխել լեզուն',
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
    forgot: 'Забыли пароль?',
    eyebrow: 'Безопасный единый вход',
    security: 'Данные клиента и бизнеса остаются в отдельных защищённых сессиях.',
    theme: 'Сменить тему',
    language: 'Сменить язык',
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
    forgot: 'Forgot password?',
    eyebrow: 'Secure unified access',
    security: 'Client and business data stay in separate protected sessions.',
    theme: 'Change theme',
    language: 'Change language',
  },
};

export default function UnifiedLoginScreen() {
  const { locale, setLocale, mode, theme, toggleMode } = useApp();
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.orbLarge, { backgroundColor: theme.accentSoft }]} />
          <View style={[styles.orbSmall, { backgroundColor: theme.surface }]} />
          <View style={styles.topBar}>
            <IconButton
              ios="chevron.left"
              android="chevron_left"
              accessibilityLabel={locale === 'hy' ? 'Հետ' : locale === 'ru' ? 'Назад' : 'Back'}
              onPress={() => router.replace('/(customer)/discover' as Href)}
            />
            <View style={styles.topActions}>
              <IconButton
                ios={mode === 'dark' ? 'sun.max.fill' : 'moon.fill'}
                android={mode === 'dark' ? 'light_mode' : 'dark_mode'}
                accessibilityLabel={c.theme}
                onPress={toggleMode}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={c.language}
                onPress={() => setLocale(locale === 'hy' ? 'ru' : locale === 'ru' ? 'en' : 'hy')}
                style={({ pressed }) => [styles.language, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, opacity: pressed ? 0.72 : 1 }]}
              >
                <Text style={[styles.languageText, { color: theme.text }]}>{locale.toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.intro}>
            <BrandLockup />
            <Text style={[styles.eyebrow, { color: theme.accentText }]}>{c.eyebrow.toLocaleUpperCase()}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text>
          </View>

          <Surface style={styles.card} elevated>
            <PremiumInput
              label={c.identity}
              value={identity}
              onChangeText={setIdentity}
              placeholder={c.identity}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              icon={{ ios: 'person.fill', android: 'person' }}
            />
            <PremiumInput
              label={c.password}
              value={password}
              onChangeText={setPassword}
              placeholder={c.password}
              secureTextEntry
              textContentType="password"
              icon={{ ios: 'lock.fill', android: 'lock' }}
            />
            <PremiumButton title={c.forgot} tone="ghost" compact onPress={() => router.push('/client/forgot-password' as Href)} style={styles.forgot} />
            <PremiumButton
              title={c.submit}
              loading={login.isPending}
              disabled={!canSubmit}
              onPress={() => login.mutate(undefined)}
              icon={{ ios: 'arrow.right', android: 'arrow_forward' }}
              style={styles.submit}
            />
            <View style={[styles.security, { backgroundColor: theme.accentSubtle }]}>
              <VizitIcon ios="shield.lefthalf.filled" android="verified_user" color={theme.accentText} size={17} />
              <Text style={[styles.securityText, { color: theme.muted }]}>{c.security}</Text>
            </View>
          </Surface>

          <View style={styles.registrationRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/client/register' as Href)}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceRaised, opacity: pressed ? 0.76 : 1 }]}
            >
              <View style={[styles.secondaryIcon, { backgroundColor: theme.accentSoft }]}>
                <VizitIcon ios="person.badge.plus" android="person_add" color={theme.accentText} size={19} />
              </View>
              <Text style={[styles.secondaryText, { color: theme.text }]}>{c.clientRegister}</Text>
              <VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={18} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(business)/register' as Href)}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceRaised, opacity: pressed ? 0.76 : 1 }]}
            >
              <View style={[styles.secondaryIcon, { backgroundColor: theme.accentSoft }]}>
                <VizitIcon ios="building.2.fill" android="domain_add" color={theme.accentText} size={19} />
              </View>
              <Text style={[styles.secondaryText, { color: theme.text }]}>{c.businessRegister}</Text>
              <VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={18} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: ui.screenGutter, paddingTop: 8, paddingBottom: 28 },
  orbLarge: { position: 'absolute', width: 310, height: 310, borderRadius: 155, top: -180, right: -120, opacity: 0.72 },
  orbSmall: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 70, left: -130, opacity: 0.7 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 34 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  language: { width: 48, height: 44, borderRadius: ui.radius.medium, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  languageText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  intro: { alignItems: 'flex-start', marginBottom: 24 },
  eyebrow: { ...ui.type.eyebrow, marginTop: 28 },
  title: { ...ui.type.display, marginTop: 7 },
  subtitle: { ...ui.type.body, marginTop: 7, maxWidth: 340 },
  card: { padding: 18, gap: 15 },
  forgot: { alignSelf: 'flex-end', minHeight: 34, marginTop: -5 },
  submit: { marginTop: 1 },
  security: { borderRadius: ui.radius.small, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  securityText: { ...ui.type.caption, flex: 1 },
  registrationRow: { gap: 9, marginTop: 14 },
  secondaryButton: { minHeight: 58, borderWidth: 1, borderRadius: ui.radius.medium, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11 },
  secondaryIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...ui.type.button, flex: 1 },
});
