import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PreferenceBar, PremiumButton, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { clientAccountApi } from '@/services/api/client-account';
import { apiErrorMessage } from '@/services/api/client';
import { publicApi } from '@/services/api/public';
import { guestBookingStore } from '@/services/guest-booking-store';
import { useApp } from '@/providers/app-provider';
import { formatApiDateTime } from '@/services/date-time';

const copy = {
  hy: {
    title: 'Հաճախորդի հաշիվ', subtitle: 'Մուտք գործիր՝ բոլոր ամրագրումները մեկ տեղում տեսնելու համար', login: 'Մուտք գործել', register: 'Ստեղծել նոր հաշիվ', logout: 'Դուրս գալ', visits: 'Իմ այցերը', booking: 'Ամրագրում', empty: 'Ամրագրումներ դեռ չկան', business: 'Անցնել բիզնեսի մուտքին', verify: 'Հաստատիր email-ը՝ հին ամրագրումները հաշվին կապելու համար', resend: 'Նորից ուղարկել նամակը', delete: 'Ջնջել հաշիվը', deleteConfirm: 'Հաստատե՞լ հաշվի և անձնական տվյալների ջնջման հայտը։', deletionSent: 'Ջնջման հայտն ընդունված է', manage: 'Կառավարել', retry: 'Կրկին փորձել', account: 'Անձնական հաշիվ', language: 'Լեզու', theme: 'Թեմա',
  },
  ru: {
    title: 'Аккаунт клиента', subtitle: 'Войдите, чтобы видеть все записи в одном месте', login: 'Войти', register: 'Создать аккаунт', logout: 'Выйти', visits: 'Мои визиты', booking: 'Запись', empty: 'Записей пока нет', business: 'Перейти ко входу для бизнеса', verify: 'Подтвердите email, чтобы привязать прежние записи', resend: 'Отправить письмо снова', delete: 'Удалить аккаунт', deleteConfirm: 'Отправить запрос на удаление аккаунта и личных данных?', deletionSent: 'Запрос на удаление принят', manage: 'Управлять', retry: 'Повторить', account: 'Личный кабинет', language: 'Язык', theme: 'Тема',
  },
  en: {
    title: 'Client account', subtitle: 'Sign in to see all bookings in one place', login: 'Sign in', register: 'Create an account', logout: 'Sign out', visits: 'My visits', booking: 'Booking', empty: 'No bookings yet', business: 'Go to business sign in', verify: 'Verify your email to link earlier bookings', resend: 'Resend verification email', delete: 'Delete account', deleteConfirm: 'Request deletion of your account and personal data?', deletionSent: 'Deletion request accepted', manage: 'Manage', retry: 'Try again', account: 'Personal account', language: 'Language', theme: 'Appearance',
  },
};

