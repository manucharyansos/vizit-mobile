import { useMutation } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, PageHeader, PreferenceBar, PremiumButton, Surface } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi } from '@/services/api/business';

const labels = {
  hy: { title: 'Բոլոր բաժինները', subtitle: 'Կառավարման ամբողջ գործիքակազմը', booking: 'Նոր ամրագրում', services: 'Ծառայություններ', staff: 'Աշխատակիցներ և գրաֆիկ', hours: 'Աշխատանքային ժամեր', blocks: 'Փակ ժամեր և բացակայություններ', locations: 'Հասցեներ և մասնաճյուղեր', media: 'Լոգո և նկարներ', tasks: 'Առաջադրանքներ', analytics: 'Վերլուծություն', gifts: 'Նվեր քարտեր', loyalty: 'Հավատարմություն', growth: 'Աճ և marketing', settings: 'Բիզնեսի կարգավորումներ', billing: 'Պլան և վճարումներ', telegram: 'Telegram ծանուցումներ', logout: 'Դուրս գալ', logoutConfirm: 'Դուրս գա՞լ բիզնես հաշվից։', cancel: 'Չեղարկել', operations: 'Գործառույթներ', insights: 'Աճ և վերլուծություն', workspace: 'Աշխատանքային տարածք', language: 'Լեզու', theme: 'Թեմա' },
  ru: { title: 'Все разделы', subtitle: 'Полный набор инструментов управления', booking: 'Новая запись', services: 'Услуги', staff: 'Сотрудники и график', hours: 'Рабочие часы', blocks: 'Закрытые часы и отсутствие', locations: 'Адреса и филиалы', media: 'Логотип и фото', tasks: 'Задачи', analytics: 'Аналитика', gifts: 'Подарочные карты', loyalty: 'Лояльность', growth: 'Рост и маркетинг', settings: 'Настройки бизнеса', billing: 'Тариф и платежи', telegram: 'Telegram-уведомления', logout: 'Выйти', logoutConfirm: 'Выйти из бизнес-аккаунта?', cancel: 'Отмена', operations: 'Операции', insights: 'Рост и аналитика', workspace: 'Рабочее пространство', language: 'Язык', theme: 'Тема' },
  en: { title: 'All sections', subtitle: 'Your complete management toolkit', booking: 'New booking', services: 'Services', staff: 'Team and schedules', hours: 'Working hours', blocks: 'Blocked time and leave', locations: 'Locations and branches', media: 'Logo and images', tasks: 'Tasks', analytics: 'Analytics', gifts: 'Gift cards', loyalty: 'Loyalty', growth: 'Growth and marketing', settings: 'Business settings', billing: 'Plan and billing', telegram: 'Telegram notifications', logout: 'Sign out', logoutConfirm: 'Sign out of the business account?', cancel: 'Cancel', operations: 'Operations', insights: 'Growth and insights', workspace: 'Workspace', language: 'Language', theme: 'Appearance' },
};

type MenuItem = {
  title: string;
  target: string;
  ios: React.ComponentProps<typeof VizitIcon>['ios'];
  android: React.ComponentProps<typeof VizitIcon>['android'];
};

export default function BusinessMore() {
  const { locale, theme } = useApp();
  const c = labels[locale];
  const groups: { title: string; items: MenuItem[] }[] = [
    { title: c.operations, items: [
      { title: c.services, target: '/(business)/services', ios: 'square.grid.2x2.fill', android: 'grid_view' },
      { title: c.staff, target: '/(business)/staff', ios: 'person.2.fill', android: 'group' },
      { title: c.hours, target: 'working-hours', ios: 'clock.fill', android: 'schedule' },
      { title: c.blocks, target: 'calendar-blocks', ios: 'calendar.badge.minus', android: 'event_busy' },
      { title: c.locations, target: 'locations', ios: 'mappin.and.ellipse', android: 'location_on' },
    ] },
    { title: c.insights, items: [
      { title: c.tasks, target: 'tasks', ios: 'checkmark.circle.fill', android: 'task_alt' },
      { title: c.analytics, target: 'analytics', ios: 'chart.bar.fill', android: 'analytics' },
      { title: c.gifts, target: 'gift-cards', ios: 'giftcard.fill', android: 'card_giftcard' },
      { title: c.loyalty, target: 'loyalty', ios: 'heart.fill', android: 'loyalty' },
      { title: c.growth, target: 'growth', ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
    ] },
    { title: c.workspace, items: [
      { title: c.media, target: 'profile-media', ios: 'photo.on.rectangle.angled', android: 'photo_library' },
      { title: c.settings, target: '/(business)/admin', ios: 'gearshape.fill', android: 'settings' },
      { title: c.billing, target: 'billing', ios: 'creditcard.fill', android: 'payments' },
      { title: c.telegram, target: 'telegram', ios: 'paperplane.fill', android: 'send' },
    ] },
  ];
  const open = (target: string) => router.push((target.startsWith('/') ? target : `/(business)/${target}`) as Href);
  const logout = useMutation({ mutationFn: businessApi.logout, onSettled: () => router.replace('/(business)/login') });
  const confirmLogout = () => Alert.alert(c.logout, c.logoutConfirm, [{ text: c.cancel, style: 'cancel' }, { text: c.logout, style: 'destructive', onPress: () => logout.mutate() }]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Vizit Business" title={c.title} subtitle={c.subtitle} />
        <PreferenceBar languageLabel={c.language} themeLabel={c.theme} />
        <PremiumButton title={c.booking} onPress={() => open('new-booking')} icon={{ ios: 'calendar.badge.plus', android: 'add_circle' }} style={styles.booking} />
        {groups.map((group) => <MenuGroup key={group.title} title={group.title} items={group.items} onOpen={open} />)}
        <PremiumButton title={c.logout} loading={logout.isPending} onPress={confirmLogout} tone="danger" icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuGroup({ title, items, onOpen }: { title: string; items: MenuItem[]; onOpen: (target: string) => void }) {
  const { theme } = useApp();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: theme.muted }]}>{title.toLocaleUpperCase()}</Text>
      <Surface style={styles.groupCard} elevated>
        {items.map((item, index) => (
          <View key={item.target}>
            <Pressable accessibilityRole="button" onPress={() => onOpen(item.target)} style={({ pressed }) => [styles.item, { backgroundColor: pressed ? theme.surfacePressed : 'transparent' }]}>
              <View style={[styles.icon, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios={item.ios} android={item.android} color={theme.accentText} size={20} /></View>
              <Text style={[styles.label, { color: theme.text }]}>{item.title}</Text>
              <VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={19} />
            </Pressable>
            {index < items.length - 1 ? <View style={styles.dividerInset}><Divider /></View> : null}
          </View>
        ))}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, paddingBottom: 38, gap: 18 },
  booking: { marginTop: 1 },
  group: { gap: 8 },
  groupTitle: ui.type.eyebrow,
  groupCard: { padding: 5, overflow: 'hidden' },
  item: { minHeight: 58, borderRadius: ui.radius.medium, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { ...ui.type.body, flex: 1, fontWeight: '700' },
  dividerInset: { paddingLeft: 57, paddingRight: 8 },
});
