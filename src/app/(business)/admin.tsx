import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessOnboardingStatus, BusinessSettings } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

const copy = {
  hy: {
    title: 'Կառավարում', subtitle: 'Բիզնեսի էջ և սկզբնական կարգավորում', setup: 'Ավարտեք բիզնեսի կարգավորումը',
    servicesHint: 'Ստեղծեք առաջին ծառայությունը։', scheduleHint: 'Կարգավորեք աշխատանքային օրերն ու ժամերը, որպեսզի հաճախորդները տեսնեն իրական ազատ ժամերը։', settingsHint: 'Ստուգեք բիզնեսի տվյալները և հրապարակեք էջը։',
    service: 'Առաջին ծառայության անուն', duration: 'Տևողություն՝ րոպե', price: 'Գին՝ ֏', add: 'Ավելացնել ծառայությունը', schedule: 'Կարգավորել աշխատանքային ժամերը', complete: 'Ավարտել և հրապարակել',
    profile: 'Բիզնեսի տվյալներ', phone: 'Հեռախոս', address: 'Հասցե', description: 'Կարճ նկարագրություն', publicProfile: 'Հանրային էջ', marketplace: 'Ցուցադրել որոնման մեջ', save: 'Պահպանել փոփոխությունները', saved: 'Փոփոխությունները պահպանված են', failed: 'Գործողությունը չհաջողվեց',
    services: 'Ծառայություններ', staff: 'Աշխատակիցներ', locations: 'Հասցեներ և քարտեզ', hours: 'Աշխատանքային ժամեր', media: 'Լոգո և նկարներ', loadError: 'Չհաջողվեց բեռնել տվյալները', retry: 'Կրկին փորձել',
  },
  ru: {
    title: 'Управление', subtitle: 'Страница бизнеса и первоначальная настройка', setup: 'Завершите настройку бизнеса',
    servicesHint: 'Создайте первую услугу.', scheduleHint: 'Настройте рабочие дни и часы, чтобы клиенты видели реальные свободные слоты.', settingsHint: 'Проверьте данные бизнеса и опубликуйте страницу.',
    service: 'Название первой услуги', duration: 'Длительность, минуты', price: 'Цена, ֏', add: 'Добавить услугу', schedule: 'Настроить рабочие часы', complete: 'Завершить и опубликовать',
    profile: 'Данные бизнеса', phone: 'Телефон', address: 'Адрес', description: 'Краткое описание', publicProfile: 'Публичная страница', marketplace: 'Показывать в поиске', save: 'Сохранить изменения', saved: 'Изменения сохранены', failed: 'Не удалось выполнить действие',
    services: 'Услуги', staff: 'Сотрудники', locations: 'Адреса и карта', hours: 'Рабочие часы', media: 'Логотип и фото', loadError: 'Не удалось загрузить данные', retry: 'Повторить',
  },
  en: {
    title: 'Management', subtitle: 'Business profile and initial setup', setup: 'Finish business setup',
    servicesHint: 'Create your first service.', scheduleHint: 'Set working days and hours so customers see real available slots.', settingsHint: 'Review the business details and publish the profile.',
    service: 'First service name', duration: 'Duration, minutes', price: 'Price, ֏', add: 'Add service', schedule: 'Set working hours', complete: 'Finish and publish',
    profile: 'Business details', phone: 'Phone', address: 'Address', description: 'Short description', publicProfile: 'Public profile', marketplace: 'Show in search', save: 'Save changes', saved: 'Changes saved', failed: 'The action failed',
    services: 'Services', staff: 'Team', locations: 'Locations and map', hours: 'Working hours', media: 'Logo and images', loadError: 'Could not load data', retry: 'Try again',
  },
};

