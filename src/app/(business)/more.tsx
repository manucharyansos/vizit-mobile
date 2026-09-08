import { Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';

const labels = {
  hy: { title: 'Բոլոր բաժինները', booking: 'Նոր ամրագրում', services: 'Ծառայություններ', staff: 'Աշխատակիցներ և գրաֆիկ', locations: 'Հասցեներ և մասնաճյուղեր', media: 'Լոգո և նկարներ', tasks: 'Առաջադրանքներ', analytics: 'Վերլուծություն', gifts: 'Նվեր քարտեր', loyalty: 'Հավատարմություն', growth: 'Սպասման ցուցակ', settings: 'Բիզնեսի կարգավորումներ', billing: 'Պլան և վճարումներ', telegram: 'Telegram ծանուցումներ' },
  ru: { title: 'Все разделы', booking: 'Новая запись', services: 'Услуги', staff: 'Сотрудники и график', locations: 'Адреса и филиалы', media: 'Логотип и фото', tasks: 'Задачи', analytics: 'Аналитика', gifts: 'Подарочные карты', loyalty: 'Лояльность', growth: 'Лист ожидания', settings: 'Настройки бизнеса', billing: 'Тариф и платежи', telegram: 'Telegram-уведомления' },
  en: { title: 'All sections', booking: 'New booking', services: 'Services', staff: 'Team and schedules', locations: 'Locations and branches', media: 'Logo and images', tasks: 'Tasks', analytics: 'Analytics', gifts: 'Gift cards', loyalty: 'Loyalty', growth: 'Waitlist', settings: 'Business settings', billing: 'Plan and billing', telegram: 'Telegram notifications' },
};
export default function BusinessMore() {
  const { locale, theme } = useApp(); const c = labels[locale];
  const items = [
    [c.booking, 'new-booking', 'add'], [c.services, '/(business)/services', 'grid_view'], [c.staff, '/(business)/staff', 'group'], [c.locations, 'locations', 'location_on'], [c.media, 'profile-media', 'photo_library'], [c.tasks, 'tasks', 'task_alt'], [c.analytics, 'analytics', 'analytics'], [c.gifts, 'gift-cards', 'card_giftcard'], [c.loyalty, 'loyalty', 'loyalty'], [c.growth, 'growth', 'hourglass_top'], [c.settings, '/(business)/admin', 'settings'], [c.billing, 'billing', 'payments'], [c.telegram, 'telegram', 'send'],
  ] as const;
  const open = (target: string) => router.push((target.startsWith('/') ? target : `/(business)/${target}`) as Href);
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.title, { color: theme.text }]}>{c.title}</Text><View style={styles.list}>{items.map(([title, target, icon]) => <Pressable key={target} onPress={() => open(target)} style={({ pressed }) => [styles.item, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, opacity: pressed ? 0.75 : 1 }]}><View style={[styles.icon, { backgroundColor: theme.plumSoft }]}><VizitIcon ios="square.grid.2x2.fill" android={icon} color={theme.plum} size={22} /></View><Text style={[styles.label, { color: theme.text }]}>{title}</Text><VizitIcon ios="chevron.right" android="chevron_right" color={theme.muted} size={21} /></Pressable>)}</View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 18, paddingBottom: 35 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 18 }, list: { gap: 9 }, item: { minHeight: 66, borderWidth: 1, borderRadius: 11, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 43, height: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, label: { flex: 1, fontSize: 15, fontWeight: '800' } });
