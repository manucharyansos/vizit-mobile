import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VizitIcon } from "@/components/vizit-icon";
import { useApp } from "@/providers/app-provider";
import { clientAccountApi } from "@/services/api/client-account";
import { tokenStore } from "@/services/api/client";
import { publicApi, type PublicBusiness } from "@/services/api/public";

const copy = {
  hy: {
    greeting: "Բարի երեկո",
    title: "Ի՞նչ կամրագրենք այսօր",
    search: "Բիզնես, կլինիկա, ծառայություն…",
    next: "Հաջորդ այցը",
    directions: "Բացել",
    categories: "Հայտնի ուղղություններ",
    businesses: "Առաջարկվող վայրեր",
    noBooking: "Մոտակա ամրագրում չկա",
    book: "Ամրագրել",
    guest: "հյուր",
    theme: "Փոխել թեման",
    language: "Փոխել լեզուն",
  },
  ru: {
    greeting: "Добрый вечер",
    title: "Что запишем сегодня",
    search: "Бизнес, клиника, услуга…",
    next: "Следующая запись",
    directions: "Открыть",
    categories: "Популярные направления",
    businesses: "Рекомендуемые места",
    noBooking: "Ближайших записей нет",
    book: "Записаться",
    guest: "гость",
    theme: "Сменить тему",
    language: "Сменить язык",
  },
  en: {
    greeting: "Good evening",
    title: "What shall we book today",
    search: "Business, clinic, service…",
    next: "Next booking",
    directions: "Open",
    categories: "Popular categories",
    businesses: "Recommended places",
    noBooking: "No upcoming booking",
    book: "Book",
    guest: "guest",
    theme: "Change theme",
    language: "Change language",
  },
};

