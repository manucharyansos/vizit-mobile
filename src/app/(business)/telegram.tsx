import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

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

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.icon}><VizitIcon ios="paperplane.fill" android="send" color="#229ED9" size={32} /></View><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text><Text style={[styles.text, { color: theme.muted }]}>{c[1]}</Text>{query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <><Text style={{ color: theme.danger, fontWeight: '900', textAlign: 'center' }}>{c[6]}</Text><Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center' }}>{apiErrorMessage(query.error)}</Text><Pressable onPress={() => query.refetch()} style={[styles.button, { backgroundColor: theme.plum, borderColor: theme.plum }]}><Text style={styles.white}>{c[7]}</Text></Pressable></> : query.data?.connected ? <><Text style={{ color: theme.success, fontWeight: '900' }}>{c[2]}</Text><Pressable disabled={disconnect.isPending} onPress={() => disconnect.mutate()} style={[styles.button, { borderColor: theme.danger }]}>{disconnect.isPending ? <ActivityIndicator color={theme.danger} /> : <Text style={{ color: theme.danger, fontWeight: '900' }}>{c[4]}</Text>}</Pressable></> : <Pressable disabled={connect.isPending} onPress={() => connect.mutate()} style={[styles.button, { backgroundColor: theme.plum, borderColor: theme.plum }]}>{connect.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c[3]}</Text>}</Pressable>}</View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 18, justifyContent: 'center' }, card: { padding: 22, borderWidth: 1, borderRadius: 11, alignItems: 'center', gap: 13 }, icon: { width: 62, height: 62, borderRadius: 12, backgroundColor: '#229ED922', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 23, fontWeight: '900', textAlign: 'center' }, text: { textAlign: 'center', lineHeight: 21 }, button: { width: '100%', height: 52, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, white: { color: '#FFF', fontWeight: '900' } });