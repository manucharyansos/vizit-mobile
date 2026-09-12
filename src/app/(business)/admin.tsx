import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, PageHeader, PremiumButton, PremiumInput, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessOnboardingStatus, BusinessSettings } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';

type ShortcutIcon = 'grid_view' | 'group' | 'schedule' | 'location_on' | 'photo_library';
type ModuleItem = { title: string; icon: ShortcutIcon; route: string };

const copy = {
  hy: {
    title: 'Կառավարում', subtitle: 'Բիզնեսի էջ և սկզբնական կարգավորում', setup: 'Ավարտեք բիզնեսի կարգավորումը', servicesHint: 'Ստեղծեք առաջին ծառայությունը։', scheduleHint: 'Կարգավորեք աշխատանքային օրերն ու ժամերը, որպեսզի հաճախորդները տեսնեն իրական ազատ ժամերը։', settingsHint: 'Ստուգեք բիզնեսի տվյալները և հրապարակեք էջը։', service: 'Առաջին ծառայության անուն', duration: 'Տևողություն՝ րոպե', price: 'Գին՝ ֏', add: 'Ավելացնել ծառայությունը', schedule: 'Կարգավորել աշխատանքային ժամերը', complete: 'Ավարտել և հրապարակել', profile: 'Բիզնեսի տվյալներ', phone: 'Հեռախոս', address: 'Հասցե', description: 'Կարճ նկարագրություն', publicProfile: 'Հանրային էջ', marketplace: 'Ցուցադրել որոնման մեջ', save: 'Պահպանել փոփոխությունները', saved: 'Փոփոխությունները պահպանված են', failed: 'Գործողությունը չհաջողվեց', services: 'Ծառայություններ', staff: 'Աշխատակիցներ', locations: 'Հասցեներ և քարտեզ', hours: 'Աշխատանքային ժամեր', media: 'Լոգո և նկարներ', loadError: 'Չհաջողվեց բեռնել տվյալները', retry: 'Կրկին փորձել', tools: 'Արագ կառավարում', step: 'Քայլ', enabled: 'Միացված է', disabled: 'Անջատված է' },
  ru: {
    title: 'Управление', subtitle: 'Страница бизнеса и первоначальная настройка', setup: 'Завершите настройку бизнеса', servicesHint: 'Создайте первую услугу.', scheduleHint: 'Настройте рабочие дни и часы, чтобы клиенты видели реальные свободные слоты.', settingsHint: 'Проверьте данные бизнеса и опубликуйте страницу.', service: 'Название первой услуги', duration: 'Длительность, минуты', price: 'Цена, ֏', add: 'Добавить услугу', schedule: 'Настроить рабочие часы', complete: 'Завершить и опубликовать', profile: 'Данные бизнеса', phone: 'Телефон', address: 'Адрес', description: 'Краткое описание', publicProfile: 'Публичная страница', marketplace: 'Показывать в поиске', save: 'Сохранить изменения', saved: 'Изменения сохранены', failed: 'Не удалось выполнить действие', services: 'Услуги', staff: 'Сотрудники', locations: 'Адреса и карта', hours: 'Рабочие часы', media: 'Логотип и фото', loadError: 'Не удалось загрузить данные', retry: 'Повторить', tools: 'Быстрое управление', step: 'Шаг', enabled: 'Включено', disabled: 'Отключено' },
  en: {
    title: 'Management', subtitle: 'Business profile and initial setup', setup: 'Finish business setup', servicesHint: 'Create your first service.', scheduleHint: 'Set working days and hours so customers see real available slots.', settingsHint: 'Review the business details and publish the profile.', service: 'First service name', duration: 'Duration, minutes', price: 'Price, ֏', add: 'Add service', schedule: 'Set working hours', complete: 'Finish and publish', profile: 'Business details', phone: 'Phone', address: 'Address', description: 'Short description', publicProfile: 'Public profile', marketplace: 'Show in search', save: 'Save changes', saved: 'Changes saved', failed: 'The action failed', services: 'Services', staff: 'Team', locations: 'Locations and map', hours: 'Working hours', media: 'Logo and images', loadError: 'Could not load data', retry: 'Try again', tools: 'Quick management', step: 'Step', enabled: 'Enabled', disabled: 'Disabled' },
};

