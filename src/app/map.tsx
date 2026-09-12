import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BusinessMap } from '@/components/business-map';
import { IconButton, PageHeader, PremiumButton, PremiumInput, StateCard } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useApp } from '@/providers/app-provider';
import { publicApi } from '@/services/api/public';
import { distanceKm, validPoint, type GeoPoint } from '@/services/geo';
import { openDirections } from '@/services/directions';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: { title: 'Գտիր քո վայրը', all: 'Բոլորը', nearby: 'Մոտակայքում', locate: 'Իմ մոտակայքում', search: 'Բիզնես կամ հասցե', book: 'Ամրագրել', profile: 'Բիզնեսի էջը', route: 'Ինչպես հասնել', close: 'Փակել', retry: 'Կրկին փորձել', empty: 'Այստեղ բիզնեսներ չեն գտնվել', km: 'կմ', m: 'մ', radius: 'Շառավիղ', distance: 'Ուղիղ հեռավորություն', origin: 'Ընտրված կետի մոտ', hint: 'Կարող ես նաև քարտեզի վրա երկար սեղմելով ընտրել մեկնակետը։', permission: 'Թույլատրիր տեղադրության հասանելիությունը՝ մոտակա բիզնեսները տեսնելու համար։', disabled: 'Միացրու հեռախոսի տեղադրության ծառայությունը։', unavailable: 'Տեղադրությունը չհաջողվեց որոշել։ Կրկին փորձիր կամ ընտրիր կետը քարտեզի վրա։', upgrade: 'Ավտոմատ տեղադրության համար թարմացրու հավելվածի տեղադրված տարբերակը։ Մինչ այդ կարող ես ընտրել կետը քարտեզի վրա։', settings: 'Կարգավորումներ', chooseMap: 'Բացել երթուղին', walking: 'Ոտքով', driving: 'Մեքենայով' },
  ru: { title: 'Найдите своё место', all: 'Все', nearby: 'Рядом', locate: 'Рядом со мной', search: 'Бизнес или адрес', book: 'Записаться', profile: 'Страница бизнеса', route: 'Как добраться', close: 'Закрыть', retry: 'Повторить', empty: 'Здесь бизнесы не найдены', km: 'км', m: 'м', radius: 'Радиус', distance: 'По прямой', origin: 'Рядом с выбранной точкой', hint: 'Можно также выбрать отправную точку долгим нажатием на карту.', permission: 'Разрешите доступ к геолокации, чтобы увидеть ближайшие бизнесы.', disabled: 'Включите определение местоположения на телефоне.', unavailable: 'Не удалось определить место. Повторите или выберите точку на карте.', upgrade: 'Для автоматического определения места обновите установленную версию приложения. Пока можно выбрать точку на карте.', settings: 'Настройки', chooseMap: 'Открыть маршрут', walking: 'Пешком', driving: 'На машине' },
  en: { title: 'Find your place', all: 'All', nearby: 'Nearby', locate: 'Near me', search: 'Business or address', book: 'Book', profile: 'Business profile', route: 'Directions', close: 'Close', retry: 'Try again', empty: 'No businesses found here', km: 'km', m: 'm', radius: 'Radius', distance: 'Straight-line distance', origin: 'Near your selected point', hint: 'You can also choose a starting point by holding a spot on the map.', permission: 'Allow location access to see nearby businesses.', disabled: 'Turn on location services on your phone.', unavailable: 'Could not find your location. Try again or choose a point on the map.', upgrade: 'Update the installed app for automatic location. You can choose a point on the map for now.', settings: 'Settings', chooseMap: 'Open directions', walking: 'Walking', driving: 'Driving' },
};

