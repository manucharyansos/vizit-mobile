import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup, IconButton, PremiumButton, SectionHeader, StateCard } from '@/components/premium-ui';
import { BusinessListSkeleton } from '@/components/loading-skeleton';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';
import { useClientSession } from '@/hooks/use-client-session';
import { APP_TIME_ZONE, apiDateToLocal, formatApiTime } from '@/services/date-time';
import { isBookingTerminal } from '@/services/booking-status';
import { businessCategory } from '@/services/business-category';
import { publicApi, type PublicBusiness } from '@/services/api/public';

const copy = {
  hy: {
    greeting: 'Բարի երեկո',
    title: 'Ի՞նչ կամրագրենք այսօր',
    search: 'Բիզնես, կլինիկա, ծառայություն…',
    next: 'Հաջորդ այցը',
    categories: 'Հայտնի ուղղություններ',
    businesses: 'Առաջարկվող վայրեր',
    noBooking: 'Մոտակա ամրագրում չկա',
    noBookingHint: 'Գտիր հարմար ծառայությունն ու ընտրիր քո ժամը։',
    book: 'Ամրագրել',
    guest: 'հյուր',
    theme: 'Փոխել թեման',
    language: 'Փոխել լեզուն',
    map: 'Բացել քարտեզը',
    clear: 'Մաքրել որոնումը',
    noResults: 'Ոչինչ չգտնվեց',
  },
  ru: {
    greeting: 'Добрый вечер',
    title: 'Что запишем сегодня',
    search: 'Бизнес, клиника, услуга…',
    next: 'Следующая запись',
    categories: 'Популярные направления',
    businesses: 'Рекомендуемые места',
    noBooking: 'Ближайших записей нет',
    noBookingHint: 'Найдите услугу и выберите удобное время.',
    book: 'Записаться',
    guest: 'гость',
    theme: 'Сменить тему',
    language: 'Сменить язык',
    map: 'Открыть карту',
    clear: 'Очистить поиск',
    noResults: 'Ничего не найдено',
  },
  en: {
    greeting: 'Good evening',
    title: 'What shall we book today',
    search: 'Business, clinic, service…',
    next: 'Next booking',
    categories: 'Popular categories',
    businesses: 'Recommended places',
    noBooking: 'No upcoming booking',
    noBookingHint: 'Find the right service and choose your time.',
    book: 'Book',
    guest: 'guest',
    theme: 'Change theme',
    language: 'Change language',
    map: 'Open map',
    clear: 'Clear search',
    noResults: 'No results found',
  },
};

