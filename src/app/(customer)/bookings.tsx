import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import * as ExpoLinking from "expo-linking";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/providers/app-provider";
import { publicApi } from "@/services/api/public";
import { VizitIcon } from "@/components/vizit-icon";
import { guestBookingStore } from "@/services/guest-booking-store";
import { checkoutUrlFrom, openIdBankCheckout } from "@/services/payments";
import { formatApiDateTime, formatApiTime, localDateKey, localDateKeyFromApi, localDateTimeInputFromApi } from "@/services/date-time";

const copy = {
  hy: {
    title: "Իմ ամրագրումները",
    otp: "4-նիշ հաստատման կոդ",
    verify: "Հաստատել և բացել",
    resend: "Ուղարկել նոր OTP",
    cancel: "Չեղարկել ամրագրումը",
    reschedule: "Փոխել ժամը",
    deposit: "Վճարել կանխավճարը",
    chooseNewDate: "Ընտրիր նոր օրը և ժամը",
    updated: "Ամրագրման ժամը փոխվեց",
    cancelled: "Ամրագրումը չեղարկված է",
    invalid: "Մուտքագրիր ուղարկված 4 թիվը",
    verified: "Անվտանգ մուտքը հաստատված է",
    date: "Ամսաթիվ և ժամ",
    client: "Հաճախորդ",
    status: "Կարգավիճակ",
    empty: "Մուտքագրիր email/SMS-ով ստացած 4-նիշ հաստատման կոդը։",
    missing: "Այս սարքում սպասող ամրագրում չկա։ Նոր ամրագրում կատարիր կամ մուտք գործիր հաճախորդի հաշիվ։",
    booking: "Ամրագրում",
  },
  ru: {
    title: "Мои записи",
    otp: "4-значный код подтверждения",
    verify: "Подтвердить и открыть",
    resend: "Отправить новый OTP",
    cancel: "Отменить запись",
    reschedule: "Изменить время",
    deposit: "Оплатить предоплату",
    chooseNewDate: "Выберите новые дату и время",
    updated: "Время записи изменено",
    cancelled: "Запись отменена",
    invalid: "Введите отправленные вам 4 цифры",
    verified: "Безопасный доступ подтверждён",
    date: "Дата и время",
    client: "Клиент",
    status: "Статус",
    empty: "Введите 4-значный код подтверждения из email/SMS.",
    missing: "На этом устройстве нет ожидающей записи. Создайте новую запись или войдите в аккаунт клиента.",
    booking: "Запись",
  },
  en: {
    title: "My bookings",
    otp: "4-digit verification code",
    verify: "Verify and open",
    resend: "Send a new OTP",
    cancel: "Cancel booking",
    reschedule: "Change time",
    deposit: "Pay deposit",
    chooseNewDate: "Choose a new date and time",
    updated: "Booking time updated",
    cancelled: "Booking cancelled",
    invalid: "Enter the 4 digits sent to you",
    verified: "Secure access verified",
    date: "Date and time",
    client: "Client",
    status: "Status",
    empty: "Enter the 4-digit verification code received by email/SMS.",
    missing: "There is no pending booking on this device. Make a new booking or sign in to your client account.",
    booking: "Booking",
  },
};