export default function MapScreen() {
  const { locale, theme, t } = useApp(); const c = copy[locale];
  const location = useDeviceLocation();
  const [manualOrigin, setManualOrigin] = useState<GeoPoint | null>(null);
  const origin = manualOrigin ?? location.point;
  const [focus, setFocus] = useState<GeoPoint | null>(null);
  const [nearby, setNearby] = useState(false);
  const [radius, setRadius] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [walking, setWalking] = useState(false);
  const businesses = useQuery({ queryKey: ['map-businesses'], queryFn: publicApi.mapBusinesses, staleTime: 60_000 });
  const branches = useMemo(() => (businesses.data ?? []).flatMap((business) => business.locations.flatMap((branch) => {
    const point = validPoint(branch.lat, branch.lng);
    if (!point) return [];
    return [{ business, branch, point, distance: origin ? distanceKm(origin, point) : null }];
  })).sort((a, b) => origin ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : a.business.name.localeCompare(b.business.name, locale)), [businesses.data, origin, locale]);
  const visible = useMemo(() => branches.filter((item) => (!nearby || item.distance !== null && item.distance <= radius) && [item.business.name, item.business.category_name, item.branch.name, item.branch.address].some((field) => field?.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)))), [branches, nearby, radius, search, locale]);
  const mapped = useMemo(() => {
    const ids = new Set(visible.map((item) => item.branch.id));
    return (businesses.data ?? []).map((business) => ({ ...business, locations: business.locations.filter((branch) => ids.has(branch.id)) })).filter((business) => business.locations.length);
  }, [businesses.data, visible]);
  const selected = visible.find((item) => item.branch.id === selectedId);
  const nearMe = async () => {
    const point = await location.locate();
    if (point) { setManualOrigin(null); setNearby(true); setFocus(point); setSelectedId(null); }
  };
  const formatDistance = (value: number) => value < 1 ? `${Math.max(10, Math.round(value * 100) * 10)} ${c.m}` : `${value.toFixed(1)} ${c.km}`;
  const route = () => {
    if (!selected) return;
    const open = (provider: 'yandex' | 'google') => { void openDirections(selected.point, origin, walking ? 'walking' : 'driving', provider).catch(() => Alert.alert(t('loadError'))); };
    Alert.alert(c.chooseMap, '', [{ text: 'Yandex Maps', onPress: () => open('yandex') }, { text: 'Google Maps', onPress: () => open('google') }, { text: c.close, style: 'cancel' }]);
  };
  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={styles.header}>
      <PageHeader title={c.title} onBack={() => safeBack('/(customer)/discover')} backLabel={t('back')} />
      <PremiumInput accessibilityLabel={c.search} placeholder={c.search} value={search} onChangeText={(value) => { setSearch(value); setSelectedId(null); setFocus(null); }} icon={{ ios: 'magnifyingglass', android: 'search' }} />
      <View style={styles.controls}>
        {[false, true].map((near) => <Pressable key={String(near)} accessibilityRole="tab" accessibilityState={{ selected: nearby === near }} onPress={() => { setSelectedId(null); if (near && !origin) void nearMe(); else { setNearby(near); setFocus(near ? origin : null); } }} style={[styles.filter, { backgroundColor: nearby === near ? theme.primary : theme.surfaceRaised, borderColor: nearby === near ? theme.primary : theme.border }]}><Text style={[styles.filterText, { color: nearby === near ? theme.onPrimary : theme.text }]}>{near ? c.nearby : c.all}</Text></Pressable>)}
        <View style={styles.flex} />
        {nearby ? <View style={styles.radii}>{[1, 5, 10, 25].map((km) => <Pressable key={km} accessibilityRole="button" accessibilityLabel={`${c.radius} ${km} ${c.km}`} accessibilityState={{ selected: radius === km }} onPress={() => { setRadius(km); setFocus(null); }} style={[styles.radius, { borderColor: radius === km ? theme.accent : theme.border, backgroundColor: radius === km ? theme.accentSoft : theme.surfaceRaised }]}><Text style={[styles.filterText, { color: theme.text }]}>{km} {c.km}</Text></Pressable>)}</View> : <Text style={[styles.count, { color: theme.muted }]}>{visible.length}</Text>}
      </View>
    </View>
    {businesses.isError ? <View style={styles.error}><StateCard title={t('loadError')} tone="danger" action={<PremiumButton title={c.retry} onPress={() => void businesses.refetch()} />} /></View> : <>
      <View style={[styles.map, { backgroundColor: theme.map }]}>
        <BusinessMap businesses={mapped} selectedLocationId={selected?.branch.id} userPosition={origin} focus={focus} onChooseOrigin={(point) => { setManualOrigin(point); setNearby(true); setSelectedId(null); setFocus(point); }} onSelect={(_, id) => { const branch = branches.find((item) => item.branch.id === id); if (branch) { setSelectedId(branch.branch.id); setFocus(branch.point); } }} />
        <View style={styles.locate}><IconButton ios="location.fill" android="my_location" accessibilityLabel={c.locate} onPress={() => void nearMe()} disabled={location.loading} tone="primary" />{location.loading || businesses.isLoading ? <ActivityIndicator color={theme.accent} style={styles.mapLoader} /> : null}</View>
      </View>
      <View style={[styles.bottom, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
        {location.error ? <View style={styles.notice}><Text style={[styles.caption, { color: theme.muted }]}>{c[location.error]}</Text>{location.error === 'permission' || location.error === 'disabled' ? <PremiumButton title={c.settings} tone="ghost" compact onPress={() => void Linking.openSettings().catch(() => undefined)} /> : null}</View> : null}
        {selected ? <ScrollView contentContainerStyle={styles.details} showsVerticalScrollIndicator={false}>
          <View style={styles.row}><View style={styles.flex}><Text style={[styles.businessName, { color: theme.text }]}>{selected.business.name}</Text><Text style={[styles.caption, { color: theme.muted }]}>{selected.branch.name}</Text></View><IconButton ios="xmark" android="close" accessibilityLabel={c.close} onPress={() => setSelectedId(null)} /></View>
          <View style={styles.address}><VizitIcon ios="mappin" android="location_on" color={theme.accentText} size={18} /><Text style={[styles.addressText, { color: theme.textSecondary }]}>{selected.branch.address ?? selected.business.address ?? '—'}</Text></View>
          {selected.distance !== null ? <Text style={[styles.caption, { color: theme.accentText }]}>{c.distance} · {formatDistance(selected.distance)}</Text> : null}
          <View style={styles.row}><PremiumButton title={c.profile} tone="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: selected.business.slug, locationId: String(selected.branch.id) } })} /><PremiumButton title={c.book} style={styles.flex} onPress={() => router.push({ pathname: '/book/[slug]', params: { slug: selected.business.slug, locationId: String(selected.branch.id) } })} /></View>
          <View style={styles.row}><PremiumButton title={walking ? c.walking : c.driving} tone="secondary" compact onPress={() => setWalking((value) => !value)} /><PremiumButton title={c.route} tone="ghost" icon={{ ios: 'arrow.turn.up.right', android: 'directions' }} style={styles.flex} onPress={route} /></View>
        </ScrollView> : <FlatList data={visible} keyExtractor={(item) => String(item.branch.id)} contentContainerStyle={styles.branchList} showsVerticalScrollIndicator={false} refreshing={businesses.isRefetching} onRefresh={() => void businesses.refetch()}
          ListHeaderComponent={<Text style={[styles.listTitle, { color: theme.muted }]}>{manualOrigin ? c.origin : nearby ? c.locate : c.all} · {visible.length}{nearby ? ` · ${radius} ${c.km}` : ''}</Text>}
          ListEmptyComponent={!businesses.isLoading ? <View style={styles.notice}><Text style={[styles.businessName, { color: theme.text }]}>{c.empty}</Text><Text style={[styles.caption, { color: theme.muted }]}>{c.hint}</Text><PremiumButton title={c.all} tone="secondary" onPress={() => { setNearby(false); setSearch(''); setFocus(null); }} /></View> : <ActivityIndicator color={theme.accent} />}
          renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => { setSelectedId(item.branch.id); setFocus(item.point); }} style={({ pressed }) => [styles.branchRow, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}><View style={[styles.monogram, { backgroundColor: theme.accentSubtle }]}><Text style={[styles.businessName, { color: theme.accentText }]}>{item.business.name.slice(0, 1)}</Text></View><View style={styles.flex}><Text numberOfLines={1} style={[styles.branchName, { color: theme.text }]}>{item.business.name}</Text><Text numberOfLines={2} style={[styles.caption, { color: theme.muted }]}>{item.branch.address ?? item.branch.name}</Text></View>{item.distance !== null ? <Text style={[styles.distance, { color: theme.accentText }]}>{formatDistance(item.distance)}</Text> : <VizitIcon ios="chevron.right" android="chevron_right" color={theme.faint} size={18} />}</Pressable>}
        />}
      </View>
    </>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { paddingHorizontal: ui.screenGutter, paddingVertical: 10, gap: 12 }, controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, radii: { flexDirection: 'row', gap: 6 }, flex: { flex: 1, minWidth: 0 }, filter: { minHeight: 44, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }, filterText: ui.type.button, radius: { minHeight: 44, minWidth: 35, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, count: ui.type.caption,
  map: { flex: 1, minHeight: 140, overflow: 'hidden' }, locate: { position: 'absolute', right: 14, top: 14, gap: 8 }, mapLoader: { padding: 5 }, bottom: { maxHeight: '46%', minHeight: 150, borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: -12, overflow: 'hidden' }, details: { padding: 18, gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, businessName: ui.type.sectionTitle, branchName: ui.type.cardTitle, caption: ui.type.caption, address: { flexDirection: 'row', alignItems: 'center', gap: 6 }, addressText: { ...ui.type.body, flex: 1 }, error: { padding: ui.screenGutter }, branchList: { paddingHorizontal: 18, paddingBottom: 16 }, listTitle: { ...ui.type.eyebrow, paddingVertical: 16 }, branchRow: { minHeight: 76, paddingVertical: 10, flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth }, monogram: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, distance: { ...ui.type.caption, fontWeight: '700' }, notice: { padding: 16, gap: 8 },
});