export default function ProfileScreen() {
  const { locale, theme, t } = useApp();
  const c = copy[locale];
  const queryClient = useQueryClient();
  const [openingBookingId, setOpeningBookingId] = useState<number | null>(null);
  const me = useQuery({ queryKey: ['client-me'], queryFn: clientAccountApi.me, retry: false });
  const bookings = useQuery({ queryKey: ['client-bookings'], queryFn: clientAccountApi.bookings, enabled: me.isSuccess, retry: false });
  const resend = useMutation({ mutationFn: clientAccountApi.resendVerification, onSuccess: () => Alert.alert(c.resend), onError: () => Alert.alert(t('loadError')) });

  const openBooking = async (bookingId: number) => {
    if (openingBookingId !== null) return;
    setOpeningBookingId(bookingId);
    try {
      let reference = await guestBookingStore.restoreClientBookingReference(bookingId);
      if (!reference) {
        await bookings.refetch();
        reference = await guestBookingStore.restoreClientBookingReference(bookingId);
      }
      if (!reference) throw new Error('Booking reference is unavailable on this device');

      const saved = await guestBookingStore.restore(reference);
      if (saved) {
        await guestBookingStore.rememberCode(reference);
        router.push('/(customer)/bookings');
        return;
      }

      const recovery = await publicApi.resendBookingOtp(reference);
      const manageToken = recovery.manage_token ?? recovery.guest_token;
      if (typeof manageToken === 'string' && manageToken) await guestBookingStore.save(reference, manageToken);
      else await guestBookingStore.rememberCode(reference);
      router.push('/(customer)/bookings');
    } catch (error) {
      Alert.alert(t('loadError'), apiErrorMessage(error));
    } finally {
      setOpeningBookingId(null);
    }
  };

  const requestDeletion = () => Alert.alert(c.delete, c.deleteConfirm, [
    { text: t('back'), style: 'cancel' },
    {
      text: c.delete,
      style: 'destructive',
      onPress: async () => {
        try {
          await clientAccountApi.requestAccountDeletion();
          queryClient.clear();
          Alert.alert(c.deletionSent);
        } catch {
          Alert.alert(t('loadError'));
        }
      },
    },
  ]);
  const logout = () => Alert.alert(c.title, '', [
    {
      text: c.logout,
      onPress: async () => {
        await clientAccountApi.logout();
        queryClient.removeQueries({ queryKey: ['client-me'] });
        queryClient.removeQueries({ queryKey: ['client-bookings'] });
      },
    },
    { text: c.delete, style: 'destructive', onPress: requestDeletion },
    { text: t('back'), style: 'cancel' },
  ]);

  if (me.isLoading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} size="large" /></SafeAreaView>;
  }

  if (me.isError) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.signedOut}>
          <PageHeader eyebrow="Vizit" title={c.title} subtitle={c.subtitle} />
          <PreferenceBar languageLabel={c.language} themeLabel={c.theme} />
          <StateCard
            title={c.account}
            message={c.subtitle}
            icon={{ ios: 'person.crop.circle.fill', android: 'account_circle' }}
            action={
              <View style={styles.authActions}>
                <PremiumButton title={c.login} onPress={() => router.push('/login' as Href)} icon={{ ios: 'arrow.right', android: 'arrow_forward' }} />
                <PremiumButton title={c.register} onPress={() => router.push('/client/register' as Href)} tone="secondary" icon={{ ios: 'person.badge.plus', android: 'person_add' }} />
                <PremiumButton title={c.business} onPress={() => router.push('/login' as Href)} tone="ghost" icon={{ ios: 'briefcase.fill', android: 'business_center' }} />
              </View>
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={bookings.data}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <PageHeader
              eyebrow={c.account}
              title={c.title}
              action={<IconButton accessibilityLabel={c.logout} ios="rectangle.portrait.and.arrow.right" android="logout" onPress={logout} tone="accent" />}
            />
            <Surface style={styles.userCard} elevated>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}><VizitIcon ios="person.fill" android="person" color={theme.onPrimary} size={26} /></View>
              <View style={styles.userCopy}>
                <Text numberOfLines={1} style={[styles.userTitle, { color: theme.text }]}>{me.data?.name}</Text>
                <Text numberOfLines={1} style={[styles.userContact, { color: theme.muted }]}>{me.data?.email ?? me.data?.phone}</Text>
              </View>
              <View style={[styles.accountBadge, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="checkmark.shield.fill" android="verified_user" color={theme.accentText} size={18} /></View>
            </Surface>
            <PreferenceBar languageLabel={c.language} themeLabel={c.theme} />
            {me.data?.requires_email_verification ? (
              <Pressable accessibilityRole="button" onPress={() => resend.mutate()} style={({ pressed }) => [styles.verify, { backgroundColor: theme.warningSoft, borderColor: theme.warning, opacity: pressed ? 0.76 : 1 }]}>
                <View style={[styles.verifyIcon, { backgroundColor: theme.surfaceRaised }]}><VizitIcon ios="envelope.badge.fill" android="mark_email_unread" color={theme.warning} size={20} /></View>
                <View style={styles.verifyCopy}><Text style={[styles.verifyText, { color: theme.text }]}>{c.verify}</Text><Text style={[styles.verifyAction, { color: theme.warning }]}>{resend.isPending ? '…' : c.resend}</Text></View>
              </Pressable>
            ) : null}
            <SectionHeader title={c.visits} detail={bookings.data ? String(bookings.data.length) : undefined} />
          </View>
        }
        ListEmptyComponent={
          bookings.isLoading ? <View style={styles.listLoader}><ActivityIndicator color={theme.accent} /></View> : bookings.isError ? (
            <StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={c.retry} onPress={() => bookings.refetch()} tone="secondary" />} />
          ) : <StateCard title={c.empty} icon={{ ios: 'calendar.badge.plus', android: 'event_available' }} action={<PremiumButton title={t('bookNow')} onPress={() => router.push('/(customer)/discover')} />} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const opening = openingBookingId === item.id;
          const status = String(item.status ?? '');
          return (
            <Pressable
              accessibilityRole="button"
              disabled={openingBookingId !== null}
              onPress={() => void openBooking(item.id)}
              style={({ pressed }) => [styles.booking, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow, opacity: pressed ? 0.76 : 1 }]}
            >
              <View style={styles.bookingTop}>
                <View style={[styles.bookingIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="calendar" android="event" color={theme.accentText} size={21} /></View>
                <View style={styles.bookingCopy}>
                  <Text numberOfLines={1} style={[styles.bookingTitle, { color: theme.text }]}>{item.business?.name ?? c.booking}</Text>
                  <Text style={[styles.bookingDate, { color: theme.muted }]}>{formatApiDateTime(item.starts_at, locale)}</Text>
                </View>
                <StatusPill label={status || '—'} tone={bookingTone(status)} />
              </View>
              <View style={[styles.serviceRow, { backgroundColor: theme.accentSubtle }]}>
                <VizitIcon ios="sparkles" android="spa" color={theme.accentText} size={16} />
                <Text numberOfLines={1} style={[styles.serviceText, { color: theme.textSecondary }]}>{item.service?.name ?? '—'} · {item.staff?.name ?? '—'}</Text>
              </View>
              <View style={styles.manageRow}>
                {opening ? <ActivityIndicator size="small" color={theme.accent} /> : <Text style={[styles.manageText, { color: theme.accentText }]}>{c.manage}</Text>}
                <VizitIcon ios="chevron.right" android="chevron_right" color={theme.accentText} size={18} />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function bookingTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  const value = status.toLocaleLowerCase();
  if (value.includes('cancel') || value.includes('no_show')) return 'danger';
  if (value.includes('complete') || value.includes('done')) return 'success';
  if (value.includes('pending')) return 'warning';
  if (value.includes('confirm')) return 'accent';
  return 'neutral';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  signedOut: { flex: 1, justifyContent: 'center', padding: ui.screenGutter, gap: 22 },
  authActions: { gap: 9 },
  list: { padding: ui.screenGutter, paddingBottom: 34 },
  listHeader: { gap: 18, marginBottom: 13 },
  userCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' },
  userCopy: { flex: 1, minWidth: 0 },
  userTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  userContact: { ...ui.type.caption, marginTop: 3 },
  accountBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verify: { borderWidth: 1, borderRadius: ui.radius.medium, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  verifyCopy: { flex: 1 },
  verifyText: ui.type.caption,
  verifyAction: { ...ui.type.caption, fontWeight: '800', marginTop: 3 },
  listLoader: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 10 },
  booking: { padding: 14, borderWidth: 1, borderRadius: ui.radius.large, gap: 11, ...ui.shadow.card },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bookingIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bookingCopy: { flex: 1, minWidth: 0 },
  bookingTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  bookingDate: { ...ui.type.caption, marginTop: 3 },
  serviceRow: { minHeight: 38, borderRadius: ui.radius.small, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  serviceText: { ...ui.type.caption, flex: 1 },
  manageRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  manageText: ui.type.button,
});
