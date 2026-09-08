import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VizitIcon } from "@/components/vizit-icon";
import { useApp } from "@/providers/app-provider";
import { businessApi } from "@/services/api/business";

const copy = {
  hy: [
    "Գլխավոր",
    "Բիզնեսի ընդհանուր պատկերը",
    "Այսօր",
    "Ամրագրումներ",
    "Հաճախորդներ",
    "Աշխատակիցներ",
    "Ծառայություններ",
    "Եկամուտ",
  ],
  ru: [
    "Главная",
    "Обзор бизнеса",
    "Сегодня",
    "Записи",
    "Клиенты",
    "Сотрудники",
    "Услуги",
    "Доход",
  ],
  en: [
    "Dashboard",
    "Business overview",
    "Today",
    "Bookings",
    "Clients",
    "Team",
    "Services",
    "Revenue",
  ],
};
const dashboardOpenedAt = new Date();
const pickNumber = (
  root: Record<string, unknown> | undefined,
  keys: string[],
) => {
  for (const key of keys) {
    const value = key
      .split(".")
      .reduce<unknown>(
        (current, part) =>
          current && typeof current === "object"
            ? (current as Record<string, unknown>)[part]
            : undefined,
        root,
      );
    if (typeof value === "number") return value;
  }
  return 0;
};

export default function BusinessDashboard() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const query = useQuery<Record<string, unknown>>({
    queryKey: ["business-dashboard"],
    queryFn: businessApi.dashboard,
    retry: false,
  });
  const data = query.data;
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(dashboardOpenedAt);
  const cards = [
    [
      c[3],
      pickNumber(data, [
        "today.bookings",
        "stats.today_bookings",
        "bookings.today",
      ]),
      "calendar_month",
    ],
    [
      c[4],
      pickNumber(data, ["counts.clients", "stats.clients", "clients"]),
      "group",
    ],
    [c[5], pickNumber(data, ["counts.staff", "stats.staff", "staff"]), "badge"],
    [
      c[6],
      pickNumber(data, ["counts.services", "stats.services", "services"]),
      "grid_view",
    ],
  ] as const;
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: theme.plumSoft }]}>
            <VizitIcon
              ios="chart.bar.fill"
              android="dashboard"
              color={theme.plum}
              size={25}
            />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{c[0]}</Text>
            <Text style={{ color: theme.muted }}>{c[1]}</Text>
          </View>
        </View>
        <View style={[styles.todayStrip, { backgroundColor: theme.plumSoft, borderColor: theme.border }]}>
          <View><Text style={[styles.todayLabel, { color: theme.muted }]}>{c[2]}</Text><Text style={[styles.todayDate, { color: theme.text }]}>{dateLabel}</Text></View>
          <Pressable onPress={() => router.push("/(business)/new-booking" as never)} style={[styles.quickAdd, { backgroundColor: theme.plum }]}><VizitIcon ios="plus" android="add" color="#FFF" size={23} /></Pressable>
        </View>
        {query.isLoading ? (
          <ActivityIndicator color={theme.plum} />
        ) : (
          <View style={styles.grid}>
            {cards.map(([label, value, icon]) => (
              <View
                key={label}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceRaised,
                    borderColor: theme.border,
                  },
                ]}
              >
                <VizitIcon
                  ios="chart.bar.fill"
                  android={icon}
                  color={theme.gold}
                  size={23}
                />
                <Text style={[styles.value, { color: theme.text }]}>
                  {value}
                </Text>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 22 },
  heading: { flexDirection: "row", alignItems: "center", gap: 13 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 27, fontWeight: "900" },
  todayStrip: { minHeight: 92, borderRadius: 16, borderWidth: 1, padding: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  todayLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  todayDate: { fontSize: 18, fontWeight: "900", marginTop: 6, textTransform: "capitalize" },
  quickAdd: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    minHeight: 135,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  value: { fontSize: 30, fontWeight: "900", marginTop: 15 },
  label: { fontSize: 13, fontWeight: "700" },
});
