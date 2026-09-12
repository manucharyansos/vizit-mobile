import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';

/** Keep both ends of a time range intact on narrow screens and with large text. */
export function TimeSlot({ start, end, detail, selected = false, disabled = false, tone = 'neutral', onPress }: {
  start: string;
  end: string;
  detail?: string;
  selected?: boolean;
  disabled?: boolean;
  tone?: 'neutral' | 'recommended' | 'busy';
  onPress: () => void;
}) {
  const { theme, locale } = useApp();
  const { fontScale, width } = useWindowDimensions();
  const color = selected ? theme.onPrimary : tone === 'busy' ? theme.danger : theme.text;
  const secondary = selected ? theme.onPrimary : tone === 'busy' ? theme.danger : theme.muted;
  const background = selected ? theme.primary : tone === 'busy' ? theme.dangerSoft : tone === 'recommended' ? theme.successSoft : theme.surface;
  const border = selected ? theme.primary : tone === 'busy' ? theme.danger : tone === 'recommended' ? theme.success : theme.border;
  const status = tone === 'busy' ? { hy: 'Զբաղված', ru: 'Занято', en: 'Busy' }[locale] : tone === 'recommended' ? { hy: 'Առաջարկվող', ru: 'Рекомендуем', en: 'Recommended' }[locale] : '';
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={[`${start} – ${end}`, detail, status].filter(Boolean).join(', ')}
    accessibilityState={{ selected, disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.cell, { minWidth: Math.min(width - 2 * (ui.screenGutter + ui.spacing.md), Math.ceil(102 * fontScale)), backgroundColor: background, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}
  >
    <Text style={[styles.start, { color }]}>{start}</Text>
    <Text style={[styles.end, { color: secondary }]}>– {end}</Text>
    {detail ? <Text style={[styles.detail, { color: secondary }]}>{detail}</Text> : null}
    {tone !== 'neutral' ? <Text style={[styles.status, { color: selected ? theme.onPrimary : tone === 'busy' ? theme.danger : theme.success }]}>{status}</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  cell: { flexBasis: '30%', flexGrow: 1, borderWidth: 1, borderRadius: ui.radius.small, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  start: { fontSize: 17, lineHeight: 23, fontWeight: '700', fontVariant: ['tabular-nums'] },
  end: { fontSize: 13, lineHeight: 18, fontWeight: '500', fontVariant: ['tabular-nums'] },
  detail: { ...ui.type.caption, textAlign: 'center', marginTop: 4 },
  status: { fontSize: 10, lineHeight: 15, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