export default function BusinessAdmin() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const settingsQuery = useQuery<BusinessSettings>({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const onboardingQuery = useQuery<BusinessOnboardingStatus>({ queryKey: ['business-onboarding'], queryFn: businessApi.onboardingStatus, retry: false });
  const [formEdits, setFormEdits] = useState<Partial<{ phone: string; address: string; short_description: string; is_public_profile_enabled: boolean; is_marketplace_visible: boolean }>>({});
  const [service, setService] = useState({ name: '', duration: '60', price: '' });
  const form = {
    phone: settingsQuery.data?.phone ?? '',
    address: settingsQuery.data?.address ?? '',
    short_description: settingsQuery.data?.short_description ?? '',
    is_public_profile_enabled: Boolean(settingsQuery.data?.is_public_profile_enabled),
    is_marketplace_visible: Boolean(settingsQuery.data?.is_marketplace_visible),
    ...formEdits,
  };

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
      setFormEdits({});
      Alert.alert(c.saved);
    },
    onError: fail,
  });
  const primaryLocation = settingsQuery.data?.locations?.find((location) => location.is_primary) ?? settingsQuery.data?.locations?.[0];
  const addService = useMutation({
    mutationFn: () => businessApi.createService({ name: service.name.trim(), duration_minutes: Number(service.duration), price: service.price ? Number(service.price) : 0, currency: 'AMD', location_id: primaryLocation?.id }),
    onSuccess: async () => { setService({ name: '', duration: '60', price: '' }); await cache.invalidateQueries({ queryKey: ['business-services'] }); await refreshOnboarding(); },
    onError: fail,
  });
  const complete = useMutation({ mutationFn: businessApi.completeOnboarding, onSuccess: () => { cache.clear(); router.replace('/(business)/today'); }, onError: fail });

  const onboarding = onboardingQuery.data;
  const incomplete = Boolean(onboarding && !onboarding.is_onboarding_completed);
  const step = onboarding?.onboarding_step ?? 'services';
  const stepNumber = step === 'services' ? 1 : step === 'schedule' ? 2 : 3;
  const anyError = settingsQuery.isError || onboardingQuery.isError;
  const retry = () => void Promise.all([settingsQuery.refetch(), onboardingQuery.refetch()]);
  const modules: ModuleItem[] = [
    { title: c.services, icon: 'grid_view', route: '/(business)/services' },
    { title: c.staff, icon: 'group', route: '/(business)/staff' },
    { title: c.hours, icon: 'schedule', route: '/(business)/working-hours' },
    { title: c.locations, icon: 'location_on', route: '/(business)/locations' },
    { title: c.media, icon: 'photo_library', route: '/(business)/profile-media' },
  ];

  if (settingsQuery.isLoading || onboardingQuery.isLoading) return <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Vizit Business" title={c.title} subtitle={c.subtitle} />

        {anyError ? <StateCard title={c.loadError} tone="danger" action={<PremiumButton title={c.retry} onPress={retry} tone="secondary" />} /> : null}

        {incomplete ? (
          <Surface style={[styles.setupCard, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
            <View style={styles.setupTop}><View><Text style={[styles.setupEyebrow, { color: theme.onPrimary }]}>{c.step.toLocaleUpperCase()} {stepNumber}/3</Text><Text style={[styles.setupTitle, { color: theme.onPrimary }]}>{c.setup}</Text></View><View style={[styles.stepBadge, { backgroundColor: 'rgba(255,255,255,0.13)' }]}><Text style={[styles.stepValue, { color: theme.onPrimary }]}>{stepNumber}</Text></View></View>
            <View style={styles.stepTrack}>{[1, 2, 3].map((value) => <View key={value} style={[styles.stepSegment, { backgroundColor: value <= stepNumber ? theme.onPrimary : 'rgba(255,255,255,0.18)' }]} />)}</View>
            <Text style={[styles.hint, { color: theme.onPrimary }]}>{step === 'services' ? c.servicesHint : step === 'schedule' ? c.scheduleHint : c.settingsHint}</Text>
            {step === 'services' ? (
              <View style={styles.setupForm}>
                <PremiumInput label={c.service} value={service.name} onChangeText={(name) => setService((value) => ({ ...value, name }))} placeholder={c.service} icon={{ ios: 'sparkles', android: 'spa' }} />
                <View style={styles.row}><PremiumInput label={c.duration} value={service.duration} onChangeText={(duration) => setService((value) => ({ ...value, duration }))} placeholder={c.duration} keyboardType="number-pad" containerStyle={styles.flex} icon={{ ios: 'clock.fill', android: 'schedule' }} /><PremiumInput label={c.price} value={service.price} onChangeText={(price) => setService((value) => ({ ...value, price }))} placeholder={c.price} keyboardType="number-pad" containerStyle={styles.flex} icon={{ ios: 'banknote.fill', android: 'payments' }} /></View>
                <PremiumButton title={c.add} loading={addService.isPending} disabled={service.name.trim().length < 2} onPress={() => addService.mutate()} tone="secondary" />
              </View>
            ) : null}
            {step === 'schedule' ? <PremiumButton title={c.schedule} onPress={() => router.push('/(business)/working-hours' as Href)} tone="secondary" icon={{ ios: 'calendar', android: 'calendar_month' }} /> : null}
            {step === 'settings' ? <PremiumButton title={c.complete} loading={complete.isPending} onPress={() => complete.mutate()} tone="secondary" icon={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} /> : null}
          </Surface>
        ) : null}

        <Surface style={styles.card} elevated>
          <View style={styles.profileHeading}><View><Text style={[styles.profileName, { color: theme.text }]}>{settingsQuery.data?.name ?? onboarding?.business_name ?? c.profile}</Text><Text style={[styles.profileEyebrow, { color: theme.muted }]}>{c.profile}</Text></View><StatusPill label={form.is_public_profile_enabled ? c.enabled : c.disabled} tone={form.is_public_profile_enabled ? 'success' : 'neutral'} /></View>
          <PremiumInput label={c.phone} value={form.phone} onChangeText={(phone) => setFormEdits((value) => ({ ...value, phone }))} placeholder={c.phone} keyboardType="phone-pad" icon={{ ios: 'phone.fill', android: 'call' }} />
          <PremiumInput label={c.address} value={form.address} onChangeText={(address) => setFormEdits((value) => ({ ...value, address }))} placeholder={c.address} icon={{ ios: 'location.fill', android: 'location_on' }} />
          <PremiumInput label={c.description} value={form.short_description} onChangeText={(short_description) => setFormEdits((value) => ({ ...value, short_description }))} placeholder={c.description} multiline icon={{ ios: 'text.alignleft', android: 'notes' }} />
          <SettingToggle label={c.publicProfile} value={form.is_public_profile_enabled} onChange={(is_public_profile_enabled) => setFormEdits((value) => ({ ...value, is_public_profile_enabled }))} />
          <SettingToggle label={c.marketplace} value={form.is_marketplace_visible} onChange={(is_marketplace_visible) => setFormEdits((value) => ({ ...value, is_marketplace_visible }))} />
          <PremiumButton title={c.save} loading={save.isPending} onPress={() => save.mutate()} icon={{ ios: 'checkmark', android: 'check' }} />
        </Surface>

        <Text style={[styles.toolsTitle, { color: theme.muted }]}>{c.tools.toLocaleUpperCase()}</Text>
        <Surface style={styles.moduleCard} elevated>
          {modules.map((module, index) => <Module key={module.route} item={module} last={index === modules.length - 1} />)}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { theme } = useApp();
  return <View style={[styles.toggle, { backgroundColor: theme.accentSubtle }]}><Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: theme.borderStrong, true: theme.accent }} thumbColor={theme.surfaceRaised} /></View>;
}

