import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Href, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clientAccountApi } from "@/services/api/client-account";
import { apiErrorMessage } from "@/services/api/client";
import { publicApi } from "@/services/api/public";
import { guestBookingStore } from "@/services/guest-booking-store";
import { useApp } from "@/providers/app-provider";
import { VizitIcon } from "@/components/vizit-icon";
import { formatApiDateTime } from "@/services/date-time";

const copy = {
  hy: {
    title: "Հաճախորդի հաշիվ",
    subtitle: "Մուտք գործիր՝ բոլոր ամրագրումները մեկ տեղում տեսնելու համար",
    identity: "Email կամ հեռախոս",
    password: "Գաղտնաբառ",
    login: "Մուտք գործել",
    register: "Ստեղծել նոր հաշիվ",
    forgot: "Մոռացե՞լ ես գաղտնաբառը",
    logout: "Դուրս գալ",
    visits: "Իմ այցերը",
    booking: "Ամրագրում",
    empty: "Ամրագրումներ դեռ չկան",
    business: "Անցնել բիզնեսի մուտքին",
    failed: "Մուտքը չհաջողվեց",
    verify: "Հաստատիր email-ը՝ հին ամրագրումները հաշվին կապելու համար",
    resend: "Նորից ուղարկել նամակը",
    delete: "Ջնջել հաշիվը",
    deleteConfirm: "Հաստատե՞լ հաշվի և անձնական տվյալների ջնջման հայտը։",
    deletionSent: "Ջնջման հայտն ընդունված է",
    manage: "Կառավարել",
    retry: "Կրկին փորձել",
  },
  ru: {
    title: "Аккаунт клиента",
    subtitle: "Войдите, чтобы видеть все записи в одном месте",
    identity: "Email или телефон",
    password: "Пароль",
    login: "Войти",
    register: "Создать аккаунт",
    forgot: "Забыли пароль?",
    logout: "Выйти",
    visits: "Мои визиты",
    booking: "Запись",
    empty: "Записей пока нет",
    business: "Перейти ко входу для бизнеса",
    failed: "Не удалось войти",
    verify: "Подтвердите email, чтобы привязать прежние записи",
    resend: "Отправить письмо снова",
    delete: "Удалить аккаунт",
    deleteConfirm: "Отправить запрос на удаление аккаунта и личных данных?",
    deletionSent: "Запрос на удаление принят",
    manage: "Управлять",
    retry: "Повторить",
  },
  en: {
    title: "Client account",
    subtitle: "Sign in to see all bookings in one place",
    identity: "Email or phone",
    password: "Password",
    login: "Sign in",
    register: "Create an account",
    forgot: "Forgot password?",
    logout: "Sign out",
    visits: "My visits",
    booking: "Booking",
    empty: "No bookings yet",
    business: "Go to business sign in",
    failed: "Sign-in failed",
    verify: "Verify your email to link earlier bookings",
    resend: "Resend verification email",
    delete: "Delete account",
    deleteConfirm: "Request deletion of your account and personal data?",
    deletionSent: "Deletion request accepted",
    manage: "Manage",
    retry: "Try again",
  },
};

