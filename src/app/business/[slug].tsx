import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, PremiumButton, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { publicApi } from '@/services/api/public';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: { location: 'Մասնաճյուղ', emptyServices: 'Այս մասնաճյուղում ծառայություններ չկան', emptyStaff: 'Այս մասնաճյուղում աշխատակիցներ չկան', retry: 'Կրկին փորձել' },
  ru: { location: 'Филиал', emptyServices: 'В этом филиале пока нет услуг', emptyStaff: 'В этом филиале пока нет сотрудников', retry: 'Повторить' },
  en: { location: 'Location', emptyServices: 'No services at this location yet', emptyStaff: 'No team members at this location yet', retry: 'Try again' },
};

export default function BusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale, t, theme } = useApp();
  const c = copy[locale];
  const insets = useSafeAreaInsets();
  const [chosenLocationId, setChosenLocationId] = useState<number>();
  const business = useQuery({ queryKey: ['business', slug], queryFn: () => publicApi.business(slug), enabled: Boolean(slug), retry: false });
  const locations = business.data?.locations ?? [];
  const selectedLocation = locations.find((location) => location.id === chosenLocationId) ?? locations[0];
  const locationId = selectedLocation?.id;
  const services = useQuery({ queryKey: ['services', slug, locationId], queryFn: () => publicApi.services(slug, locationId), enabled: Boolean(slug && locationId), retry: false });
  const staff = useQuery({ queryKey: ['staff', slug, locationId], queryFn: () => publicApi.staff(slug, locationId), enabled: Boolean(slug && locationId), retry: false });

  if (business.isLoading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} size="large" /></SafeAreaView>;
  }
  if (business.isError || !business.data) {
    return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={c.retry} onPress={() => business.refetch()} tone="secondary" />} /></SafeAreaView>;
  }

  const item = business.data;
  const address = selectedLocation?.address ?? item.address;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 104 + insets.bottom }]}>
        <View style={[styles.cover, { backgroundColor: theme.surface }]}>
          {item.cover_url ? <Image source={item.cover_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={220} /> : item.logo_url ? <Image source={item.logo_url} style={styles.coverLogo} contentFit="contain" /> : <Text style={[styles.coverLetter, { color: theme.accentText }]}>{item.name.slice(0, 1).toLocaleUpperCase()}</Text>}
          <View style={[styles.coverShade, { backgroundColor: theme.scrim }]} />
          <IconButton accessibilityLabel={t('back')} ios="chevron.left" android="chevron_left" onPress={() => safeBack('/(customer)/discover')} style={styles.back} />
        </View>

        <Surface style={styles.summary} elevated>
          <View style={[styles.logo, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceRaised }]}>
            {item.logo_url ? <Image source={item.logo_url} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={[styles.logoLetter, { color: theme.accentText }]}>{item.name.slice(0, 1).toLocaleUpperCase()}</Text>}
          </View>
          <View style={styles.summaryBody}>
            <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
            {item.category_name ? <View style={styles.category}><StatusPill label={item.category_name} tone="accent" /></View> : null}
            {address ? <MetaRow icon={{ ios: 'location.fill', android: 'location_on' }} value={address} /> : null}
            {item.phone ? <MetaRow icon={{ ios: 'phone.fill', android: 'call' }} value={item.phone} /> : null}
          </View>
        </Surface>

        {item.locations.length > 1 ? (
          <View style={styles.locationSection}>
            <SectionHeader title={c.location} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locations}>
              {item.locations.map((location, index) => {
                const selected = location.id === locationId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={location.id}
                    onPress={() => setChosenLocationId(location.id)}
                    style={({ pressed }) => [styles.locationChip, { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accentSoft : theme.surfaceRaised, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <VizitIcon ios="mappin" android="location_on" color={selected ? theme.accentText : theme.faint} size={16} />
                    <Text style={[styles.locationText, { color: selected ? theme.accentText : theme.text }]}>{location.name || location.address || `${c.location} ${index + 1}`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {item.short_description || item.description ? <Text style={[styles.description, { color: theme.textSecondary }]}>{item.short_description ?? item.description}</Text> : null}

        <Section title={t('services')} loading={services.isLoading} error={services.isError} retry={() => services.refetch()} empty={!services.data?.length ? c.emptyServices : undefined}>
          <View style={styles.verticalList}>
            {services.data?.map((service) => (
              <View key={service.id} style={[styles.service, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
                {service.image_url ? <Image source={service.image_url} style={styles.serviceImage} contentFit="cover" /> : <View style={[styles.serviceIcon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="sparkles" android="spa" color={theme.accentText} size={20} /></View>}
                <View style={styles.serviceBody}>
                  <Text numberOfLines={2} style={[styles.rowTitle, { color: theme.text }]}>{service.name}</Text>
                  <View style={styles.duration}><VizitIcon ios="clock" android="schedule" color={theme.faint} size={14} /><Text style={[styles.smallText, { color: theme.muted }]}>{service.duration_minutes} min</Text></View>
                </View>
                <Text style={[styles.price, { color: theme.text }]}>{service.price.toLocaleString()} <Text style={[styles.currency, { color: theme.muted }]}>{service.currency}</Text></Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title={t('staff')} loading={staff.isLoading} error={staff.isError} retry={() => staff.refetch()} empty={!staff.data?.length ? c.emptyStaff : undefined}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
            {staff.data?.map((person) => (
              <View key={person.id} style={[styles.person, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
                {person.avatar_url ? <Image source={person.avatar_url} style={styles.avatar} contentFit="cover" /> : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="person.fill" android="person" color={theme.accentText} size={27} /></View>}
                <Text numberOfLines={1} style={[styles.personName, { color: theme.text }]}>{person.name}</Text>
                {person.role ? <Text numberOfLines={1} style={[styles.personRole, { color: theme.muted }]}>{person.role}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </Section>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <PremiumButton
          disabled={!locationId}
          title={t('bookNow')}
          onPress={() => router.push({ pathname: '/book/[slug]', params: { slug, locationId: String(locationId ?? '') } })}
          icon={{ ios: 'arrow.right', android: 'arrow_forward' }}
        />
      </View>
    </SafeAreaView>
  );
}

function MetaRow({ icon, value }: { icon: { ios: 'location.fill' | 'phone.fill'; android: 'location_on' | 'call' }; value: string }) {
  const { theme } = useApp();
  return <View style={styles.metaRow}><VizitIcon ios={icon.ios} android={icon.android} color={theme.faint} size={16} /><Text style={[styles.metaText, { color: theme.muted }]}>{value}</Text></View>;
}

function Section({ title, loading, error, retry, empty, children }: { title: string; loading: boolean; error?: boolean; retry: () => void; empty?: string; children: React.ReactNode }) {
  const { t, theme } = useApp();
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}><SectionHeader title={title} /></View>
      {loading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : error ? (
        <Pressable accessibilityRole="button" onPress={retry} style={[styles.sectionState, { borderColor: theme.danger, backgroundColor: theme.dangerSoft }]}><Text style={{ color: theme.danger, fontWeight: '700' }}>{t('loadError')}</Text></Pressable>
      ) : empty ? <Text style={[styles.empty, { color: theme.muted }]}>{empty}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'stretch', justifyContent: 'center', padding: ui.screenGutter },
  content: { paddingBottom: 112 },
  cover: { height: 228, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.54 },
  coverLogo: { width: 104, height: 104 },
  coverLetter: { fontSize: 72, lineHeight: 80, fontWeight: '800' },
  back: { position: 'absolute', left: ui.screenGutter, top: 14 },
  summary: { marginHorizontal: ui.screenGutter, marginTop: -34, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  logo: { width: 68, height: 68, borderRadius: ui.radius.medium, borderWidth: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 27, lineHeight: 32, fontWeight: '800' },
  summaryBody: { flex: 1, minWidth: 0 },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.42 },
  category: { alignSelf: 'flex-start', marginTop: 7, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  metaText: { ...ui.type.caption, flex: 1 },
  description: { ...ui.type.body, marginHorizontal: ui.screenGutter, marginTop: 18 },
  locationSection: { marginTop: 22, gap: 10, paddingHorizontal: ui.screenGutter },
  locations: { gap: 8, paddingRight: ui.screenGutter },
  locationChip: { minHeight: 42, borderWidth: 1, borderRadius: ui.radius.small, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  locationText: { ...ui.type.caption },
  section: { marginTop: 28, gap: 10 },
  sectionTitle: { paddingHorizontal: ui.screenGutter },
  loader: { paddingVertical: 24 },
  verticalList: { gap: 9 },
  service: { minHeight: 82, marginHorizontal: ui.screenGutter, padding: 11, borderRadius: ui.radius.medium, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, ...ui.shadow.card },
  serviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceImage: { width: 48, height: 48, borderRadius: 14 },
  serviceBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  smallText: ui.type.caption,
  price: { fontSize: 14, lineHeight: 19, fontWeight: '800', textAlign: 'right' },
  currency: { fontSize: 10, fontWeight: '700' },
  people: { paddingHorizontal: ui.screenGutter, gap: 9 },
  person: { width: 126, padding: 10, borderRadius: ui.radius.large, borderWidth: 1, alignItems: 'center', ...ui.shadow.card },
  avatar: { width: 72, height: 72, borderRadius: ui.radius.medium },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  personName: { width: '100%', textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 9 },
  personRole: { width: '100%', textAlign: 'center', fontSize: 11, lineHeight: 15, marginTop: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: ui.screenGutter, paddingTop: 12, borderTopWidth: 1, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  sectionState: { marginHorizontal: ui.screenGutter, borderWidth: 1, borderRadius: ui.radius.medium, padding: 14 },
  empty: { marginHorizontal: ui.screenGutter, ...ui.type.body },
});
