import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: ['Նվեր քարտեր', 'Ստեղծել քարտ', 'Ստացողի անուն', 'Հեռախոս', 'Գումար՝ ֏ (նվազագույնը 100)', 'Ստեղծել', 'Չհաջողվեց', 'Քարտեր չկան', 'Չհաջողվեց բեռնել նվեր քարտերը', 'Կրկին փորձել'],
  ru: ['Подарочные карты', 'Создать карту', 'Имя получателя', 'Телефон', 'Сумма, ֏ (минимум 100)', 'Создать', 'Не удалось', 'Карт нет', 'Не удалось загрузить подарочные карты', 'Повторить'],
  en: ['Gift cards', 'Create a card', 'Recipient name', 'Phone', 'Amount, ֏ (minimum 100)', 'Create', 'Action failed', 'No cards', 'Could not load gift cards', 'Try again'],
};

export default function GiftCardsScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', amount: '' });
  const query = useQuery({ queryKey: ['business-gift-cards'], queryFn: businessApi.giftCards, retry: false, refetchOnMount: 'always' });
  const amount = Number(form.amount);
  const valid = Number.isInteger(amount) && amount >= 100;
  const create = useMutation({
    mutationFn: () => businessApi.createGiftCard({ amount, issued_to_name: form.name.trim() || undefined, issued_to_phone: form.phone.trim() || undefined }),
    onSuccess: async () => { setForm({ name: '', phone: '', amount: '' }); await cache.invalidateQueries({ queryKey: ['business-gift-cards'] }); await cache.refetchQueries({ queryKey: ['business-gift-cards'], type: 'active' }); },
    onError: (error) => Alert.alert(c[6], apiErrorMessage(error)),
  });
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow="Vizit Pro" title={c[0]} onBack={() => safeBack('/(business)/more')} backLabel={c[0]} />
    <Surface elevated style={styles.form}><SectionHeader title={c[1]} /><PremiumInput label={c[2]} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder={c[2]} icon={{ ios: 'person', android: 'person_outline' }} /><PremiumInput label={c[3]} value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} placeholder={c[3]} keyboardType="phone-pad" icon={{ ios: 'phone', android: 'phone' }} /><PremiumInput label={c[4]} value={form.amount} onChangeText={(amountValue) => setForm((current) => ({ ...current, amount: amountValue.replace(/\D/g, '') }))} placeholder={c[4]} keyboardType="number-pad" icon={{ ios: 'banknote', android: 'payments' }} /><PremiumButton title={c[5]} loading={create.isPending} disabled={!valid} onPress={() => create.mutate()} icon={{ ios: 'gift', android: 'card_giftcard' }} /></Surface>
    {!query.isLoading && !query.isError ? <SectionHeader title={c[0]} detail={String(query.data?.length ?? 0)} /> : null}
    {query.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : query.isError ? <StateCard title={c[8]} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c[9]} tone="secondary" onPress={() => void query.refetch()} />} /> : query.data?.length ? query.data.map((item) => <Surface key={item.id} style={styles.card}><View style={[styles.giftIcon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="gift.fill" android="card_giftcard" color={theme.accentText} size={21} /></View><View style={styles.flex}><Text selectable style={[styles.code, { color: theme.text }]}>{item.code}</Text><Text style={[styles.meta, { color: theme.muted }]}>{item.issued_to_name ?? '—'}</Text></View><View style={styles.balanceWrap}><Text style={[styles.balance, { color: theme.text }]}>{Number(item.balance).toLocaleString()} {item.currency}</Text><StatusPill label={item.status} tone={item.status === 'active' ? 'success' : 'neutral'} /></View></Surface>) : <StateCard title={c[7]} icon={{ ios: 'gift', android: 'card_giftcard' }} />}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, gap: ui.spacing.md, paddingBottom: ui.spacing.xxl },
  form: { gap: ui.spacing.sm },
  loader: { marginVertical: ui.spacing.lg },
  card: { padding: ui.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: ui.spacing.sm },
  giftIcon: { width: 44, height: 44, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  code: { ...ui.type.cardTitle, letterSpacing: 0.7 },
  meta: { ...ui.type.caption, marginTop: 3 },
  balanceWrap: { alignItems: 'flex-end', gap: 5 },
  balance: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