export default function BusinessAdmin() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const settingsQuery = useQuery<BusinessSettings>({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const onboardingQuery = useQuery<BusinessOnboardingStatus>({ queryKey: ['business-onboarding'], queryFn: businessApi.onboardingStatus, retry: false });
  const [form, setForm] = useState({ phone: '', address: '', short_description: '', is_public_profile_enabled: false, is_marketplace_visible: false });
  const [service, setService] = useState({ name: '', duration: '60', price: '' });

  useEffect(() => {
    const value = settingsQuery.data;
    if (!value) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      phone: value.phone ?? '',
      address: value.address ?? '',
      short_description: value.short_description ?? '',
      is_public_profile_enabled: !!value.is_public_profile_enabled,
      is_marketplace_visible: !!value.is_marketplace_visible,
    });
  }, [settingsQuery.data]);

  const fail = (error: unknown) => Alert.alert(c.failed, apiErrorMessage(error));
  const refreshOnboarding = async () => {
    await cache.invalidateQueries({ queryKey: ['business-onboarding'] });
    await cache.refetchQueries({ queryKey: ['business-onboarding'], type: 'active' });
  };
  const save = useMutation({
    mutationFn: () => businessApi.updateSettings(form),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['business-settings'] });
      await cache.refetchQueries({ queryKey: ['business-settings'], type: 'active' });
      Alert.alert(c.saved);
    },
    onError: fail,
  });
  const primaryLocation = settingsQuery.data?.locations?.find((location) => location.is_primary) ?? settingsQuery.data?.locations?.[0];
  const addService = useMutation({
    mutationFn: () => businessApi.createService({
      name: service.name.trim(),
      duration_minutes: Number(service.duration),
      price: service.price ? Number(service.price) : 0,
      currency: 'AMD',
      location_id: primaryLocation?.id,
    }),
    onSuccess: async () => {
      setService({ name: '', duration: '60', price: '' });
      await cache.invalidateQueries({ queryKey: ['business-services'] });
      await refreshOnboarding();
    },
    onError: fail,
  });
  const complete = useMutation({
    mutationFn: businessApi.completeOnboarding,
    onSuccess: () => {
      cache.clear();
      router.replace('/(business)/today');
    },
    onError: fail,
  });

  const onboarding = onboardingQuery.data;
  const incomplete = !!onboarding && !onboarding.is_onboarding_completed;
  const step = onboarding?.onboarding_step ?? 'services';
  const anyError = settingsQuery.isError || onboardingQuery.isError;
  const retry = () => void Promise.all([settingsQuery.refetch(), onboardingQuery.refetch()]);
  const input = (key: 'phone' | 'address' | 'short_description', placeholder: string) => <TextInput value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={theme.muted} multiline={key === 'short_description'} style={[styles.input, key === 'short_description' && styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />;

  if (settingsQuery.isLoading || onboardingQuery.isLoading) return <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.plum} /></SafeAreaView>;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={[styles.icon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="gearshape.fill" android="settings" color={theme.plum} size={24} /></View><View style={styles.headerText}><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>{c.subtitle}</Text></View></View>

      {anyError ? <View style={[styles.error, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}><Text style={{ color: theme.danger, fontWeight: '800' }}>{c.loadError}</Text><Pressable onPress={retry}><Text style={{ color: theme.plum, fontWeight: '900' }}>{c.retry}</Text></Pressable></View> : null}

      {incomplete ? <View style={[styles.card, { backgroundColor: theme.plumSoft, borderColor: theme.peach }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{c.setup}</Text>
        <Text style={[styles.hint, { color: theme.muted }]}>{step === 'services' ? c.servicesHint : step === 'schedule' ? c.scheduleHint : c.settingsHint}</Text>
        {step === 'services' ? <>
          <TextInput value={service.name} onChangeText={(name) => setService((current) => ({ ...current, name }))} placeholder={c.service} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised }]} />
          <View style={styles.row}><TextInput value={service.duration} onChangeText={(duration) => setService((current) => ({ ...current, duration }))} placeholder={c.duration} keyboardType="number-pad" placeholderTextColor={theme.muted} style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised }]} /><TextInput value={service.price} onChangeText={(price) => setService((current) => ({ ...current, price }))} placeholder={c.price} keyboardType="number-pad" placeholderTextColor={theme.muted} style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised }]} /></View>
          <Pressable disabled={service.name.trim().length < 2 || addService.isPending} onPress={() => addService.mutate()} style={[styles.primary, { backgroundColor: theme.plum, opacity: service.name.trim().length >= 2 ? 1 : 0.4 }]}>{addService.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{c.add}</Text>}</Pressable>
        </> : null}
        {step === 'schedule' ? <Pressable onPress={() => router.push('/(business)/working-hours' as Href)} style={[styles.primary, { backgroundColor: theme.plum }]}><Text style={styles.primaryText}>{c.schedule}</Text></Pressable> : null}
        {step === 'settings' ? <Pressable disabled={complete.isPending} onPress={() => complete.mutate()} style={[styles.primary, { backgroundColor: theme.plum }]}>{complete.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{c.complete}</Text>}</Pressable> : null}
      </View> : null}

      <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{settingsQuery.data?.name ?? onboarding?.business_name ?? c.profile}</Text>
        <Text style={[styles.eyebrow, { color: theme.gold }]}>{c.profile}</Text>
        {input('phone', c.phone)}{input('address', c.address)}{input('short_description', c.description)}
        <View style={styles.toggle}><Text style={[styles.toggleLabel, { color: theme.text }]}>{c.publicProfile}</Text><Switch value={form.is_public_profile_enabled} onValueChange={(value) => setForm((current) => ({ ...current, is_public_profile_enabled: value }))} trackColor={{ false: theme.border, true: theme.plum }} /></View>
        <View style={styles.toggle}><Text style={[styles.toggleLabel, { color: theme.text }]}>{c.marketplace}</Text><Switch value={form.is_marketplace_visible} onValueChange={(value) => setForm((current) => ({ ...current, is_marketplace_visible: value }))} trackColor={{ false: theme.border, true: theme.plum }} /></View>
        <Pressable disabled={save.isPending} onPress={() => save.mutate()} style={[styles.primary, { backgroundColor: theme.plum }]}>{save.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{c.save}</Text>}</Pressable>
      </View>

      <View style={styles.grid}>
        <Module title={c.services} icon="grid_view" route="/(business)/services" />
        <Module title={c.staff} icon="group" route="/(business)/staff" />
        <Module title={c.hours} icon="schedule" route="/(business)/working-hours" />
        <Module title={c.locations} icon="location_on" route="/(business)/locations" />
        <Module title={c.media} icon="photo_library" route="/(business)/profile-media" />
      </View>
    </ScrollView>
  </SafeAreaView>;

  function Module({ title, icon, route }: { title: string; icon: string; route: string }) {
    return <Pressable onPress={() => router.push(route as Href)} style={({ pressed }) => [styles.module, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, opacity: pressed ? 0.75 : 1 }]}><View style={[styles.moduleIcon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="square.grid.2x2.fill" android={icon} color={theme.plum} size={21} /></View><Text style={[styles.moduleText, { color: theme.text }]}>{title}</Text><VizitIcon ios="chevron.right" android="chevron_right" color={theme.muted} size={19} /></Pressable>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { alignItems: 'center', justifyContent: 'center' }, content: { padding: 18, paddingBottom: 44, gap: 12 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 }, icon: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1 }, title: { fontSize: 27, fontWeight: '900' }, subtitle: { marginTop: 3, fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 11, padding: 14, gap: 10 }, sectionTitle: { fontSize: 18, fontWeight: '900' }, hint: { fontSize: 12, lineHeight: 18 }, eyebrow: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }, multiline: { minHeight: 82, paddingTop: 12, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
  toggle: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, toggleLabel: { flex: 1, fontWeight: '800' }, primary: { minHeight: 51, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, primaryText: { color: '#FFF', fontWeight: '900' },
  grid: { gap: 8 }, module: { minHeight: 60, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }, moduleIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, moduleText: { flex: 1, fontSize: 14, fontWeight: '800' }, error: { borderWidth: 1, borderRadius: 9, padding: 13, gap: 8 },
});
