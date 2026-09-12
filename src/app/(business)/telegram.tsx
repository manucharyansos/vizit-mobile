import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: ['Telegram ծանուցումներ', 'Ստացեք նոր ամրագրումները Telegram-ում', 'Միացված է', 'Միացնել Telegram-ը', 'Անջատել', 'Չհաջողվեց', 'Չհաջողվեց ստուգել Telegram կապը', 'Կրկին փորձել'],
  ru: ['Telegram-уведомления', 'Получайте новые записи в Telegram', 'Подключено', 'Подключить Telegram', 'Отключить', 'Не удалось', 'Не удалось проверить подключение Telegram', 'Повторить'],
  en: ['Telegram notifications', 'Receive new bookings in Telegram', 'Connected', 'Connect Telegram', 'Disconnect', 'Action failed', 'Could not check Telegram connection', 'Try again'],
};

export default function TelegramScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['business-telegram'], queryFn: businessApi.telegram, retry: false, refetchOnMount: 'always' });
  const connect = useMutation({
    mutationFn: businessApi.createTelegramLink,
    onSuccess: async (data) => { await Linking.openURL(data.url); },
    onError: (error) => Alert.alert(c[5], apiErrorMessage(error)),
  });
  const disconnect = useMutation({
    mutationFn: businessApi.disconnectTelegram,
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ['business-telegram'] }); await cache.refetchQueries({ queryKey: ['business-telegram'], type: 'active' }); },
    onError: (error) => Alert.alert(c[5], apiErrorMessage(error)),
  });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow="Vizit Pro" title={c[0]} subtitle={c[1]} onBack={() => safeBack('/(business)/more')} backLabel={c[0]} />
    {query.isError ? <StateCard title={c[6]} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c[7]} tone="secondary" onPress={() => void query.refetch()} />} /> : <Surface elevated style={styles.card}>
      <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="paperplane.fill" android="send" color={theme.accentText} size={30} /></View>
      <View style={styles.heading}><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text>{query.data ? <StatusPill label={query.data.connected ? c[2] : c[3]} tone={query.data.connected ? 'success' : 'neutral'} /> : null}</View>
      <Text style={[styles.text, { color: theme.muted }]}>{c[1]}</Text>
      {query.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : query.data?.connected ? <PremiumButton title={c[4]} tone="danger" loading={disconnect.isPending} onPress={() => disconnect.mutate()} icon={{ ios: 'link', android: 'link_off' }} /> : <PremiumButton title={c[3]} loading={connect.isPending} onPress={() => connect.mutate()} icon={{ ios: 'paperplane.fill', android: 'send' }} />}
    </Surface>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: ui.screenGutter, paddingBottom: ui.spacing.xxl, gap: ui.spacing.xl },
  card: { marginTop: ui.spacing.lg, padding: ui.spacing.xl, gap: ui.spacing.md },
  icon: { width: 62, height: 62, borderRadius: ui.radius.large, alignItems: 'center', justifyContent: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ui.spacing.sm },
  title: ui.type.sectionTitle,
  text: ui.type.body,
  loader: { marginVertical: ui.spacing.sm },
});
