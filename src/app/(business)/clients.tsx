import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, PremiumInput, StateCard, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

export default function ClientsScreen() {
  const { locale, theme } = useApp();
  const c = {
    hy: ['Հաճախորդներ', 'Հաճախորդներ դեռ չկան', 'ամրագրում', 'Որոնել անունով կամ հեռախոսով', 'Նոր հաճախորդ', 'Անուն', 'Հեռախոս', 'Էլ․ փոստ', 'Պահպանել', 'Չեղարկել', 'Չհաջողվեց բեռնել հաճախորդներին', 'Կրկին փորձել', 'Հաճախորդների բազա'],
    ru: ['Клиенты', 'Клиентов пока нет', 'записей', 'Поиск по имени или телефону', 'Новый клиент', 'Имя', 'Телефон', 'Email', 'Сохранить', 'Отмена', 'Не удалось загрузить клиентов', 'Повторить', 'Клиентская база'],
    en: ['Clients', 'No clients yet', 'bookings', 'Search by name or phone', 'New client', 'Name', 'Phone', 'Email', 'Save', 'Cancel', 'Could not load clients', 'Try again', 'Customer database'],
  }[locale];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const query = useQuery({ queryKey: ['business-clients'], queryFn: businessApi.clients, retry: false, refetchOnMount: 'always' });
  const data = useMemo(() => {
    const value = search.trim().toLocaleLowerCase(locale);
    return value ? (query.data ?? []).filter((item) => [item.name, item.phone, item.email].some((field) => field?.toLocaleLowerCase(locale).includes(value))) : query.data;
  }, [locale, query.data, search]);
  const create = useMutation({
    mutationFn: () => businessApi.createClient({ name: form.name.trim(), phone: form.phone.trim() || undefined, email: form.email.trim() || undefined }),
    onSuccess: async () => {
      setAdding(false);
      setForm({ name: '', phone: '', email: '' });
      await queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      await queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
      await queryClient.refetchQueries({ queryKey: ['business-clients'], type: 'active' });
    },
    onError: (error) => Alert.alert(c[4], apiErrorMessage(error)),
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <PageHeader
              eyebrow="Vizit Business"
              title={c[0]}
              subtitle={query.isSuccess ? `${c[12]} · ${query.data.length}` : c[12]}
              action={<IconButton disabled={query.isError} accessibilityLabel={c[4]} ios={adding ? 'xmark' : 'plus'} android={adding ? 'close' : 'person_add'} onPress={() => setAdding((value) => !value)} tone="primary" />}
            />
            <PremiumInput value={search} onChangeText={setSearch} placeholder={c[3]} returnKeyType="search" icon={{ ios: 'magnifyingglass', android: 'search' }} />
            {adding ? (
              <Surface style={styles.editor} elevated>
                <View style={styles.editorHeader}><View style={[styles.editorIcon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="person.badge.plus" android="person_add" color={theme.accentText} size={21} /></View><Text style={[styles.editorTitle, { color: theme.text }]}>{c[4]}</Text></View>
                <PremiumInput label={c[5]} value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} placeholder={c[5]} icon={{ ios: 'person.fill', android: 'person' }} />
                <PremiumInput label={c[6]} value={form.phone} onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} placeholder={c[6]} keyboardType="phone-pad" icon={{ ios: 'phone.fill', android: 'call' }} />
                <PremiumInput label={c[7]} value={form.email} onChangeText={(email) => setForm((value) => ({ ...value, email }))} placeholder={c[7]} keyboardType="email-address" autoCapitalize="none" icon={{ ios: 'envelope.fill', android: 'mail' }} />
                <View style={styles.actions}>
                  <PremiumButton title={c[9]} onPress={() => setAdding(false)} tone="secondary" style={styles.flex} />
                  <PremiumButton title={c[8]} loading={create.isPending} disabled={form.name.trim().length < 2} onPress={() => create.mutate()} style={styles.flex} />
                </View>
              </Surface>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? <View style={styles.loader}><ActivityIndicator color={theme.accent} size="large" /></View> : query.isError ? (
            <StateCard title={c[10]} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c[11]} onPress={() => query.refetch()} tone="secondary" />} />
          ) : <StateCard title={c[1]} icon={{ ios: 'person.2.fill', android: 'group' }} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/(business)/client-detail', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow, opacity: pressed ? 0.76 : 1 }]}
          >
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}><Text style={[styles.initial, { color: theme.accentText }]}>{item.name?.slice(0, 1).toLocaleUpperCase()}</Text></View>
            <View style={styles.clientCopy}><Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{item.name}</Text><Text numberOfLines={1} style={[styles.contact, { color: theme.muted }]}>{item.phone ?? item.email ?? '—'}</Text></View>
            <View style={[styles.bookings, { backgroundColor: theme.accentSubtle }]}><Text style={[styles.bookingsCount, { color: theme.text }]}>{item.bookings_count ?? 0}</Text><Text style={[styles.bookingsLabel, { color: theme.muted }]}>{c[2]}</Text></View>
            <VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={18} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: ui.screenGutter, paddingBottom: 34 },
  headerContent: { gap: 15, marginBottom: 16 },
  editor: { padding: 15, gap: 12 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  editorIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  editorTitle: ui.type.sectionTitle,
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  loader: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 9 },
  card: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderWidth: 1, borderRadius: ui.radius.large, ...ui.shadow.card },
  avatar: { width: 50, height: 50, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  clientCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  contact: { ...ui.type.caption, marginTop: 3 },
  bookings: { minWidth: 48, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 11, alignItems: 'center' },
  bookingsCount: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  bookingsLabel: { fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 1 },
});
