import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { businessApi } from "@/services/api/business";
import { apiErrorMessage } from "@/services/api/client";

const copy = {
  hy: {
    title: "Նոր ամրագրում",
    service: "Ընտրեք ծառայությունը",
    staff: "Ընտրեք աշխատակցին",
    client: "Ընտրեք գոյություն ունեցող հաճախորդին կամ լրացրեք նոր տվյալներ",
    name: "Հաճախորդի անուն",
    phone: "Հեռախոս",
    email: "Էլ․ փոստ (ոչ պարտադիր)",
    date: "Ամսաթիվ՝ YYYY-MM-DD",
    time: "Ժամ՝ HH:MM",
    notes: "Նշումներ",
    save: "Ստեղծել և հաստատել",
    required: "Լրացրեք պարտադիր դաշտերը",
    success: "Ամրագրումը ստեղծված է",
  },
  ru: {
    title: "Новая запись",
    service: "Выберите услугу",
    staff: "Выберите сотрудника",
    client: "Выберите клиента или заполните данные нового",
    name: "Имя клиента",
    phone: "Телефон",
    email: "Email (необязательно)",
    date: "Дата: YYYY-MM-DD",
    time: "Время: HH:MM",
    notes: "Заметки",
    save: "Создать и подтвердить",
    required: "Заполните обязательные поля",
    success: "Запись создана",
  },
  en: {
    title: "New booking",
    service: "Choose a service",
    staff: "Choose a team member",
    client: "Choose an existing client or enter a new one",
    name: "Client name",
    phone: "Phone",
    email: "Email (optional)",
    date: "Date: YYYY-MM-DD",
    time: "Time: HH:MM",
    notes: "Notes",
    save: "Create and confirm",
    required: "Complete the required fields",
    success: "Booking created",
  },
};
const localDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};
export default function NewBooking() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    date: localDate(),
    time: "10:00",
    notes: "",
  });
  const [serviceId, setServiceId] = useState<number>();
  const [staffId, setStaffId] = useState<number>();
  const [clientId, setClientId] = useState<number>();
  const services = useQuery({
    queryKey: ["business-services"],
    queryFn: businessApi.services,
  });
  const staff = useQuery({
    queryKey: ["business-staff"],
    queryFn: businessApi.staff,
  });
  const clients = useQuery({ queryKey: ["business-clients"], queryFn: businessApi.clients });
  const valid =
    !!serviceId &&
    !!staffId &&
    form.name.trim().length > 1 &&
    form.phone.trim().length > 3 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.date) &&
    /^\d{2}:\d{2}$/.test(form.time);
  const create = useMutation({
    mutationFn: () =>
      businessApi.createBooking({
        service_id: serviceId!,
        staff_id: staffId!,
        starts_at: `${form.date} ${form.time}`,
        client_name: form.name.trim(),
        client_phone: form.phone.trim(),
        client_email: form.email.trim() || undefined,
        client_id: clientId,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendar"] });
      Alert.alert(c.success, "", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (e) => Alert.alert(c.required, apiErrorMessage(e)),
  });
  const input = (
    key: keyof typeof form,
    placeholder: string,
    keyboardType?: "default" | "phone-pad" | "email-address",
  ) => (
    <TextInput
      value={form[key]}
      onChangeText={(value) => setForm((f) => ({ ...f, [key]: value }))}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      keyboardType={keyboardType}
      autoCapitalize={key === "email" ? "none" : undefined}
      multiline={key === "notes"}
      style={[
        styles.input,
        key === "notes" && styles.notes,
        {
          color: theme.text,
          borderColor: theme.border,
          backgroundColor: theme.surfaceRaised,
        },
      ]}
    />
  );
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.back, { borderColor: theme.border }]}
          >
            <VizitIcon
              ios="chevron.left"
              android="arrow_back"
              color={theme.text}
              size={21}
            />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
        </View>
        <Text style={[styles.label, { color: theme.text }]}>{c.service}</Text>
        <View style={styles.chips}>
          {services.data
            ?.filter((x) => x.is_active)
            .map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setServiceId(item.id)}
                style={[
                  styles.chip,
                  {
                    borderColor:
                      serviceId === item.id ? theme.plum : theme.border,
                    backgroundColor:
                      serviceId === item.id
                        ? theme.plumSoft
                        : theme.surfaceRaised,
                  },
                ]}
              >
                <Text
                  style={{
                    color: serviceId === item.id ? theme.plum : theme.text,
                    fontWeight: "800",
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
        </View>
        <Text style={[styles.label, { color: theme.text }]}>{c.staff}</Text>
        <View style={styles.chips}>
          {staff.data
            ?.filter((x) => x.is_active && x.is_bookable !== false)
            .map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setStaffId(item.id)}
                style={[
                  styles.chip,
                  {
                    borderColor:
                      staffId === item.id ? theme.plum : theme.border,
                    backgroundColor:
                      staffId === item.id
                        ? theme.plumSoft
                        : theme.surfaceRaised,
                  },
                ]}
              >
                <Text
                  style={{
                    color: staffId === item.id ? theme.plum : theme.text,
                    fontWeight: "800",
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
        </View>
        <Text style={[styles.label, { color: theme.text }]}>{c.client}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clientChips}>
          {clients.data?.slice(0, 20).map((item) => <Pressable key={item.id} onPress={() => { setClientId(item.id); setForm((current) => ({ ...current, name: item.name ?? "", phone: item.phone ?? "", email: item.email ?? "" })); }} style={[styles.clientChip, { borderColor: clientId === item.id ? theme.plum : theme.border, backgroundColor: clientId === item.id ? theme.plumSoft : theme.surfaceRaised }]}><View style={[styles.clientAvatar, { backgroundColor: theme.plum }]}><Text style={styles.clientInitial}>{item.name.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={1} style={{ color: theme.text, fontWeight: "800", maxWidth: 110 }}>{item.name}</Text></Pressable>)}
        </ScrollView>
        {input("name", c.name)}
        {input("phone", c.phone, "phone-pad")}
        {input("email", c.email, "email-address")}
        <View style={styles.row}>
          <View style={styles.flex}>{input("date", c.date)}</View>
          <View style={styles.small}>{input("time", c.time)}</View>
        </View>
        {input("notes", c.notes)}
        <Pressable
          disabled={!valid || create.isPending}
          onPress={() => create.mutate()}
          style={[
            styles.primary,
            { backgroundColor: theme.plum, opacity: valid ? 1 : 0.4 },
          ]}
        >
          {create.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryText}>{c.save}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingBottom: 44, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  back: {
    width: 43,
    height: 43,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 25, fontWeight: "900" },
  label: { fontSize: 14, fontWeight: "900", marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  clientChips: { gap: 8, paddingVertical: 2 },
  clientChip: { minHeight: 48, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingRight: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  clientAvatar: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  clientInitial: { color: "#FFF", fontWeight: "900" },
  chip: {
    minHeight: 43,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
  },
  notes: { minHeight: 82, paddingTop: 13, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  small: { width: 120 },
  primary: {
    height: 55,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  primaryText: { color: "#FFF", fontWeight: "900" },
});
