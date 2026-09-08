import { useMutation } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';

const labels = {
  hy: { title: 'Բոլոր բաժինները', booking: 'Նոր ամրագրում', services: 'Ծառայություններ', staff: 'Աշխատակիցներ և գրաֆիկ', hours: 'Աշխատանքային ժամեր', locations: 'Հասցեներ և մասնաճյուղեր', media: 'Լոգո և նկարներ', tasks: 'Առաջադրանքներ', analytics: 'Վերլուծություն', gifts: 'Նվեր քարտեր', loyalty: 'Հավատարմություն', growth: 'Սպասման ցուցակ', settings: 'Բիզնեսի կարգավորումներ', billing: 'Պլան և վճարումներ', telegram: 'Telegram ծանուցումներ', logout: 'Դուրս գալ', logoutConfirm: 'Դուրս գա՞լ բիզնես հաշվից։', cancel: 'Չեղարկել' },
  ru: { title: 'Все разделы', booking: 'Новая запись', services: 'Услуги', staff: 'Сотрудники и график', hours: 'Рабочие часы', locations: 'Адреса и филиалы', media: 'Логотип и фото', tasks: 'Задачи', analytics: 'Аналитика', gifts: 'Подарочные карты', loyalty: 'Лояльность', growth: 'Лист ожидания', settings: 'Настройки бизнеса', billing: 'Тариф и платежи', telegram: 'Telegram-уведомления', logout: 'Выйти', logoutConfirm: 'Выйти из бизнес-аккаунта?', cancel: 'Отмена' },
  en: { title: 'All sections', booking: 'New booking', services: 'Services', staff: 'Team and schedules', hours: 'Working hours', locations: 'Locations and branches', media: 'Logo and images', tasks: 'Tasks', analytics: 'Analytics', gifts: 'Gift cards', loyalty: 'Loyalty', growth: 'Waitlist', settings: 'Business settings', billing: 'Plan and billing', telegram: 'Telegram notifications', logout: 'Sign out', logoutConfirm: 'Sign out of the business account?', cancel: 'Cancel' },
};

export default function BusinessMore() {
  const { locale, theme } = useApp();
  const c = labels[locale];
  const items = [
    [c.booking, 'new-booking', 'add'],
    [c.services, '/(business)/services', 'grid_view'],
    [c.staff, '/(business)/staff', 'group'],
    [c.hours, 'working-hours', 'schedule'],
    [c.locations, 'locations', 'location_on'],
    [c.media, 'profile-media', 'photo_library'],
    [c.tasks, 'tasks', 'task_alt'],
    [c.analytics, 'analytics', 'analytics'],
    [c.gifts, 'gift-cards', 'card_giftcard'],
    [c.loyalty, 'loyalty', 'loyalty'],
    [c.growth, 'growth', 'hourglass_top'],
    [c.settings, '/(business)/admin', 'settings'],
    [c.billing, 'billing', 'payments'],
    [c.telegram, 'telegram', 'send'],
  ] as const;
  const open = (target: string) => router.push((target.startsWith('/') ? target : `/(business)/${target}`) as Href);
  const logout = useMutation({ mutationFn: businessApi.logout, onSettled: () => router.replace('/(business)/login') });
  const confirmLogout = () => Alert.alert(c.logout, c.logoutConfirm, [{ text: c.cancel, style: 'cancel' }, { text: c.logout, style: 'destructive', onPress: () => logout.mutate() }]);

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
      <View style={styles.list}>{items.map(([title, target, icon]) => <Pressable key={target} onPress={() => open(target)} style={({ pressed }) => [styles.item, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, opacity: pressed ? 0.75 : 1 }]}><View style={[styles.icon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="square.grid.2x2.fill" android={icon} color={theme.plum} size={22} /></View><Text style={[styles.label, { color: theme.text }]}>{title}</Text><VizitIcon ios="chevron.right" android="chevron_right" color={theme.muted} size={21} /></Pressable>)}</View>
      <Pressable disabled={logout.isPending} onPress={confirmLogout} style={[styles.logout, { borderColor: theme.danger }]}><VizitIcon ios="rectangle.portrait.and.arrow.right" android="logout" color={theme.danger} size={20} /><Text style={{ color: theme.danger, fontWeight: '900' }}>{c.logout}</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, paddingBottom: 35 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 18 }, list: { gap: 9 }, item: { minHeight: 66, borderWidth: 1, borderRadius: 11, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 43, height: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, label: { flex: 1, fontSize: 15, fontWeight: '800' }, logout: { marginTop: 18, minHeight: 52, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 } });