export default function DiscoverScreen() {
  const { locale, setLocale, mode, theme, toggleMode, t } = useApp();
  const c = copy[locale];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const token = useClientSession();
  const me = useQuery({ queryKey: ['client-me'], queryFn: clientAccountApi.me, enabled: Boolean(token.data), retry: false });
  const bookings = useQuery({ queryKey: ['client-bookings'], queryFn: clientAccountApi.bookings, enabled: Boolean(token.data), retry: false });
  const businesses = useQuery({ queryKey: ['businesses', locale, debouncedSearch], queryFn: () => publicApi.businesses({ locale, search: debouncedSearch || undefined }) });

  const filtered = (businesses.data ?? []).filter((item) => !category || item.category_name === category);
  const categories = useMemo(
    () => Array.from(new Set((businesses.data ?? []).map((item) => businessCategory(item, locale)).filter((value): value is string => Boolean(value)))).slice(0, 8),
    [businesses.data, locale],
  );
  const nextBooking = useMemo(
    () => (token.data ? bookings.data ?? [] : [])
      .filter((item) => (apiDateToLocal(item.starts_at)?.getTime() ?? 0) >= openedAt && !isBookingTerminal(item.status))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0],
    [bookings.data, openedAt, token.data],
  );


  const displayName = token.data ? me.data?.name?.split(' ')[0] ?? c.guest : c.guest;
  const featureBackground = mode === 'dark' ? theme.surfaceElevated : theme.primary;
  const featureText = mode === 'dark' ? theme.text : theme.onPrimary;
  const featureMuted = mode === 'dark' ? theme.muted : 'rgba(255,255,255,0.70)';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={filtered}
        refreshing={businesses.isRefetching}
        onRefresh={() => { setOpenedAt(Date.now()); void businesses.refetch(); if (token.data) { void me.refetch(); void bookings.refetch(); } }}
        keyExtractor={(item) => `${item.business_id}-${item.slug}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <BrandLockup compact />
              <View style={styles.headerActions}>
                <IconButton
                  ios={mode === 'dark' ? 'sun.max.fill' : 'moon.fill'}
                  android={mode === 'dark' ? 'light_mode' : 'dark_mode'}
                  accessibilityLabel={c.theme}
                  onPress={toggleMode}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.language}
                  onPress={() => setLocale(locale === 'hy' ? 'ru' : locale === 'ru' ? 'en' : 'hy')}
                  style={({ pressed }) => [styles.language, { backgroundColor: theme.primary, opacity: pressed ? 0.78 : 1 }]}
                >
                  <Text style={[styles.languageText, { color: theme.onPrimary }]}>{locale.toUpperCase()}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.heroBlock}>
              <Text style={[styles.greeting, { color: theme.accentText }]}>{locale === 'hy' ? 'Բարի գալուստ' : locale === 'ru' ? 'Добро пожаловать' : 'Welcome'}, {displayName}</Text>
              <Text style={[styles.hero, { color: theme.text }]}>{c.title}</Text>
            </View>

            <View style={[styles.search, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
              <VizitIcon ios="magnifyingglass" android="search" color={theme.faint} size={22} />
              <TextInput
                value={search}
                onChangeText={(value) => { setSearch(value); setCategory(null); }}
                placeholder={c.search}
                placeholderTextColor={theme.faint}
                returnKeyType="search"
                selectionColor={theme.accent}
                style={[styles.searchInput, { color: theme.text }]}
              />
              {search ? (
                <Pressable accessibilityRole="button" accessibilityLabel={c.clear} hitSlop={8} onPress={() => setSearch('')}>
                  <VizitIcon ios="xmark.circle.fill" android="cancel" color={theme.faint} size={20} />
                </Pressable>
              ) : null}
            </View>



            <SectionHeader title={c.next} />
            {nextBooking ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(customer)/bookings')}
                style={({ pressed }) => [styles.nextCard, { backgroundColor: featureBackground, borderColor: mode === 'dark' ? theme.borderStrong : featureBackground, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.nextAccent, { backgroundColor: theme.accent }]} />
                <View style={styles.nextInfo}>
                  <Text style={[styles.nextEyebrow, { color: featureMuted }]}>{c.next.toLocaleUpperCase()}</Text>
                  <Text numberOfLines={1} style={[styles.nextBusiness, { color: featureText }]}>{nextBooking.business?.name ?? 'Vizit'}</Text>
                  <Text numberOfLines={1} style={[styles.nextService, { color: featureMuted }]}>{nextBooking.service?.name ?? nextBooking.staff?.name ?? '—'}</Text>
                </View>
                <View style={[styles.nextTime, { backgroundColor: mode === 'dark' ? theme.accentSoft : 'rgba(255,255,255,0.10)', borderColor: mode === 'dark' ? theme.borderStrong : 'rgba(255,255,255,0.16)' }]}>
                  <Text style={[styles.nextDay, { color: featureMuted }]}>{new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: APP_TIME_ZONE }).format(apiDateToLocal(nextBooking.starts_at) ?? new Date())}</Text>
                  <Text style={[styles.nextHour, { color: featureText }]}>{formatApiTime(nextBooking.starts_at, locale)}</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/map')}
                style={({ pressed }) => [styles.emptyNext, { backgroundColor: featureBackground, borderColor: mode === 'dark' ? theme.borderStrong : featureBackground, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.emptyNextText}>
                  <Text style={[styles.emptyTitle, { color: featureText }]}>{c.noBooking}</Text>
                  <Text style={[styles.emptyHint, { color: featureMuted }]}>{c.noBookingHint}</Text>
                </View>
                <View style={[styles.emptyArrow, { backgroundColor: mode === 'dark' ? theme.accentSoft : 'rgba(255,255,255,0.12)' }]}>
                  <VizitIcon ios="arrow.up.right" android="north_east" color={featureText} size={19} />
                </View>
              </Pressable>
            )}

            {categories.length ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title={c.categories} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                  {categories.map((name, index) => (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: (businesses.data ?? []).some((item) => item.category_name === category && businessCategory(item, locale) === name) }}
                      onPress={() => { const key = businesses.data?.find((item) => businessCategory(item, locale) === name)?.category_name ?? null; setCategory((current) => current === key ? null : key); setSearch(''); }}
                      style={({ pressed }) => [styles.category, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, opacity: pressed ? 0.74 : 1 }]}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: theme.accentSubtle }]}>
                        <VizitIcon ios={index % 2 ? 'heart.text.square' : 'sparkles'} android={index % 2 ? 'favorite' : 'spa'} color={theme.accentText} size={21} />
                      </View>
                      <Text numberOfLines={2} style={[styles.categoryText, { color: theme.text }]}>{name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.businessHeading}>
              <SectionHeader title={c.businesses} />
              <IconButton ios="map.fill" android="map" accessibilityLabel={c.map} onPress={() => router.push('/map')} tone="accent" />
            </View>
            {businesses.isLoading ? <BusinessListSkeleton count={3} /> : null}
          </>
        }
        renderItem={({ item }) => <BusinessRow item={item} label={c.book} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={businesses.isError ? <StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={locale === 'hy' ? 'Կրկին փորձել' : locale === 'ru' ? 'Повторить' : 'Try again'} onPress={() => void businesses.refetch()} tone="secondary" />} /> : !businesses.isLoading ? <View style={styles.emptyList}><VizitIcon ios="magnifyingglass" android="search_off" color={theme.faint} size={28} /><Text style={[styles.emptyListText, { color: theme.muted }]}>{c.noResults}</Text></View> : null}
      />
    </SafeAreaView>
  );
}

function BusinessRow({ item, label }: { item: PublicBusiness; label: string }) {
  const { theme, locale } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${label}`}
      onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: item.slug } })}
      style={({ pressed }) => [styles.business, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow, opacity: pressed ? 0.78 : 1 }]}
    >
      <View style={[styles.businessImage, { backgroundColor: theme.accentSubtle }]}>
        {item.logo_url || item.cover_url ? (
          <Image source={item.logo_url ?? item.cover_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
        ) : (
          <Text style={[styles.fallback, { color: theme.accentText }]}>{item.name.slice(0, 1).toLocaleUpperCase()}</Text>
        )}
      </View>
      <View style={styles.businessInfo}>
        <Text numberOfLines={1} style={[styles.businessName, { color: theme.text }]}>{item.name}</Text>
        <Text numberOfLines={1} style={[styles.businessMeta, { color: theme.muted }]}>{businessCategory(item, locale) ?? item.address ?? 'Vizit'}</Text>
        {item.address && businessCategory(item, locale) ? <Text numberOfLines={1} style={[styles.businessAddress, { color: theme.faint }]}>{item.address}</Text> : null}
      </View>
      <View style={[styles.open, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.openText, { color: theme.accentText }]}>{label}</Text>
        <VizitIcon ios="chevron.right" android="chevron_right" color={theme.accentText} size={15} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: ui.screenGutter, paddingBottom: 32 },
  header: { minHeight: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  language: { width: 46, height: 44, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' },
  languageText: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.7 },
  heroBlock: { paddingTop: 31, paddingBottom: 22 },
  greeting: { ...ui.type.body, fontWeight: '700', marginBottom: 5 },
  hero: ui.type.display,
  search: { minHeight: 56, borderRadius: ui.radius.large, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, ...ui.shadow.card },
  searchInput: { flex: 1, minHeight: 50, fontSize: 15, lineHeight: 20, paddingVertical: 0 },
  days: { gap: 8, paddingTop: 18, paddingBottom: 24 },
  day: { width: 58, height: 68, borderRadius: ui.radius.medium, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 11, lineHeight: 14, fontWeight: '700', textTransform: 'capitalize' },
  dayNumber: { fontSize: 19, lineHeight: 24, fontWeight: '800', marginTop: 3 },
  nextCard: { minHeight: 128, borderRadius: ui.radius.large, borderWidth: 1, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 11, overflow: 'hidden' },
  nextAccent: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  nextInfo: { flex: 1 },
  nextEyebrow: { ...ui.type.eyebrow, marginBottom: 7 },
  nextBusiness: { fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.25 },
  nextService: { ...ui.type.body, marginTop: 5 },
  nextTime: { minWidth: 78, borderWidth: 1, borderRadius: ui.radius.medium, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  nextDay: { ...ui.type.caption, textTransform: 'capitalize' },
  nextHour: { fontSize: 21, lineHeight: 25, fontWeight: '800', marginTop: 3 },
  emptyNext: { minHeight: 108, borderRadius: ui.radius.large, borderWidth: 1, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 11 },
  emptyNextText: { flex: 1 },
  emptyTitle: { ...ui.type.cardTitle },
  emptyHint: { ...ui.type.caption, marginTop: 5 },
  emptyArrow: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionBlock: { marginTop: 25 },
  categories: { gap: 9, paddingTop: 11, paddingBottom: 2 },
  category: { width: 126, minHeight: 96, borderRadius: ui.radius.large, borderWidth: 1, padding: 13, justifyContent: 'space-between' },
  categoryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  categoryText: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  businessHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  business: { minHeight: 92, borderRadius: ui.radius.large, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11, ...ui.shadow.card },
  businessImage: { width: 68, height: 68, borderRadius: ui.radius.medium, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fallback: { fontSize: 25, lineHeight: 30, fontWeight: '800' },
  businessInfo: { flex: 1, minWidth: 0 },
  businessName: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  businessMeta: { ...ui.type.caption, marginTop: 3 },
  businessAddress: { fontSize: 11, lineHeight: 15, fontWeight: '500', marginTop: 2 },
  open: { minHeight: 34, borderRadius: 11, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  openText: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
  separator: { height: 10 },
  emptyList: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyListText: ui.type.body,
});
