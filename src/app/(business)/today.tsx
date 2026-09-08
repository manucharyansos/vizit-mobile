import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/providers/app-provider";
import { businessApi, CalendarBooking } from "@/services/api/business";
import { tokenStore } from "@/services/api/client";
import { VizitIcon } from "@/components/vizit-icon";

const today = () => new Date().toISOString().slice(0, 10);
const copy = {
  hy: {
    title: "Այսօրվա օրացույց",
    empty: "Այսօր ամրագրումներ չկան",
    client: "Հաճախորդ",
    confirm: "Հաստատել",
    done: "Ավարտված",
    noShow: "Չներկայացավ",
    add: "Նոր ամրագրում",
    logout: "Դուրս գալ",
    delete: "Ջնջել հաշիվը",
    deleteConfirm: "Ուղարկե՞լ բիզնես հաշվի և տվյալների ջնջման հայտը։",
    auth: "Մուտք գործիր բիզնես հաշվով",
  },
  ru: {
    title: "Календарь на сегодня",
    empty: "На сегодня записей нет",
    client: "Клиент",
    confirm: "Подтвердить",
    done: "Завершено",
    noShow: "Не пришёл",
    add: "Новая запись",
    logout: "Выйти",
    delete: "Удалить аккаунт",
    deleteConfirm: "Отправить запрос на удаление бизнес-аккаунта и данных?",
    auth: "Войдите в аккаунт бизнеса",
  },
  en: {
    title: "Today's calendar",
    empty: "No bookings today",
    client: "Client",
    confirm: "Confirm",
    done: "Done",
    noShow: "No-show",
    add: "New booking",
    logout: "Sign out",
    delete: "Delete account",
    deleteConfirm: "Request deletion of the business account and its data?",
    auth: "Sign in with a business account",
  },
};
export default function TodayScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const queryClient = useQueryClient();
  const date = today();
  const me = useQuery({
    queryKey: ["business-me"],
    queryFn: businessApi.me,
    retry: false,
  });
  const bookings = useQuery({
    queryKey: ["calendar", date],
    queryFn: () => businessApi.calendar(`${date} 00:00:00`, `${date} 23:59:59`),
    enabled: me.isSuccess,
    retry: false,
  });
  const status = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "confirm" | "done" | "no-show";
    }) => businessApi.updateStatus(id, action),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["calendar", date] }),
    onError: () => Alert.alert("Error"),
  });
  const requestDeletion = () =>
    Alert.alert(c.delete, c.deleteConfirm, [
      { text: c.logout, style: "cancel" },
      {
        text: c.delete,
        style: "destructive",
        onPress: async () => {
          await businessApi.requestAccountDeletion();
          queryClient.clear();
          router.replace("/(business)/login");
        },
      },
    ]);
  const logout = () =>
    Alert.alert(c.title, "", [
      {
        text: c.logout,
        onPress: async () => {
          await businessApi.logout();
          queryClient.clear();
          router.replace("/(business)/login");
        },
      },
      { text: c.delete, style: "destructive", onPress: requestDeletion },
    ]);
  if (me.isLoading)
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.plum} />
      </SafeAreaView>
    );
  if (me.isError)
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.background }]}
      >
        <Text style={{ color: theme.muted }}>{c.auth}</Text>
        <Pressable
          onPress={async () => {
            await tokenStore.remove("business");
            router.replace("/(business)/login");
          }}
          style={[styles.primary, { backgroundColor: theme.plum }]}
        >
          <Text style={styles.white}>{c.auth}</Text>
        </Pressable>
      </SafeAreaView>
    );
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: theme.gold }]}>
            VIZIT BUSINESS
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            {me.data?.name}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={c.add}
          onPress={() => router.push("/(business)/new-booking" as never)}
          style={[styles.logout, { backgroundColor: theme.plum }]}
        >
          <VizitIcon ios="plus" android="add" color="#FFF" size={22} />
        </Pressable>
        <Pressable
          accessibilityLabel={c.logout}
          onPress={logout}
          style={[styles.logout, { backgroundColor: theme.plumSoft }]}
        >
          <VizitIcon
            ios="rectangle.portrait.and.arrow.right"
            android="logout"
            color={theme.plum}
            size={19}
          />
        </Pressable>
      </View>
      <View style={[styles.dateCard, { backgroundColor: theme.plumSoft }]}>
        <View style={[styles.dateIcon, { backgroundColor: theme.surface }]}>
          <VizitIcon
            ios="calendar"
            android="calendar_month"
            color={theme.plum}
            size={23}
          />
        </View>
        <Text style={[styles.dateText, { color: theme.plumStrong }]}>
          {dateLabel}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.plum }]}>
          <Text style={styles.countText}>{bookings.data?.length ?? 0}</Text>
        </View>
      </View>
      {bookings.isLoading ? (
        <ActivityIndicator color={theme.plum} />
      ) : (
        <FlatList
          data={bookings.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <VizitIcon
                ios="calendar.badge.checkmark"
                android="event_available"
                color={theme.muted}
                size={42}
              />
              <Text style={[styles.empty, { color: theme.muted }]}>
                {c.empty}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              onStatus={(action) => status.mutate({ id: item.id, action })}
              labels={c}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
function BookingCard({
  item,
  onStatus,
  labels,
}: {
  item: CalendarBooking;
  onStatus: (action: "confirm" | "done" | "no-show") => void;
  labels: typeof copy.hy;
}) {
  const { theme } = useApp();
  const starts = item.starts_at?.slice(11, 16);
  const ends = item.ends_at?.slice(11, 16);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.timeBadge, { backgroundColor: theme.plumSoft }]}>
          <Text style={[styles.time, { color: theme.plum }]}>{starts}</Text>
          <Text style={[styles.timeEnd, { color: theme.muted }]}>– {ends}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: theme.goldSoft }]}>
          <Text style={[styles.status, { color: theme.gold }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.client, { color: theme.text }]}>
        {item.client_name ?? item.customer_name ?? labels.client}
      </Text>
      <View style={styles.detailRow}>
        <VizitIcon ios="sparkles" android="spa" color={theme.muted} size={15} />
        <Text style={{ color: theme.muted, flex: 1 }}>
          {item.service?.name ?? "—"} · {item.staff?.name ?? "—"}
        </Text>
      </View>
      <View style={styles.actions}>
        <Action
          title={labels.confirm}
          onPress={() => onStatus("confirm")}
          tone="primary"
        />
        <Action
          title={labels.done}
          onPress={() => onStatus("done")}
          tone="success"
        />
        <Action title={labels.noShow} onPress={() => onStatus("no-show")} />
      </View>
    </View>
  );
}
function Action({
  title,
  onPress,
  tone,
}: {
  title: string;
  onPress: () => void;
  tone?: "primary" | "success";
}) {
  const { theme } = useApp();
  const background =
    tone === "primary"
      ? theme.plumSoft
      : tone === "success"
        ? theme.goldSoft
        : theme.background;
  const color =
    tone === "primary"
      ? theme.plum
      : tone === "success"
        ? theme.success
        : theme.muted;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, { backgroundColor: background }]}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: { fontSize: 27, fontWeight: "900", letterSpacing: -0.5 },
  logout: {
    width: 43,
    height: 43,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCard: {
    marginHorizontal: 18,
    padding: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  countBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: "#FFF", fontWeight: "900", fontSize: 12 },
  list: { padding: 18, gap: 12 },
  emptyWrap: { alignItems: "center", paddingTop: 70, gap: 12 },
  empty: { textAlign: "center" },
  card: { padding: 16, borderRadius: 22, borderWidth: 1, gap: 8 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeBadge: {
    paddingHorizontal: 11,
    height: 35,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "baseline",
  },
  time: { fontSize: 18, fontWeight: "900" },
  timeEnd: { fontSize: 12, fontWeight: "700", marginLeft: 3 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  status: { fontWeight: "900", textTransform: "uppercase", fontSize: 9 },
  client: { fontSize: 17, fontWeight: "900", marginTop: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  actions: { flexDirection: "row", gap: 6, marginTop: 8 },
  action: {
    flex: 1,
    minHeight: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },
  primary: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  white: { color: "#FFF", fontWeight: "800" },
});
