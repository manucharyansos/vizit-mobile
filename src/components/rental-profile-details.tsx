import { Image } from 'expo-image';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PremiumButton, SectionHeader, StateCard, Surface } from './premium-ui';
import { VizitIcon } from './vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { rentalCopy } from '@/i18n/rentals';
import { useApp } from '@/providers/app-provider';
import type { PublicBusiness } from '@/services/api/public';
import { rentalDurationLabel } from '@/services/rentals';

export function RentalProfileDetails({ business }: { business: PublicBusiness }) {
  const { locale, theme } = useApp();
  const c = rentalCopy[locale], rates = business.rental;
  return <View style={styles.content}>
    {rates && rates.hourly_price != null ? <Surface style={styles.stack} elevated>
      <View style={styles.row}><View style={styles.flex}><Text style={[styles.caption, { color: theme.muted }]}>{c.hourly}</Text><Text style={[styles.price, { color: theme.text }]}>{rates.hourly_price.toLocaleString()} ֏</Text></View><View style={[styles.icon, { backgroundColor: theme.accentSoft }]}><VizitIcon ios="building.2.fill" android="meeting_room" color={theme.accentText} size={24} /></View></View>
      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      <Text style={[styles.body, { color: theme.textSecondary }]}>{c.durationHint}: {rentalDurationLabel(rates.min_minutes, c)} – {rentalDurationLabel(rates.max_minutes, c)}</Text>
      <Text style={[styles.caption, { color: theme.muted }]}>{rates.allow_overnight ? c.overnight : c.withinHours}</Text>
      <Text style={[styles.caption, { color: theme.muted }]}>{c.dayHelp}</Text>
      <Text style={[styles.caption, { color: theme.muted }]}>{c.timezone}: {business.timezone || 'Asia/Yerevan'}</Text>
    </Surface> : <StateCard title={c.unavailable} />}
    {business.gallery?.length ? <View style={styles.stack}>
      <SectionHeader title={c.gallery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
        {business.gallery.map((item) => <Surface key={item.id} style={styles.media}>
          {item.kind === 'image' ? <Image source={item.url} accessibilityLabel={item.caption || business.name} contentFit="cover" transition={180} style={styles.image} /> : <View style={[styles.video, { backgroundColor: theme.accentSubtle }]}><VizitIcon ios="play.circle.fill" android="play_circle" size={40} color={theme.accentText} /><PremiumButton title={c.video} tone="ghost" compact onPress={() => { void Linking.openURL(item.url).catch(() => Alert.alert(c.failed)); }} /></View>}
          {item.caption ? <Text style={[styles.caption, { color: theme.textSecondary }]}>{item.caption}</Text> : null}
        </Surface>)}
      </ScrollView>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: ui.screenGutter, paddingTop: 24, gap: 24 }, stack: { gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 16 }, flex: { flex: 1 }, price: { ...ui.type.pageTitle, marginTop: 4 }, body: ui.type.body, caption: ui.type.caption, icon: { height: 48, width: 48, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center' }, divider: { height: StyleSheet.hairlineWidth }, gallery: { gap: 12 }, media: { width: 260, padding: 10, gap: 10 }, image: { height: 175, width: '100%', borderRadius: ui.radius.small }, video: { height: 175, borderRadius: ui.radius.small, justifyContent: 'center', alignItems: 'center', gap: 12 } });