function Module({ item, last }: { item: ModuleItem; last: boolean }) {
  const { theme } = useApp();
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => router.push(item.route as Href)} style={({ pressed }) => [styles.module, { backgroundColor: pressed ? theme.surfacePressed : 'transparent' }]}>
        <View style={[styles.moduleIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="square.grid.2x2.fill" android={item.icon} color={theme.accentText} size={20} /></View><Text style={[styles.moduleText, { color: theme.text }]}>{item.title}</Text><VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={19} />
      </Pressable>
      {!last ? <View style={styles.divider}><Divider /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: ui.screenGutter, paddingBottom: 44, gap: 14 },
  setupCard: { padding: 17, gap: 14 },
  setupTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  setupEyebrow: { ...ui.type.eyebrow, opacity: 0.68 },
  setupTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800', marginTop: 6 },
  stepBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  stepTrack: { flexDirection: 'row', gap: 5 },
  stepSegment: { flex: 1, height: 3, borderRadius: 2 },
  hint: { ...ui.type.body, opacity: 0.78 },
  setupForm: { gap: 11 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  card: { padding: 15, gap: 12 },
  profileHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  profileName: ui.type.sectionTitle,
  profileEyebrow: { ...ui.type.caption, marginTop: 3 },
  toggle: { minHeight: 52, borderRadius: ui.radius.medium, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  toggleLabel: { ...ui.type.body, flex: 1, fontWeight: '700' },
  toolsTitle: ui.type.eyebrow,
  moduleCard: { padding: 5, overflow: 'hidden' },
  module: { minHeight: 58, borderRadius: ui.radius.medium, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  moduleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moduleText: { ...ui.type.body, flex: 1, fontWeight: '700' },
  divider: { paddingLeft: 56, paddingRight: 8 },
});
