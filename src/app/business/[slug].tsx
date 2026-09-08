import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { publicApi } from '@/services/api/public';

export default function BusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, theme } = useApp();
  const insets = useSafeAreaInsets();
  const business = useQuery({ queryKey: ['business', slug], queryFn: () => publicApi.business(slug), enabled: Boolean(slug) });
  const locationId = business.data?.locations[0]?.id;
  const services = useQuery({ queryKey: ['services', slug, locationId], queryFn: () => publicApi.services(slug, locationId), enabled: Boolean(slug && locationId) });
  const staff = useQuery({ queryKey: ['staff', slug, locationId], queryFn: () => publicApi.staff(slug, locationId), enabled: Boolean(slug && locationId) });
  if (business.isLoading) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.plum} /></SafeAreaView>;
  if (!business.data) return <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}><Text style={{ color: theme.danger }}>{t('loadError')}</Text></SafeAreaView>;
  const item = business.data;
  const address = item.locations[0]?.address ?? item.address;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 104 + insets.bottom }]}>
      <View style={[styles.cover, { backgroundColor: theme.cream }]}>
        {item.cover_url ? <Image source={item.cover_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : item.logo_url ? <Image source={item.logo_url} style={styles.coverLogo} contentFit="contain" /> : <Text style={[styles.coverLetter, { color: theme.plum }]}>{item.name.slice(0, 1).toUpperCase()}</Text>}
        <View style={styles.coverShade} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()} style={[styles.circleButton, styles.back, { backgroundColor: theme.surface }]}><VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={22} /></Pressable>
      </View>
      <View style={[styles.summary, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
        <View style={[styles.logo, { backgroundColor: theme.peachSoft, borderColor: theme.surface }]}>{item.logo_url ? <Image source={item.logo_url} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={[styles.logoLetter, { color: theme.plum }]}>{item.name.slice(0, 1).toUpperCase()}</Text>}</View>
        <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
        {item.category_name ? <Text style={[styles.category, { color: theme.gold }]}>{item.category_name}</Text> : null}
        {address ? <View style={styles.metaRow}><VizitIcon ios="location.fill" android="location_on" color={theme.muted} size={17} /><Text style={[styles.metaText, { color: theme.muted }]}>{address}</Text></View> : null}
        {item.phone ? <View style={styles.metaRow}><VizitIcon ios="phone.fill" android="call" color={theme.muted} size={16} /><Text style={[styles.metaText, { color: theme.muted }]}>{item.phone}</Text></View> : null}
      </View>
      {item.short_description || item.description ? <Text style={[styles.description, { color: theme.muted }]}>{item.short_description ?? item.description}</Text> : null}
      <Section title={t('services')} loading={services.isLoading}>
        {services.data?.map((service) => <View key={service.id} style={[styles.service, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.serviceIcon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="sparkles" android="spa" color={theme.plum} size={20} /></View>
          <View style={styles.serviceBody}><Text style={[styles.rowTitle, { color: theme.text }]}>{service.name}</Text><View style={styles.duration}><VizitIcon ios="clock" android="schedule" color={theme.muted} size={14} /><Text style={[styles.smallText, { color: theme.muted }]}>{service.duration_minutes} min</Text></View></View>
          <Text style={[styles.price, { color: theme.plumStrong }]}>{service.price.toLocaleString()} {service.currency}</Text>
        </View>)}
      </Section>
      <Section title={t('staff')} loading={staff.isLoading}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
          {staff.data?.map((person) => <View key={person.id} style={[styles.person, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {person.avatar_url ? <Image source={person.avatar_url} style={styles.avatar} contentFit="cover" /> : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.peachSoft }]}><VizitIcon ios="person.fill" android="person" color={theme.plum} size={27} /></View>}
            <Text numberOfLines={1} style={[styles.personName, { color: theme.text }]}>{person.name}</Text>{person.role ? <Text numberOfLines={1} style={[styles.personRole, { color: theme.muted }]}>{person.role}</Text> : null}
          </View>)}
        </ScrollView>
      </Section>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.background, borderColor: theme.border }]}><Pressable onPress={() => router.push({ pathname: '/book/[slug]', params: { slug, locationId: String(locationId ?? '') } })} style={({ pressed }) => [styles.cta, { backgroundColor: theme.plum, opacity: pressed ? 0.88 : 1 }]}><Text style={styles.ctaText}>{t('bookNow')}</Text><VizitIcon ios="arrow.right" android="arrow_forward" color="#FFFFFF" size={19} /></Pressable></View>
  </SafeAreaView>;
}

function Section({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  const { theme } = useApp();
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>{loading ? <ActivityIndicator color={theme.plum} style={{ padding: 20 }} /> : children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { paddingBottom: 112 }, cover: { height: 238, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, coverShade: { position: 'absolute', inset: 0, backgroundColor: '#090D184D' }, coverLogo: { width: 104, height: 104 }, coverLetter: { fontSize: 74, fontWeight: '900' }, circleButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, back: { position: 'absolute', left: 18, top: 14 },
  summary: { marginHorizontal: 18, marginTop: -28, padding: 18, paddingTop: 42, borderRadius: 14, alignItems: 'center', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, logo: { position: 'absolute', top: -32, width: 68, height: 68, borderRadius: 12, borderWidth: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, logoLetter: { fontSize: 27, fontWeight: '900' }, title: { fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.55, textAlign: 'center' }, category: { fontSize: 12, fontWeight: '800', marginTop: 5 }, metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 9 }, metaText: { fontSize: 13, textAlign: 'center', flexShrink: 1 }, description: { fontSize: 15, lineHeight: 23, marginHorizontal: 22, marginTop: 20 },
  section: { marginTop: 28, gap: 10 }, sectionTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.35, marginHorizontal: 20, marginBottom: 2 }, service: { minHeight: 82, marginHorizontal: 18, padding: 13, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, serviceIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, serviceBody: { flex: 1 }, rowTitle: { fontSize: 15, lineHeight: 19, fontWeight: '800' }, duration: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }, smallText: { fontSize: 12 }, price: { fontSize: 13, fontWeight: '900' },
  people: { paddingHorizontal: 18, gap: 10 }, person: { width: 124, padding: 10, borderRadius: 19, borderWidth: 1, alignItems: 'center' }, avatar: { width: 72, height: 72, borderRadius: 22 }, avatarFallback: { alignItems: 'center', justifyContent: 'center' }, personName: { width: '100%', textAlign: 'center', fontSize: 13, fontWeight: '800', marginTop: 9 }, personRole: { width: '100%', textAlign: 'center', fontSize: 11, marginTop: 3 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 }, cta: { height: 56, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