export default function DiscoverScreen() {
  const { locale, setLocale, mode, theme, toggleMode } = useApp();
  const c = copy[locale];
  const [search, setSearch] = useState("");
  const [openedAt] = useState(() => Date.now());
  const token = useQuery({
    queryKey: ["client-token"],
    queryFn: () => tokenStore.get("client"),
    staleTime: Infinity,
  });
  const me = useQuery({
    queryKey: ["client-me"],
    queryFn: clientAccountApi.me,
    enabled: Boolean(token.data),
    retry: false,
  });
  const bookings = useQuery({
    queryKey: ["client-bookings"],
    queryFn: clientAccountApi.bookings,
    enabled: Boolean(token.data),
    retry: false,
  });
  const businesses = useQuery({
    queryKey: ["businesses", locale],
    queryFn: () => publicApi.businesses({ locale }),
  });
  const filtered = useMemo(() => {
    const value = search.trim().toLocaleLowerCase(locale);
    if (!value) return businesses.data ?? [];
    return (businesses.data ?? []).filter((item) =>
      [item.name, item.category_name, item.address].some((field) =>
        field?.toLocaleLowerCase(locale).includes(value),
      ),
    );
  }, [businesses.data, locale, search]);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          (businesses.data ?? [])
            .map((item) => item.category_name)
            .filter((value): value is string => Boolean(value)),
        ),
      ).slice(0, 8),
    [businesses.data],
  );
  const nextBooking = useMemo(
    () =>
      (bookings.data ?? [])
        .filter(
          (item) =>
            new Date(item.starts_at).getTime() >= openedAt &&
            !["cancelled", "canceled"].includes(item.status),
        )
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0],
    [bookings.data, openedAt],
  );
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(openedAt);
        date.setDate(date.getDate() + index);
        return date;
      }),
    [openedAt],
  );
  const displayName = me.data?.name?.split(" ")[0] ?? c.guest;
  const featureBackground = mode === "dark" ? "#2A2E34" : "#4B5563";
  const featureRaised = mode === "dark" ? "#3B4047" : "#6B7280";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.business_id}-${item.slug}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.brandWrap}>
                <View style={[styles.logoMark, { backgroundColor: theme.plum }]}>
                  <Text style={styles.logoLetter}>V</Text>
                </View>
                <Text style={[styles.brand, { color: theme.text }]}>Vizit</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.theme}
                  onPress={toggleMode}
                  style={[styles.headerControl, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <VizitIcon
                    ios={mode === "dark" ? "sun.max.fill" : "moon.fill"}
                    android={mode === "dark" ? "light_mode" : "dark_mode"}
                    color={theme.text}
                    size={21}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.language}
                  onPress={() =>
                    setLocale(
                      locale === "hy" ? "ru" : locale === "ru" ? "en" : "hy",
                    )
                  }
                  style={[styles.avatar, { backgroundColor: theme.plum }]}
                >
                  <Text style={styles.avatarText}>{locale.toUpperCase()}</Text>
                </Pressable>
              </View>
            </View>
            <Text style={[styles.greeting, { color: theme.muted }]}>
              {c.greeting}, {displayName}
            </Text>
            <Text style={[styles.hero, { color: theme.text }]}>{c.title}</Text>
            <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <VizitIcon
                ios="magnifyingglass"
                android="search"
                color={theme.muted}
                size={27}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={c.search}
                placeholderTextColor={theme.muted}
                returnKeyType="search"
                style={[styles.searchInput, { color: theme.text }]}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")}>
                  <VizitIcon
                    ios="xmark.circle.fill"
                    android="cancel"
                    color={theme.muted}
                    size={20}
                  />
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.days}
            >
              {days.map((date, index) => (
                <View
                  key={date.toISOString()}
                  style={[
                    styles.day,
                    {
                      backgroundColor: index === 0 ? theme.plum : theme.surface,
                      borderColor: index === 0 ? theme.plum : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.weekday,
                      { color: index === 0 ? "#FFFFFF" : theme.muted },
                    ]}
                  >
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                    }).format(date)}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: index === 0 ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Text style={[styles.sectionTitle, { color: theme.muted }]}>{c.next}</Text>
            {bookings.isLoading ? (
              <ActivityIndicator color={theme.plum} style={styles.loader} />
            ) : nextBooking ? (
              <Pressable
                onPress={() => router.push("/(customer)/bookings")}
                style={[styles.nextCard, { backgroundColor: featureBackground }]}
              >
                <View style={styles.nextInfo}>
                  <Text style={styles.nextBusiness}>
                    {nextBooking.business?.name ?? "Vizit"}
                  </Text>
                  <Text style={styles.nextService}>
                    {nextBooking.service?.name ??
                      nextBooking.staff?.name ??
                      "—"}
                  </Text>
                </View>
                <View style={[styles.nextTime, { backgroundColor: featureRaised }]}>
                  <Text style={styles.nextDay}>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                    }).format(new Date(nextBooking.starts_at))}
                  </Text>
                  <Text style={styles.nextHour}>
                    {nextBooking.starts_at.slice(11, 16)}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/map")}
                style={[styles.emptyNext, { backgroundColor: featureBackground }]}
              >
                <Text style={styles.emptyText}>{c.noBooking}</Text>
                <Text style={styles.bookText}>{c.book} →</Text>
              </Pressable>
            )}
            {categories.length ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.muted }]}>{c.categories}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categories}
                >
                  {categories.map((name, index) => (
                    <Pressable
                      key={name}
                      onPress={() => setSearch(name)}
                      style={[styles.category, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <VizitIcon
                        ios={index % 2 ? "heart.text.square" : "sparkles"}
                        android={index % 2 ? "favorite" : "spa"}
                        color={theme.plum}
                        size={27}
                      />
                      <Text numberOfLines={2} style={[styles.categoryText, { color: theme.text }]}>
                        {name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <View style={styles.businessHeading}>
              <Text style={[styles.sectionTitle, { color: theme.muted }]}>{c.businesses}</Text>
              <Pressable onPress={() => router.push("/map")}>
                <VizitIcon
                  ios="map.fill"
                  android="map"
                  color={theme.plum}
                  size={23}
                />
              </Pressable>
            </View>
            {businesses.isLoading ? (
              <ActivityIndicator color={theme.plum} />
            ) : null}
          </>
        }
        renderItem={({ item }) => <BusinessRow item={item} label={c.book} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !businesses.isLoading ? <Text style={[styles.emptyList, { color: theme.muted }]}>—</Text> : null
        }
      />
    </SafeAreaView>
  );
}

function BusinessRow({ item, label }: { item: PublicBusiness; label: string }) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/business/[slug]",
          params: { slug: item.slug },
        })
      }
      style={[styles.business, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={[styles.businessImage, { backgroundColor: theme.peachSoft }]}>
        {item.logo_url || item.cover_url ? (
          <Image
            source={item.logo_url ?? item.cover_url}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.fallback, { color: theme.plum }]}>{item.name.slice(0, 1)}</Text>
        )}
      </View>
      <View style={styles.businessInfo}>
        <Text numberOfLines={1} style={[styles.businessName, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={[styles.businessMeta, { color: theme.muted }]}>
          {item.category_name ?? item.address ?? "Vizit"}
        </Text>
      </View>
      <View style={[styles.open, { backgroundColor: theme.plum }]}>
        <Text style={styles.openText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginBottom: 56,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerControl: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", letterSpacing: -1 },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  avatar: {
    width: 49,
    height: 49,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  greeting: { fontSize: 17, marginBottom: 8 },
  hero: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginBottom: 29,
  },
  search: {
    minHeight: 61,
    borderRadius: 17,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  days: { gap: 11, paddingVertical: 24 },
  day: {
    width: 77,
    height: 82,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekday: { fontSize: 13, textTransform: "capitalize" },
  dayNumber: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 13,
    marginTop: 7,
  },
  loader: { minHeight: 120 },
  nextCard: {
    minHeight: 130,
    borderRadius: 19,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  nextInfo: { flex: 1 },
  nextBusiness: { color: "#F9FAFB", fontSize: 21, fontWeight: "800" },
  nextService: { color: "#E5E7EB", fontSize: 15, marginTop: 8 },
  nextTime: {
    minWidth: 84,
    borderRadius: 15,
    padding: 13,
    alignItems: "center",
  },
  nextDay: { color: "#E5E7EB", textTransform: "capitalize" },
  nextHour: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 5 },
  emptyNext: {
    minHeight: 92,
    borderRadius: 17,
    padding: 18,
    marginBottom: 24,
    justifyContent: "center",
  },
  emptyText: { color: "#E5E7EB" },
  bookText: { color: "#FFFFFF", fontWeight: "800", marginTop: 8 },
  categories: { gap: 11, paddingBottom: 24 },
  category: {
    width: 132,
    minHeight: 112,
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    justifyContent: "space-between",
  },
  categoryText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  businessHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  business: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  businessImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: { fontSize: 24, fontWeight: "900" },
  businessInfo: { flex: 1 },
  businessName: { fontSize: 15, fontWeight: "800" },
  businessMeta: { fontSize: 12, marginTop: 5 },
  open: {
    paddingHorizontal: 11,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  openText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  emptyList: { textAlign: "center", padding: 30 },
});
