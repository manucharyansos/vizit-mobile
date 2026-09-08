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

const palette = {
  background: "#071624",
  surface: "#0E2940",
  surfaceStrong: "#123653",
  accent: "#378ADD",
  accentStrong: "#15558E",
  text: "#F3F8FD",
  muted: "#7390AA",
  soft: "#A9C7E2",
  border: "#173B57",
};
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
  },
};

export default function DiscoverScreen() {
  const { locale, setLocale } = useApp();
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
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.business_id}-${item.slug}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.brandWrap}>
                <Image
                  source={require("../../../assets/images/vizit-brand-mark.png")}
                  style={styles.logo}
                  contentFit="contain"
                />
                <Text style={styles.brand}>Vizit</Text>
              </View>
              <Pressable
                onPress={() =>
                  setLocale(
                    locale === "hy" ? "ru" : locale === "ru" ? "en" : "hy",
                  )
                }
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{locale.toUpperCase()}</Text>
              </Pressable>
            </View>
            <Text style={styles.greeting}>
              {c.greeting}, {displayName}
            </Text>
            <Text style={styles.hero}>{c.title}</Text>
            <View style={styles.search}>
              <VizitIcon
                ios="magnifyingglass"
                android="search"
                color={palette.muted}
                size={27}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={c.search}
                placeholderTextColor={palette.muted}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")}>
                  <VizitIcon
                    ios="xmark.circle.fill"
                    android="cancel"
                    color={palette.muted}
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
                  style={[styles.day, index === 0 && styles.dayActive]}
                >
                  <Text
                    style={[
                      styles.weekday,
                      index === 0 && styles.dayActiveText,
                    ]}
                  >
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                    }).format(date)}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      index === 0 && styles.dayActiveText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.sectionTitle}>{c.next}</Text>
            {bookings.isLoading ? (
              <ActivityIndicator color={palette.accent} style={styles.loader} />
            ) : nextBooking ? (
              <Pressable
                onPress={() => router.push("/(customer)/bookings")}
                style={styles.nextCard}
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
                <View style={styles.nextTime}>
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
                style={styles.emptyNext}
              >
                <Text style={styles.emptyText}>{c.noBooking}</Text>
                <Text style={styles.bookText}>{c.book} →</Text>
              </Pressable>
            )}
            {categories.length ? (
              <>
                <Text style={styles.sectionTitle}>{c.categories}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categories}
                >
                  {categories.map((name, index) => (
                    <Pressable
                      key={name}
                      onPress={() => setSearch(name)}
                      style={styles.category}
                    >
                      <VizitIcon
                        ios={index % 2 ? "heart.text.square" : "sparkles"}
                        android={index % 2 ? "favorite" : "spa"}
                        color="#7DBCF4"
                        size={27}
                      />
                      <Text numberOfLines={2} style={styles.categoryText}>
                        {name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <View style={styles.businessHeading}>
              <Text style={styles.sectionTitle}>{c.businesses}</Text>
              <Pressable onPress={() => router.push("/map")}>
                <VizitIcon
                  ios="map.fill"
                  android="map"
                  color={palette.accent}
                  size={23}
                />
              </Pressable>
            </View>
            {businesses.isLoading ? (
              <ActivityIndicator color={palette.accent} />
            ) : null}
          </>
        }
        renderItem={({ item }) => <BusinessRow item={item} label={c.book} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !businesses.isLoading ? <Text style={styles.emptyList}>—</Text> : null
        }
      />
    </SafeAreaView>
  );
}

function BusinessRow({ item, label }: { item: PublicBusiness; label: string }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/business/[slug]",
          params: { slug: item.slug },
        })
      }
      style={styles.business}
    >
      <View style={styles.businessImage}>
        {item.logo_url || item.cover_url ? (
          <Image
            source={item.logo_url ?? item.cover_url}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.fallback}>{item.name.slice(0, 1)}</Text>
        )}
      </View>
      <View style={styles.businessInfo}>
        <Text numberOfLines={1} style={styles.businessName}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.businessMeta}>
          {item.category_name ?? item.address ?? "Vizit"}
        </Text>
      </View>
      <View style={styles.open}>
        <Text style={styles.openText}>{label}</Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginBottom: 56,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: {
    width: 45,
    height: 45,
  },
  brand: {
    color: palette.text,
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
    backgroundColor: "#15558E",
  },
  avatarText: { color: "#CDE5FA", fontWeight: "800", fontSize: 12 },
  greeting: { color: palette.muted, fontSize: 17, marginBottom: 8 },
  hero: {
    color: palette.text,
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  days: { gap: 11, paddingVertical: 24 },
  day: {
    width: 77,
    height: 82,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  weekday: { color: palette.muted, fontSize: 13, textTransform: "capitalize" },
  dayNumber: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 5,
  },
  dayActiveText: { color: "#FFFFFF" },
  sectionTitle: {
    color: palette.muted,
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
    backgroundColor: palette.accentStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  nextInfo: { flex: 1 },
  nextBusiness: { color: "#E7F3FE", fontSize: 21, fontWeight: "800" },
  nextService: { color: palette.soft, fontSize: 15, marginTop: 8 },
  nextTime: {
    minWidth: 84,
    borderRadius: 15,
    backgroundColor: "#2575BB",
    padding: 13,
    alignItems: "center",
  },
  nextDay: { color: "#CBE5FA", textTransform: "capitalize" },
  nextHour: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 5 },
  emptyNext: {
    minHeight: 92,
    borderRadius: 17,
    padding: 18,
    marginBottom: 24,
    backgroundColor: palette.accentStrong,
    justifyContent: "center",
  },
  emptyText: { color: palette.soft },
  bookText: { color: "#FFFFFF", fontWeight: "800", marginTop: 8 },
  categories: { gap: 11, paddingBottom: 24 },
  category: {
    width: 132,
    minHeight: 112,
    borderRadius: 17,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 15,
    justifyContent: "space-between",
  },
  categoryText: {
    color: "#D8E8F6",
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  businessImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: palette.surfaceStrong,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: { color: palette.accent, fontSize: 24, fontWeight: "900" },
  businessInfo: { flex: 1 },
  businessName: { color: palette.text, fontSize: 15, fontWeight: "800" },
  businessMeta: { color: palette.muted, fontSize: 12, marginTop: 5 },
  open: {
    paddingHorizontal: 11,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#15558E",
    alignItems: "center",
    justifyContent: "center",
  },
  openText: { color: "#DCEFFF", fontSize: 11, fontWeight: "800" },
  emptyList: { color: palette.muted, textAlign: "center", padding: 30 },
});
