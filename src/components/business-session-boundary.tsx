import type { PropsWithChildren } from 'react';
import { useSegments } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, PremiumButton, StateCard } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useAuthNavigation } from '@/hooks/use-auth-navigation';
import { useExistingBusinessSession } from '@/hooks/use-existing-business-session';
import { useApp } from '@/providers/app-provider';

const labels = {
  hy: {
    checking: 'Ստուգում ենք մուտքը…', title: 'Անհրաժեշտ է մուտք գործել',
    message: 'Մուտք գործեք ձեր բիզնես հաշիվ՝ օրացույցը, հաճախորդներին և կարգավորումները բացելու համար։',
    signIn: 'Մուտք գործել', customer: 'Բացել հաճախորդի բաժինը',
    error: 'Չհաջողվեց ստուգել մուտքը', errorMessage: 'Հաշվի տվյալները չհաջողվեց կարդալ։ Խնդրում ենք կրկին փորձել։', retry: 'Կրկին փորձել',
  },
  ru: {
    checking: 'Проверяем вход…', title: 'Требуется вход',
    message: 'Войдите в бизнес-аккаунт, чтобы открыть календарь, клиентов и настройки.',
    signIn: 'Войти', customer: 'Открыть клиентский раздел',
    error: 'Не удалось проверить вход', errorMessage: 'Не удалось прочитать данные аккаунта. Попробуйте ещё раз.', retry: 'Повторить',
  },
  en: {
    checking: 'Checking your session…', title: 'Sign in to continue',
    message: 'Sign in to your business account to open your calendar, clients and settings.',
    signIn: 'Sign in', customer: 'Open customer area',
    error: 'Could not check your session', errorMessage: 'We could not read your account details. Please try again.', retry: 'Try again',
  },
};

/** Replace only the protected business workspace; navigation remains an explicit action. */
export function BusinessSessionBoundary({ children }: PropsWithChildren) {
  const { locale, theme } = useApp();
  const session = useExistingBusinessSession();
  const navigate = useAuthNavigation();
  const segments = useSegments();
  const publicRoute = segments[1] === 'login' || segments[1] === 'register';
  const c = labels[locale];

  // These legacy auth routes must remain reachable without an existing token.
  if (publicRoute || (!session.isError && session.data === true)) return children;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandLockup compact />
        {session.isPending ? (
          <View accessibilityLiveRegion="polite" style={styles.loading}>
            <ActivityIndicator color={theme.accentText} accessibilityLabel={c.checking} />
            <Text style={[styles.loadingText, { color: theme.muted }]}>{c.checking}</Text>
          </View>
        ) : (
          <StateCard
            title={session.isError ? c.error : c.title}
            message={session.isError ? c.errorMessage : c.message}
            icon={{ ios: 'lock.shield', android: 'verified_user' }}
            action={<View style={styles.actions}>
              <PremiumButton
                title={session.isError ? c.retry : c.signIn}
                loading={session.isError && session.isFetching}
                onPress={() => { if (session.isError) void session.refetch(); else navigate('login'); }}
              />
              <PremiumButton title={c.customer} tone="ghost" onPress={() => navigate('discover')} />
            </View>}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: ui.screenGutter, paddingTop: 24, gap: 32 },
  loading: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  loadingText: ui.type.body,
  actions: { gap: 8 },
});