export default function ProfileScreen() {
  const { locale, theme, t } = useApp();
  const c = copy[locale];
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [openingBookingId, setOpeningBookingId] = useState<number | null>(null);
  const me = useQuery({
    queryKey: ["client-me"],
    queryFn: clientAccountApi.me,
    retry: false,
  });
  const bookings = useQuery({
    queryKey: ["client-bookings"],
    queryFn: clientAccountApi.bookings,
    enabled: me.isSuccess,
    retry: false,
  });
  const login = useMutation({
    mutationFn: () => clientAccountApi.login(identity.trim(), password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-me"] });
      setPassword("");
    },
    onError: () => Alert.alert(c.failed),
  });
  const resend = useMutation({
    mutationFn: clientAccountApi.resendVerification,
    onSuccess: () => Alert.alert(c.resend),
    onError: () => Alert.alert(c.failed),
  });
  const openBooking = async (bookingId: number) => {
    if (openingBookingId !== null) return;
    setOpeningBookingId(bookingId);
    try {
      let reference = await guestBookingStore.restoreClientBookingReference(bookingId);
      if (!reference) {
        await bookings.refetch();
        reference = await guestBookingStore.restoreClientBookingReference(bookingId);
      }
      if (!reference) throw new Error("Booking reference is unavailable on this device");

      const saved = await guestBookingStore.restore(reference);
      if (saved) {
        await guestBookingStore.rememberCode(reference);
        router.push("/(customer)/bookings");
        return;
      }

      const recovery = await publicApi.resendBookingOtp(reference);
      const manageToken = recovery.manage_token ?? recovery.guest_token;
      if (typeof manageToken === "string" && manageToken) {
        await guestBookingStore.save(reference, manageToken);
      } else {
        await guestBookingStore.rememberCode(reference);
      }
      router.push("/(customer)/bookings");
    } catch (error) {
      Alert.alert(t("loadError"), apiErrorMessage(error));
    } finally {
      setOpeningBookingId(null);
    }
  };
  const requestDeletion = () =>
    Alert.alert(c.delete, c.deleteConfirm, [
      { text: t("back"), style: "cancel" },
      {
        text: c.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await clientAccountApi.requestAccountDeletion();
            queryClient.clear();
            Alert.alert(c.deletionSent);
          } catch {
            Alert.alert(t("loadError"));
          }
        },
      },
    ]);
  const logout = () =>
    Alert.alert(c.title, "", [
      {
        text: c.logout,
        onPress: async () => {
          await clientAccountApi.logout();
          queryClient.removeQueries({ queryKey: ["client-me"] });
          queryClient.removeQueries({ queryKey: ["client-bookings"] });
        },
      },
      { text: c.delete, style: "destructive", onPress: requestDeletion },
      { text: t("back"), style: "cancel" },
    ]);
  if (me.isLoading)
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.plum} />
      </SafeAreaView>
    );
  const forgotRoute = "/client/forgot-password" as Href;
  const registerRoute = "/client/register" as Href;
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {me.isError ? (
        <View style={styles.loginWrap}>
          <View style={styles.loginIntro}>
            <View
              style={[styles.avatarHero, { backgroundColor: theme.plumSoft }]}
            >
              <VizitIcon
                ios="person.fill"
                android="person"
                color={theme.plum}
                size={32}
              />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              {c.subtitle}
            </Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, shadowColor: theme.shadow, borderColor: theme.border },
            ]}
          >
            <Field
              value={identity}
              onChangeText={setIdentity}
              placeholder={c.identity}
              autoCapitalize="none"
            />
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder={c.password}
              secureTextEntry
            />
            <Pressable onPress={() => router.push(forgotRoute)}>
              <Text style={[styles.forgot, { color: theme.plum }]}>
                {c.forgot}
              </Text>
            </Pressable>
            <Pressable
              disabled={!identity || !password || login.isPending}
              onPress={() => login.mutate()}
              style={[
                styles.primary,
                {
                  backgroundColor: theme.plum,
                  opacity: identity && password ? 1 : 0.45,
                },
              ]}
            >
              {login.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.white}>{c.login}</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.push(registerRoute)}>
              <Text style={[styles.register, { color: theme.plum }]}>
                {c.register}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.replace("/(business)/login")}
            style={styles.businessLink}
          >
            <VizitIcon
              ios="briefcase.fill"
              android="business_center"
              color={theme.plum}
              size={18}
            />
            <Text style={[styles.link, { color: theme.plum }]}>
              {c.business}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.userRow}>
              <View
                style={[styles.avatar, { backgroundColor: theme.plumSoft }]}
              >
                <VizitIcon
                  ios="person.fill"
                  android="person"
                  color={theme.plum}
                  size={24}
                />
              </View>
              <View>
                <Text style={[styles.userTitle, { color: theme.text }]}>
                  {me.data?.name}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 13 }}>
                  {me.data?.email ?? me.data?.phone}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={logout}
              style={[styles.logout, { backgroundColor: theme.plumSoft }]}
            >
              <VizitIcon
                ios="rectangle.portrait.and.arrow.right"
                android="logout"
                color={theme.plum}
                size={18}
              />
            </Pressable>
          </View>
          {me.data?.requires_email_verification ? (
            <Pressable
              onPress={() => resend.mutate()}
              style={[styles.verify, { backgroundColor: theme.goldSoft }]}
            >
              <Text style={{ color: theme.text }}>{c.verify}</Text>
              <Text
                style={{ color: theme.plum, fontWeight: "800", marginTop: 5 }}
              >
                {c.resend}
              </Text>
            </Pressable>
          ) : null}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {c.visits}
          </Text>
          <FlatList
            data={bookings.data}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              bookings.isLoading ? (
                <ActivityIndicator color={theme.plum} />
              ) : bookings.isError ? (
                <Pressable onPress={() => bookings.refetch()} style={styles.retry}>
                  <Text style={{ color: theme.plum, fontWeight: "900" }}>{c.retry}</Text>
                </Pressable>
              ) : (
                <Text style={{ color: theme.muted }}>{c.empty}</Text>
              )
            }
            renderItem={({ item }) => {
              const opening = openingBookingId === item.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={openingBookingId !== null}
                  onPress={() => void openBooking(item.id)}
                  style={({ pressed }) => [
                    styles.booking,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.row}>
                    <Text style={[styles.bookingTitle, { color: theme.text }]}>
                      {item.business?.name ?? c.booking}
                    </Text>
                    <View
                      style={[styles.status, { backgroundColor: theme.goldSoft }]}
                    >
                      <Text
                        style={{
                          color: theme.gold,
                          fontWeight: "800",
                          fontSize: 11,
                        }}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.muted }}>{formatApiDateTime(item.starts_at, locale)}</Text>
                  <Text style={{ color: theme.plum, fontWeight: "700" }}>
                    {item.service?.name} · {item.staff?.name}
                  </Text>
                  <View style={styles.manageRow}>
                    {opening ? <ActivityIndicator size="small" color={theme.plum} /> : <Text style={{ color: theme.plum, fontWeight: "900" }}>{c.manage}</Text>}
                    <VizitIcon ios="chevron.right" android="chevron_right" color={theme.plum} size={18} />
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
function Field(props: React.ComponentProps<typeof TextInput>) {
  const { theme } = useApp();
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.muted}
      style={[
        styles.field,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          color: theme.text,
        },
      ]}
    />
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loginWrap: { flex: 1, justifyContent: "center", padding: 22 },
  loginIntro: { alignItems: "center", marginBottom: 24 },
  avatarHero: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  card: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: {
    textAlign: "center",
    lineHeight: 21,
    marginTop: 7,
    maxWidth: 310,
  },
  field: {
    height: 54,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  forgot: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    paddingVertical: 2,
  },
  primary: {
    height: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  white: { color: "#FFF", fontWeight: "900" },
  register: { textAlign: "center", fontWeight: "900", paddingTop: 4 },
  businessLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  link: { textAlign: "center", padding: 8, fontWeight: "800" },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  userTitle: { fontSize: 20, fontWeight: "900" },
  logout: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verify: { marginHorizontal: 20, padding: 15, borderRadius: 10 },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    paddingHorizontal: 20,
    marginTop: 25,
  },
  list: { padding: 20, gap: 10 },
  booking: { padding: 16, borderWidth: 1, borderRadius: 10, gap: 7 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  bookingTitle: { fontSize: 17, fontWeight: "800", flex: 1 },
  status: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  manageRow: { marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  retry: { minHeight: 46, alignItems: "center", justifyContent: "center" },
});