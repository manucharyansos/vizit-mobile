import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

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
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text><View style={[styles.form, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={[styles.formTitle, { color: theme.text }]}>{c[1]}</Text><TextInput value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder={c[2]} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /><TextInput value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} placeholder={c[3]} keyboardType="phone-pad" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /><TextInput value={form.amount} onChangeText={(amountValue) => setForm((current) => ({ ...current, amount: amountValue.replace(/\D/g, '') }))} placeholder={c[4]} keyboardType="number-pad" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /><Pressable disabled={!valid || create.isPending} onPress={() => create.mutate()} style={[styles.button, { backgroundColor: theme.plum, opacity: valid ? 1 : 0.4 }]}>{create.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.white}>{c[5]}</Text>}</Pressable></View>{query.isLoading ? <ActivityIndicator color={theme.plum} /> : query.isError ? <View style={[styles.error, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><Text style={{ color: theme.danger, fontWeight: '900' }}>{c[8]}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{apiErrorMessage(query.error)}</Text><Pressable onPress={() => query.refetch()}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c[9]}</Text></Pressable></View> : query.data?.length ? query.data.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={[styles.code, { color: theme.text }]}>{item.code}</Text><Text style={{ color: theme.muted }}>{item.issued_to_name ?? '—'} · {item.status}</Text></View><Text style={[styles.balance, { color: theme.plum }]}>{Number(item.balance).toLocaleString()} {item.currency}</Text></View>) : <Text style={{ color: theme.muted }}>{c[7]}</Text>}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, gap: 10, paddingBottom: 35 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 8 }, form: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 9 }, formTitle: { fontSize: 18, fontWeight: '900' }, input: { height: 50, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 }, button: { height: 50, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, white: { color: '#FFF', fontWeight: '900' }, card: { borderWidth: 1, borderRadius: 11, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, code: { fontWeight: '900', marginBottom: 4 }, balance: { fontWeight: '900' }, error: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 } });