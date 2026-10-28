import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, Surface } from './premium-ui';
import { ui } from '@/constants/vizit-theme';
import { rentalCopy } from '@/i18n/rentals';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { rentalApi } from '@/services/api/rentals';
import type { RentalRates } from '@/services/rentals';

export function RentalSettingsScreen({ galleryOnly = false }: { galleryOnly?: boolean }) {
  const { locale, theme, t } = useApp();
  const c = rentalCopy[locale];
  const cache = useQueryClient();
  const profile = useQuery({ queryKey: ['business-settings'], queryFn: businessApi.settings, retry: false });
  const rates = useQuery({ queryKey: ['business-rental-settings'], queryFn: rentalApi.settings, retry: false });
  const onboarding = useQuery({ queryKey: ['business-onboarding'], queryFn: businessApi.onboardingStatus, retry: false });
  const [edits, setEdits] = useState<Partial<Record<'hourly_price' | 'min_minutes' | 'max_minutes' | 'buffer_minutes' | 'slot_step_minutes', string>>>({});
  const [overnightEdit, setOvernight] = useState<boolean>();
  const [discountEdits, setDiscountEdits] = useState<{ hours: string; percent: string }[]>();
  const [profileEdits, setProfile] = useState<Partial<{ name: string; phone: string; address: string; short_description: string; is_public_profile_enabled: boolean; is_marketplace_visible: boolean }>>({});
  const fail = (error: unknown) => Alert.alert(c.failed, apiErrorMessage(error));
  const refresh = async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['business-rental-settings'] }), cache.invalidateQueries({ queryKey: ['business-onboarding'] }), cache.invalidateQueries({ queryKey: ['business-settings'] }), cache.invalidateQueries({ queryKey: ['business-rental-availability'] }), cache.invalidateQueries({ queryKey: ['rental-public-availability'] }), cache.invalidateQueries({ queryKey: ['business', profile.data?.slug] })]); };
  const value = (key: keyof typeof edits) => edits[key] ?? String(rates.data?.[key] ?? (key === 'hourly_price' ? '' : key === 'min_minutes' ? 60 : key === 'max_minutes' ? 240 : key === 'slot_step_minutes' ? 30 : 0));
  const discountRows = discountEdits ?? (rates.data?.duration_discounts ?? []).map((tier) => ({ hours: String(tier.min_minutes / 60), percent: String(tier.percent) }));
  const discountTiers = discountRows.map((row) => ({ min_minutes: Math.round(Number(row.hours.replace(',', '.')) * 60), percent: Number(row.percent) }));
  const validDiscounts = discountTiers.every((tier) => Number.isInteger(tier.min_minutes) && tier.min_minutes >= 15 && tier.min_minutes <= 43200 && Number.isInteger(tier.percent) && tier.percent >= 1 && tier.percent <= 90)
    && new Set(discountTiers.map((tier) => tier.min_minutes)).size === discountTiers.length;
  const setDiscountRow = (index: number, change: Partial<{ hours: string; percent: string }>) => setDiscountEdits(discountRows.map((row, n) => n === index ? { ...row, ...change } : row));
  const payload: RentalRates = { hourly_price: Number(value('hourly_price')), min_minutes: Number(value('min_minutes')), max_minutes: Number(value('max_minutes')), buffer_minutes: Number(value('buffer_minutes')), slot_step_minutes: Number(value('slot_step_minutes')), allow_overnight: overnightEdit ?? rates.data?.allow_overnight ?? false, duration_discounts: discountTiers };
  const valid = ['hourly_price', 'min_minutes', 'max_minutes', 'buffer_minutes', 'slot_step_minutes'].every((key) => /^\d+$/.test(value(key as keyof typeof edits))) && payload.hourly_price! <= 100000000 && payload.min_minutes >= 15 && payload.max_minutes <= 43200 && payload.max_minutes >= payload.min_minutes && payload.buffer_minutes <= 240 && [5, 10, 15, 20, 30, 60].includes(payload.slot_step_minutes) && payload.min_minutes % payload.slot_step_minutes === 0 && payload.max_minutes % payload.slot_step_minutes === 0 && Math.ceil(payload.hourly_price! * payload.max_minutes / 60) <= 4294967295;
  const save = useMutation({ mutationFn: () => rentalApi.saveSettings(payload), onSuccess: async () => { await refresh(); setEdits({}); setOvernight(undefined); setDiscountEdits(undefined); Alert.alert(c.saved); }, onError: fail });
  const form = { name: profile.data?.name ?? '', phone: profile.data?.phone ?? '', address: profile.data?.address ?? '', short_description: profile.data?.short_description ?? '', is_public_profile_enabled: Boolean(profile.data?.is_public_profile_enabled), is_marketplace_visible: Boolean(profile.data?.is_marketplace_visible), ...profileEdits };
  const saveProfile = useMutation({ mutationFn: () => businessApi.updateSettings(form), onSuccess: async () => { await refresh(); setProfile({}); Alert.alert(c.saved); }, onError: fail });
  const publish = useMutation({ mutationFn: businessApi.completeOnboarding, onSuccess: async () => { await cache.invalidateQueries({ queryKey: ['business-me'] }); await refresh(); router.replace('/(business)/dashboard'); }, onError: fail });
  const upload = useMutation({ mutationFn: async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error(c.galleryHint);
    const chosen = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 20 - (rates.data?.gallery.length ?? 0)), quality: 0.85 });
    if (chosen.canceled) return;
    try {
      for (const asset of chosen.assets.slice(0, Math.max(0, 20 - (rates.data?.gallery.length ?? 0)))) {
        const video = asset.type === 'video';
        if (asset.fileSize && asset.fileSize > (video ? 50 : 10) * 1024 * 1024) throw new Error(c.galleryHint);
        await rentalApi.upload({ uri: asset.uri, name: asset.fileName ?? `space-${Date.now()}.${video ? 'mp4' : 'jpg'}`, mimeType: asset.mimeType ?? (video ? 'video/mp4' : 'image/jpeg') });
      }
    } finally { await refresh(); }
  }, onError: (error) => Alert.alert(c.failed, error instanceof Error && !('response' in error) ? error.message : apiErrorMessage(error)) });
  const remove = useMutation({ mutationFn: rentalApi.removeMedia, onSuccess: refresh, onError: fail });
  const retry = () => { void profile.refetch(); void rates.refetch(); void onboarding.refetch(); };
  if (profile.isLoading || rates.isLoading || onboarding.isLoading) return <View style={[styles.screen, { justifyContent: 'center', backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} accessibilityLabel={c.loading} /></View>;
  if (profile.isError || rates.isError || onboarding.isError || !rates.data) return <StateCard title={c.failed} action={<PremiumButton title={c.retry} onPress={retry} />} />;
  const switchRow = (label: string, checked: boolean, onChange: (value: boolean) => void) => <View style={styles.row}><Text style={[styles.body, styles.flex, { color: theme.text }]}>{label}</Text><Switch accessibilityLabel={label} value={checked} onValueChange={onChange} trackColor={{ false: theme.borderStrong, true: theme.accent }} /></View>;
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow="Vizit Business" title={galleryOnly ? c.gallery : c.settings} subtitle={profile.data?.name} />
    {!galleryOnly && onboarding.data && !onboarding.data.is_onboarding_completed ? <Surface style={[styles.stack, { backgroundColor: theme.accentSubtle }]}><Text style={[styles.body, { color: theme.text }]}>{c.setupHint}</Text><PremiumButton title={c.publish} loading={publish.isPending} disabled={rates.data.hourly_price == null || save.isPending} onPress={() => publish.mutate()} /></Surface> : null}
    {!galleryOnly ? <>
    <Surface style={styles.stack}>
      <SectionHeader title={c.hourly} />
      {([['hourly_price', c.price], ['min_minutes', c.minimum], ['max_minutes', c.maximum], ['buffer_minutes', c.buffer], ['slot_step_minutes', `${c.step}, ${c.minutes}`]] as const).map(([key, label]) => <PremiumInput key={key} label={label} value={value(key)} keyboardType="number-pad" maxLength={10} onChangeText={(text) => setEdits((current) => ({ ...current, [key]: text }))} />)}
      {switchRow(c.overnightSetting, Boolean(payload.allow_overnight), setOvernight)}
      <Text style={[styles.caption, { color: theme.muted }]}>{c.dayHelp}</Text>
      <PremiumButton title={c.save} loading={save.isPending} disabled={!valid || !validDiscounts} onPress={() => save.mutate()} />
      <PremiumButton title={c.hoursSettings} tone="secondary" onPress={() => router.push('/(business)/working-hours')} />
    </Surface>
    <Surface style={styles.stack}>
      <SectionHeader title={c.discounts} />
      <Text style={[styles.caption, { color: theme.muted }]}>{c.discountsHelp}</Text>
      {!discountRows.length ? <Text style={[styles.body, { color: theme.muted }]}>{c.noDiscounts}</Text> : null}
      {discountRows.map((row, index) => <View key={index} style={styles.discountRow}>
        <View style={styles.flex}><PremiumInput label={c.discountFrom} value={row.hours} keyboardType="decimal-pad" maxLength={6} onChangeText={(hours) => setDiscountRow(index, { hours })} /></View>
        <View style={styles.flex}><PremiumInput label={c.discountPercent} value={row.percent} keyboardType="number-pad" maxLength={2} onChangeText={(percent) => setDiscountRow(index, { percent })} /></View>
        <PremiumButton title={c.removeDiscount} tone="danger" compact onPress={() => setDiscountEdits(discountRows.filter((_, n) => n !== index))} />
      </View>)}
      {!validDiscounts ? <Text style={[styles.caption, { color: theme.danger }]}>{c.discountInvalid}</Text> : null}
      <PremiumButton title={c.addDiscount} tone="secondary" disabled={discountRows.length >= 10} onPress={() => setDiscountEdits([...discountRows, { hours: discountRows.length ? String(Number(discountRows[discountRows.length - 1].hours.replace(',', '.')) + 2 || 3) : '3', percent: '5' }])} />
      <PremiumButton title={c.save} loading={save.isPending} disabled={!valid || !validDiscounts} onPress={() => save.mutate()} />
    </Surface>
    <Surface style={styles.stack}>
      <SectionHeader title={c.profile} />
      {([['name', c.title], ['phone', c.phone], ['address', t('address')], ['short_description', t('notes')]] as const).map(([key, label]) => <PremiumInput key={key} label={label} value={form[key]} keyboardType={key === 'phone' ? 'phone-pad' : 'default'} multiline={key === 'short_description'} onChangeText={(text) => setProfile((current) => ({ ...current, [key]: text }))} />)}
      {switchRow({ hy: 'Հանրային էջը հասանելի է', ru: 'Публичная страница доступна', en: 'Public profile enabled' }[locale], form.is_public_profile_enabled, (value) => setProfile((current) => ({ ...current, is_public_profile_enabled: value })))}
      {switchRow({ hy: 'Ցուցադրել որոնման մեջ', ru: 'Показывать в поиске', en: 'Show in discovery' }[locale], form.is_marketplace_visible, (value) => setProfile((current) => ({ ...current, is_marketplace_visible: value })))}
      <PremiumButton title={c.save} loading={saveProfile.isPending} disabled={form.name.trim().length < 2} onPress={() => saveProfile.mutate()} />
      <PremiumButton title={{ hy: 'Լոգո և շապիկ', ru: 'Логотип и обложка', en: 'Logo and cover' }[locale]} tone="secondary" onPress={() => router.push('/(business)/profile-media')} />
    </Surface>
    </> : null}
    <SectionHeader title={c.gallery} detail={c.galleryHint} />
    <PremiumButton title={c.addImage} loading={upload.isPending} disabled={rates.data.gallery.length >= 20 || remove.isPending} tone="secondary" onPress={() => upload.mutate()} />
    {rates.data.gallery.map((item) => <Surface key={item.id} style={styles.stack}>
      {item.kind === 'image' ? <Image source={item.url} accessibilityLabel={item.caption || c.gallery} contentFit="cover" style={styles.image} /> : <PremiumButton title={c.video} tone="secondary" onPress={() => void Linking.openURL(item.url).catch(() => Alert.alert(c.failed))} />}
      {item.caption ? <Text style={[styles.body, { color: theme.textSecondary }]}>{item.caption}</Text> : null}
      <PremiumButton title={c.remove} tone="danger" compact disabled={remove.isPending || upload.isPending} onPress={() => Alert.alert(c.remove, c.removeConfirm, [{ text: c.back, style: 'cancel' }, { text: c.remove, style: 'destructive', onPress: () => remove.mutate(item.id) }])} />
    </Surface>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: ui.screenGutter, paddingBottom: 32, gap: 18 }, stack: { gap: 14 }, flex: { flex: 1 }, discountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 }, body: ui.type.body, caption: ui.type.caption, image: { width: '100%', height: 200, borderRadius: ui.radius.medium } });
