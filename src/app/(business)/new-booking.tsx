import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { businessApi, BusinessLocation } from "@/services/api/business";
import { apiErrorMessage } from "@/services/api/client";

const copy = {
  hy: {
    title: "Նոր ամրագրում",
    location: "Ընտրեք մասնաճյուղը",
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
    loadError: "Չհաջողվեց բեռնել ամրագրման տվյալները",
    retry: "Կրկին փորձել",
  },
  ru: {
    title: "Новая запись",
    location: "Выберите филиал",
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
    loadError: "Не удалось загрузить данные для записи",
    retry: "Повторить",
  },
  en: {
    title: "New booking",
    location: "Choose a location",
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
    loadError: "Could not load booking data",
    retry: "Try again",
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", date: localDate(), time: "10:00", notes: "" });
  const [locationId, setLocationId] = useState<number>();
  const [serviceId, setServiceId] = useState<number>();
  const [staffId, setStaffId] = useState<number>();
  const [clientId, setClientId] = useState<number>();

  const settings = useQuery({ queryKey: ["business-settings"], queryFn: businessApi.settings, retry: false });
  const services = useQuery({ queryKey: ["business-services"], queryFn: businessApi.services, retry: false });
  const staff = useQuery({ queryKey: ["business-staff"], queryFn: businessApi.staff, retry: false });
  const clients = useQuery({ queryKey: ["business-clients"], queryFn: businessApi.clients, retry: false });

  const locations = useMemo(() => (settings.data?.locations ?? []).filter((location: BusinessLocation) => location.is_active), [settings.data?.locations]);

  useEffect(() => {
    if (!locationId && locations.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationId(locations[0].id);
    }
  }, [locationId, locations]);

  const visibleServices = useMemo(() => (services.data ?? []).filter((item) => item.is_active && (!locationId || item.location_id == null || item.location_id === locationId)), [locationId, services.data]);
  const visibleStaff = useMemo(() => (staff.data ?? []).filter((item) => item.is_active && item.is_bookable !== false && (!locationId || item.location_id == null || item.location_id === locationId)), [locationId, staff.data]);

  useEffect(() => {
    if (serviceId && !visibleServices.some((item) => item.id === serviceId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServiceId(undefined);
    }
    if (staffId && !visibleStaff.some((item) => item.id === staffId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStaffId(undefined);
    }
  }, [serviceId, staffId, visibleServices, visibleStaff]);

  const valid = !!serviceId && !!staffId && (locations.length <= 1 || !!locationId) && form.name.trim().length > 1 && form.phone.trim().length > 3 && /^\d{4}-\d{2}-\d{2}$/.test(form.date) && /^\d{2}:\d{2}$/.test(form.time);
  const anyLoadError = settings.isError || services.isError || staff.isError || clients.isError;

  const create = useMutation({
    mutationFn: () => businessApi.createBooking({
      service_id: serviceId!,
      staff_id: staffId!,
      location_id: locationId,
      starts_at: `${form.date} ${form.time}`,
      client_name: form.name.trim(),
      client_phone: form.phone.trim(),
      client_email: form.email.trim() || undefined,
      client_id: clientId,
      notes: form.notes.trim() || undefined,
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calendar"] }),
        qc.invalidateQueries({ queryKey: ["business-clients"] }),
        qc.invalidateQueries({ queryKey: ["business-dashboard"] }),
      ]);
      await Promise.all([
        qc.refetchQueries({ queryKey: ["calendar"], type: "active" }),
        qc.refetchQueries({ queryKey: ["business-clients"], type: "active" }),
      ]);
      Alert.alert(c.success, "", [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: (error) => Alert.alert(c.required, apiErrorMessage(error)),
  });

  const retryAll = () => void Promise.all([settings.refetch(), services.refetch(), staff.refetch(), clients.refetch()]);
  const selectLocation = (id: number) => {
    setLocationId(id);
    setServiceId(undefined);
    setStaffId(undefined);
  };

  const input = (key: keyof typeof form, placeholder: string, keyboardType?: "default" | "phone-pad" | "email-address") => (
    <TextInput
      value={form[key]}
      onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      keyboardType={keyboardType}
      autoCapitalize={key === "email" ? "none" : undefined}
      multiline={key === "notes"}
      style={[styles.input, key === "notes" && styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}
    />
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.back, { borderColor: theme.border }]}>
            <VizitIcon ios="chevron.left" android="arrow_back" color={theme.text} size={21} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
        </View>

        {settings.isLoading || services.isLoading || staff.isLoading ? <ActivityIndicator color={theme.plum} /> : null}
        {anyLoadError ? (
          <View style={[styles.error, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}>
            <Text style={{ color: theme.danger, fontWeight: "800" }}>{c.loadError}</Text>
            <Pressable onPress={retryAll}><Text style={{ color: theme.plum, fontWeight: "900" }}>{c.retry}</Text></Pressable>
          </View>
        ) : null}

        {locations.length > 1 ? <>
          <Text style={[styles.label, { color: theme.text }]}>{c.location}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clientChips}>
            {locations.map((location) => <Pressable key={location.id} onPress={() => selectLocation(location.id)} style={[styles.chip, { borderColor: locationId === location.id ? theme.plum : theme.border, backgroundColor: locationId === location.id ? theme.plumSoft : theme.surfaceRaised }]}><Text style={{ color: locationId === location.id ? theme.plum : theme.text, fontWeight: "800" }}>{location.name || location.address || `#${location.id}`}</Text></Pressable>)}
          </ScrollView>
        </> : null}

        <Text style={[styles.label, { color: theme.text }]}>{c.service}</Text>
        <View style={styles.chips}>
          {visibleServices.map((item) => <Pressable key={item.id} onPress={() => { setServiceId(item.id); if (!locationId && item.location_id) setLocationId(item.location_id); }} style={[styles.chip, { borderColor: serviceId === item.id ? theme.plum : theme.border, backgroundColor: serviceId === item.id ? theme.plumSoft : theme.surfaceRaised }]}><Text style={{ color: serviceId === item.id ? theme.plum : theme.text, fontWeight: "800" }}>{item.name}</Text></Pressable>)}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>{c.staff}</Text>
        <View style={styles.chips}>
          {visibleStaff.map((item) => <Pressable key={item.id} onPress={() => { setStaffId(item.id); if (!locationId && item.location_id) setLocationId(item.location_id); }} style={[styles.chip, { borderColor: staffId === item.id ? theme.plum : theme.border, backgroundColor: staffId === item.id ? theme.plumSoft : theme.surfaceRaised }]}><Text style={{ color: staffId === item.id ? theme.plum : theme.text, fontWeight: "800" }}>{item.name}</Text></Pressable>)}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>{c.client}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clientChips}>
          {clients.data?.slice(0, 20).map((item) => <Pressable key={item.id} onPress={() => { setClientId(item.id); setForm((current) => ({ ...current, name: item.name ?? "", phone: item.phone ?? "", email: item.email ?? "" })); }} style={[styles.clientChip, { borderColor: clientId === item.id ? theme.plum : theme.border, backgroundColor: clientId === item.id ? theme.plumSoft : theme.surfaceRaised }]}><View style={[styles.clientAvatar, { backgroundColor: theme.plum }]}><Text style={styles.clientInitial}>{item.name.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={1} style={{ color: theme.text, fontWeight: "800", maxWidth: 110 }}>{item.name}</Text></Pressable>)}
        </ScrollView>

        {input("name", c.name)}
        {input("phone", c.phone, "phone-pad")}
        {input("email", c.email, "email-address")}
        <View style={styles.row}><View style={styles.flex}>{input("date", c.date)}</View><View style={styles.small}>{input("time", c.time)}</View></View>
        {input("notes", c.notes)}
        <Pressable disabled={!valid || create.isPending || anyLoadError} onPress={() => create.mutate()} style={[styles.primary, { backgroundColor: theme.plum, opacity: valid && !anyLoadError ? 1 : 0.4 }]}>
          {create.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{c.save}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingBottom: 44, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  back: { width: 43, height: 43, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, fontWeight: "900" },
  label: { fontSize: 14, fontWeight: "900", marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  clientChips: { gap: 8, paddingVertical: 2 },
  clientChip: { minHeight: 48, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingRight: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  clientAvatar: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  clientInitial: { color: "#FFF", fontWeight: "900" },
  chip: { minHeight: 43, justifyContent: "center", borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13 },
  notes: { minHeight: 82, paddingTop: 13, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  small: { width: 120 },
  primary: { height: 55, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 5 },
  primaryText: { color: "#FFF", fontWeight: "900" },
  error: { borderWidth: 1, borderRadius: 9, padding: 13, gap: 8 },
});