export default function BookingsScreen() {
  const { locale, theme, t } = useApp();
  const c = copy[locale];
  const telegramLabel =
    locale === "hy"
      ? "Միացնել Telegram-ը"
      : locale === "ru"
        ? "Подключить Telegram"
        : "Connect Telegram";
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [restoring, setRestoring] = useState(true);
  const [isRescheduling, setRescheduling] = useState(false);
  const detail = useQuery({
    queryKey: ["guest-booking", code, token],
    queryFn: () => publicApi.booking(code.trim(), token),
    enabled: Boolean(code && token),
    retry: false,
  });
  const paymentCapabilities = useQuery({
    queryKey: ["booking-payment-capabilities", code, token],
    queryFn: () => publicApi.paymentCapabilities(code.trim(), token),
    enabled: Boolean(code && token),
    retry: false,
  });
  useEffect(() => {
    let active = true;
    Promise.all([guestBookingStore.restoreLastCode(), guestBookingStore.restoreLast()])
      .then(([lastCode, saved]) => {
        if (!active) return;
        const storedCode = saved?.code ?? lastCode;
        if (storedCode) setCode(storedCode);
        if (saved) setToken(saved.token);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);
  const invalidSession = Boolean(
    detail.error &&
      isAxiosError(detail.error) &&
      (detail.error.response?.status === 401 ||
        detail.error.response?.status === 403),
  );
  useEffect(() => {
    let active = true;
    if (invalidSession) {
      void guestBookingStore.clearSession(code).finally(() => { if (active) setToken(""); });
    }
    return () => { active = false; };
  }, [code, invalidSession]);
  const hasAccess = Boolean(token && !invalidSession);
  const verify = useMutation({
    mutationFn: () => publicApi.verifyBooking(code.trim(), otp),
    onSuccess: async (data) => {
      const manageToken = data.manage_token ?? data.guest_token;
      if (!manageToken) throw new Error("Missing manage token");
      const normalizedCode = code.trim().toUpperCase();
      await guestBookingStore.save(normalizedCode, manageToken);
      setCode(normalizedCode);
      setToken(manageToken);
      setOtp("");
    },
    onError: () => Alert.alert(t("loadError")),
  });
  const resend = useMutation({
    mutationFn: () => publicApi.resendBookingOtp(code.trim()),
    onSuccess: async (data) => {
      if (data.manage_token) {
        await guestBookingStore.save(code, data.manage_token);
        setToken(data.manage_token);
      } else Alert.alert(c.resend);
    },
    onError: () => Alert.alert(t("loadError")),
  });
  const cancel = useMutation({
    mutationFn: () => publicApi.cancelBooking(code.trim(), token),
    onSuccess: () => {
      Alert.alert(c.cancelled);
      detail.refetch();
    },
    onError: () => Alert.alert(t("loadError")),
  });
  const telegram = useMutation({
    mutationFn: () => publicApi.telegramLink(code.trim(), token),
    onSuccess: ({ url }) => Linking.openURL(url),
    onError: () => Alert.alert(t("loadError")),
  });
  const deposit = useMutation({
    mutationFn: async () => {
      const returnUrl = ExpoLinking.createURL("/payment-return");
      const session = await publicApi.createDepositSession(code.trim(), token, {
        return_url: returnUrl,
        cancel_url: `${returnUrl}?status=cancelled`,
      });
      const checkoutUrl = checkoutUrlFrom(session);
      if (!checkoutUrl) throw new Error("Missing checkout URL");
      await openIdBankCheckout(checkoutUrl);
    },
    onError: () => Alert.alert(t("loadError")),
  });
  const root = detail.data?.data ?? detail.data;
  const booking = root?.booking ?? root?.bookings?.[0] ?? root;
  const submit = () =>
    code.trim() && /^\d{4}$/.test(otp)
      ? verify.mutate()
      : Alert.alert(c.invalid);
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <View
            style={[styles.headingIcon, { backgroundColor: theme.plumSoft }]}
          >
            <VizitIcon
              ios="calendar.badge.clock"
              android="calendar_month"
              color={theme.plum}
              size={27}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
            <Text style={[styles.help, { color: theme.muted }]}>
              {restoring ? "" : hasAccess ? c.verified : code ? c.empty : c.missing}
            </Text>
          </View>
        </View>
        {restoring ? (
          <ActivityIndicator color={theme.plum} />
        ) : !code ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, shadowColor: theme.shadow, borderColor: theme.border },
            ]}
          >
            <View style={[styles.securityNote, { backgroundColor: theme.goldSoft }]}>
              <VizitIcon ios="calendar.badge.plus" android="event_available" color={theme.gold} size={21} />
              <Text style={[styles.securityText, { color: theme.text }]}>{c.missing}</Text>
            </View>
          </View>
        ) : !hasAccess ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, shadowColor: theme.shadow, borderColor: theme.border },
            ]}
          >
            <View
              style={[styles.securityNote, { backgroundColor: theme.goldSoft }]}
            >
              <VizitIcon
                ios="lock.shield.fill"
                android="shield_lock"
                color={theme.gold}
                size={21}
              />
              <Text style={[styles.securityText, { color: theme.text }]}>
                {c.empty}
              </Text>
            </View>
            <Field
              value={otp}
              onChangeText={(value) =>
                setOtp(value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder={c.otp}
              keyboardType="number-pad"
              maxLength={4}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              style={styles.otpField}
            />
            <Button
              title={c.verify}
              onPress={submit}
              pending={verify.isPending}
            />
            <Pressable
              disabled={resend.isPending}
              onPress={() => resend.mutate()}
            >
              <Text style={[styles.link, { color: theme.plum }]}>
                {c.resend}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {detail.isLoading ? <ActivityIndicator color={theme.plum} /> : null}
        {hasAccess && booking ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.bookingTitle, { color: theme.plum }]}>
              {booking.business?.name ?? booking.business_name ?? c.booking}
            </Text>
            <Info
              label={c.date}
              value={formatApiDateTime(booking.starts_at ?? booking.start_at, locale)}
            />
            <Info
              label={t("services")}
              value={booking.service?.name ?? booking.service_name ?? "—"}
            />
            <Info
              label={c.client}
              value={booking.client_name ?? booking.customer_name ?? "—"}
            />
            <Info label={c.status} value={booking.status ?? "—"} />
            {booking.telegram_connected ? (
              <Text style={[styles.telegramOn, { color: theme.plum }]}>
                ✓ Telegram
              </Text>
            ) : (
              <Pressable
                disabled={telegram.isPending}
                onPress={() => telegram.mutate()}
                style={styles.telegram}
              >
                <Text style={styles.white}>
                  {telegram.isPending ? "…" : `✈ ${telegramLabel}`}
                </Text>
              </Pressable>
            )}
            {paymentCapabilities.data?.data?.deposit_available ? (
              <Button
                title={c.deposit}
                onPress={() => deposit.mutate()}
                pending={deposit.isPending}
              />
            ) : null}
            {booking.status !== "cancelled" ? (
              <>
                <Button
                  title={c.reschedule}
                  onPress={() => setRescheduling((value) => !value)}
                />
                {isRescheduling ? (
                  <ReschedulePanel
                    booking={booking}
                    bookingCode={code.trim()}
                    token={token}
                    onUpdated={() => {
                      setRescheduling(false);
                      Alert.alert(c.updated);
                      detail.refetch();
                    }}
                    labels={c}
                  />
                ) : null}
                <Button
                  danger
                  title={c.cancel}
                  onPress={() =>
                    Alert.alert(c.cancel, "", [
                      { text: t("back") },
                      {
                        text: c.cancel,
                        style: "destructive",
                        onPress: () => cancel.mutate(),
                      },
                    ])
                  }
                  pending={cancel.isPending}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
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
        props.style,
      ]}
    />
  );
}
function Button({
  title,
  onPress,
  pending,
  danger,
}: {
  title: string;
  onPress: () => void;
  pending?: boolean;
  danger?: boolean;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      disabled={pending}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: danger ? theme.danger : theme.plum },
      ]}
    >
      {pending ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  const { theme } = useApp();
  return (
    <View style={styles.info}>
      <Text style={{ color: theme.muted }}>{label}</Text>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function ReschedulePanel({
  booking,
  bookingCode,
  token,
  onUpdated,
  labels,
}: {
  booking: Record<string, any>;
  bookingCode: string;
  token: string;
  onUpdated: () => void;
  labels: typeof copy.hy;
}) {
  const { theme, locale } = useApp();
  const [date, setDate] = useState(() => localDateKeyFromApi(booking.starts_at) ?? localDateKey(0));
  const [selected, setSelected] = useState<{
    starts_at: string;
    staff_id: number;
  }>();
  const bookingId = Number(booking.id);
  const options = useQuery({
    queryKey: ["reschedule", bookingCode, bookingId, date],
    queryFn: async () => {
      const data = await publicApi.rescheduleOptions(bookingCode, token, {
        booking_id: bookingId,
        date,
        staff_id: booking.staff_id ?? booking.staff?.id,
      });
      return data.data ?? data;
    },
    enabled: Boolean(bookingId && date),
    retry: false,
  });
  const update = useMutation({
    mutationFn: () =>
      publicApi.rescheduleBooking(bookingCode, token, {
        booking_id: bookingId,
        staff_id: selected!.staff_id,
        starts_at: localDateTimeInputFromApi(selected!.starts_at),
      }),
    onSuccess: onUpdated,
    onError: () => Alert.alert("Error"),
  });
  const slots = Array.isArray(options.data)
    ? options.data
    : (options.data?.slots ?? []);
  return (
    <View
      style={[
        styles.reschedule,
        { backgroundColor: theme.cream, borderColor: theme.gold },
      ]}
    >
      <Text style={[styles.rescheduleTitle, { color: theme.text }]}>
        {labels.chooseNewDate}
      </Text>
      <Field
        value={date}
        onChangeText={(value) => {
          setDate(value);
          setSelected(undefined);
        }}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />
      {options.isLoading ? (
        <ActivityIndicator color={theme.plum} />
      ) : (
        <View style={styles.slotGrid}>
          {slots
            .slice(0, 16)
            .map(
              (slot: {
                starts_at: string;
                staff_id: number;
                staff_name?: string;
              }) => (
                <Pressable
                  key={`${slot.starts_at}-${slot.staff_id}`}
                  onPress={() => setSelected(slot)}
                  style={[
                    styles.slot,
                    {
                      backgroundColor:
                        selected?.starts_at === slot.starts_at
                          ? theme.peach
                          : theme.surface,
                      borderColor:
                        selected?.starts_at === slot.starts_at
                          ? theme.gold
                          : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    {formatApiTime(slot.starts_at, locale)}
                  </Text>
                </Pressable>
              ),
            )}
        </View>
      )}
      <Button
        title={labels.reschedule}
        pending={update.isPending}
        onPress={() => selected && update.mutate()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 20 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
    marginBottom: 2,
  },
  headingIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 27, fontWeight: "900", letterSpacing: -0.5 },
  help: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  securityNote: {
    padding: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  securityText: { flex: 1, fontSize: 12, lineHeight: 17 },
  field: {
    height: 54,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  otpField: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 12,
    textAlign: "center",
  },
  button: {
    height: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  white: { color: "#FFF", fontWeight: "800" },
  link: { textAlign: "center", fontWeight: "800", padding: 8 },
  telegram: {
    height: 50,
    borderRadius: 10,
    backgroundColor: "#229ED9",
    alignItems: "center",
    justifyContent: "center",
  },
  telegramOn: { textAlign: "center", fontWeight: "800", padding: 10 },
  bookingTitle: { fontSize: 22, fontWeight: "900", marginBottom: 5 },
  info: {
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#378ADD33",
  },
  value: { marginTop: 4, fontWeight: "700" },
  reschedule: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  rescheduleTitle: { fontSize: 16, fontWeight: "800" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  slot: {
    minWidth: 67,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
});
