import { useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PremiumButton } from './premium-ui';
import { VizitIcon } from './vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { categoryName, type BusinessCategory } from '@/services/api/categories';

export const categoryCopy = {
  hy: { label: 'Բիզնեսի կատեգորիա', placeholder: 'Ընտրեք կատեգորիան', help: 'Ընտրեք ձեր բիզնեսին համապատասխան կատեգորիան։', custom: 'Նշեք կոնկրետ ծառայությունը', customPlaceholder: 'Օրինակ՝ կենդանիների խնամք', failed: 'Չհաջողվեց բեռնել կատեգորիաները։', empty: 'Այս ուղղության համար կատեգորիաներ դեռ չկան։', retry: 'Կրկին փորձել', close: 'Փակել', required: 'Ընտրեք կատեգորիան, իսկ «Այլ» տարբերակի դեպքում նշեք ծառայությունը։' },
  ru: { label: 'Категория бизнеса', placeholder: 'Выберите категорию', help: 'Выберите категорию, которая подходит вашему бизнесу.', custom: 'Укажите конкретную услугу', customPlaceholder: 'Например, уход за животными', failed: 'Не удалось загрузить категории.', empty: 'Для этого направления пока нет категорий.', retry: 'Повторить', close: 'Закрыть', required: 'Выберите категорию, а для варианта «Другое» укажите услугу.' },
  en: { label: 'Business category', placeholder: 'Choose a category', help: 'Choose the category that fits your business.', custom: 'Specify the service', customPlaceholder: 'For example, pet care', failed: 'Could not load categories.', empty: 'No categories are available for this area yet.', retry: 'Try again', close: 'Close', required: 'Choose a category and specify the service if you select Other.' },
};

type Props = {
  categories: BusinessCategory[];
  value: string;
  onChange: (slug: string) => void;
  loading: boolean;
  error: boolean;
  disabled?: boolean;
  onRetry: () => void;
};

export function BusinessCategoryPicker({ categories, value, onChange, loading, error, disabled = false, onRetry }: Props) {
  const { theme, locale } = useApp();
  const c = categoryCopy[locale];
  const [open, setOpen] = useState(false);
  const selected = categories.find((item) => item.slug === value);
  const unavailable = loading || error || categories.length === 0;
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{c.label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${c.label}: ${selected ? categoryName(selected, locale) : c.placeholder}`}
        accessibilityState={{ disabled: disabled || unavailable, expanded: open, busy: loading }}
        disabled={disabled || unavailable}
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
        style={({ pressed }) => [styles.field, { borderColor: theme.borderStrong, backgroundColor: theme.surface, opacity: pressed || disabled ? 0.65 : 1 }]}
      >
        <VizitIcon ios="square.grid.2x2" android="category" color={theme.accentText} size={20} />
        <Text style={[styles.value, { color: selected ? theme.text : theme.muted }]}>{selected ? categoryName(selected, locale) : c.placeholder}</Text>
        {loading ? <ActivityIndicator color={theme.accent} /> : <VizitIcon ios="chevron.down" android="expand_more" color={theme.muted} size={20} />}
      </Pressable>
      <Text style={[styles.help, { color: error ? theme.danger : theme.muted }]} accessibilityLiveRegion="polite">{error ? c.failed : !loading && !categories.length ? c.empty : c.help}</Text>
      {!loading && (error || !categories.length) ? <PremiumButton title={c.retry} onPress={onRetry} tone="secondary" compact /> : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessible={false} />
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.surfaceRaised }]} accessibilityViewIsModal>
            <View style={[styles.heading, { borderBottomColor: theme.border }]}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{c.label}</Text>
              <IconButton accessibilityLabel={c.close} ios="xmark" android="close" onPress={() => setOpen(false)} />
            </View>
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {categories.map((item) => {
                const checked = item.slug === value;
                return <Pressable key={item.slug} accessibilityRole="radio" accessibilityState={{ checked }} onPress={() => { onChange(item.slug); setOpen(false); }} style={({ pressed }) => [styles.option, { backgroundColor: checked ? theme.accentSoft : pressed ? theme.surfacePressed : 'transparent', borderColor: checked ? theme.accent : theme.border }]}>
                  <Text style={[styles.value, { color: checked ? theme.accentText : theme.text }]}>{categoryName(item, locale)}</Text>
                  <VizitIcon ios={checked ? 'checkmark.circle.fill' : 'circle'} android={checked ? 'check_circle' : 'radio_button_unchecked'} color={checked ? theme.accentText : theme.muted} size={22} />
                </Pressable>;
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7, marginBottom: 18 },
  label: { ...ui.type.caption, marginLeft: 2 },
  field: { minHeight: ui.controlHeight, borderRadius: ui.radius.medium, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { ...ui.type.body, flex: 1 },
  help: { ...ui.type.caption, marginHorizontal: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: ui.radius.xlarge, borderTopRightRadius: ui.radius.xlarge },
  heading: { padding: 18, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  title: { ...ui.type.sectionTitle, flex: 1 },
  list: { padding: 16, gap: 8 },
  option: { minHeight: 52, padding: 14, borderWidth: 1, borderRadius: ui.radius.medium, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
