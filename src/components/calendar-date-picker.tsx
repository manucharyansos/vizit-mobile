import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { localDateKey } from '@/services/date-time';

const WEEKDAYS = {
  hy: ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;

const LOCALE_TAG = { hy: 'hy-AM', ru: 'ru-RU', en: 'en-US' } as const;
const two = (value: number) => String(value).padStart(2, '0');

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? month - 1 : new Date().getMonth(),
    day: Number.isFinite(day) ? day : 1,
  };
}

export function CalendarDatePicker({ value, onChange, minDate = localDateKey() }: { value: string; onChange: (value: string) => void; minDate?: string }) {
  const { locale, theme } = useApp();
  const initial = parseDateKey(value || minDate);
  const [visibleMonth, setVisibleMonth] = useState({ year: initial.year, month: initial.month });

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
    const leading = (firstWeekday + 6) % 7;
    const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);

  const monthLabel = new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)),
  );
  const previousLabel = locale === 'hy' ? 'Նախորդ ամիս' : locale === 'ru' ? 'Предыдущий месяц' : 'Previous month';
  const nextLabel = locale === 'hy' ? 'Հաջորդ ամիս' : locale === 'ru' ? 'Следующий месяц' : 'Next month';

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + delta, 1));
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <IconButton ios="chevron.left" android="chevron_left" accessibilityLabel={previousLabel} onPress={() => shiftMonth(-1)} size={40} style={{ backgroundColor: theme.surfaceRaised }} />
        <Text style={[styles.month, { color: theme.text }]}>{monthLabel}</Text>
        <IconButton ios="chevron.right" android="chevron_right" accessibilityLabel={nextLabel} onPress={() => shiftMonth(1)} size={40} style={{ backgroundColor: theme.surfaceRaised }} />
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS[locale].map((weekday) => (
          <Text key={weekday} style={[styles.weekday, { color: theme.muted }]}>{weekday}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day == null) return <View key={`empty-${index}`} style={styles.cell} />;
          const key = `${visibleMonth.year}-${two(visibleMonth.month + 1)}-${two(day)}`;
          const selected = key === value;
          const today = key === localDateKey();
          const disabled = key < minDate;
          return (
            <View key={key} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={key}
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                onPress={() => onChange(key)}
                style={({ pressed }) => [
                  styles.day,
                  { borderColor: today ? theme.accent : 'transparent', opacity: disabled ? 0.25 : pressed ? 0.7 : 1 },
                  selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
              >
                <Text style={[styles.dayText, { color: selected ? theme.onPrimary : theme.text }]}>{day}</Text>
                {today && !selected ? <View style={[styles.todayDot, { backgroundColor: theme.accent }]} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: ui.radius.medium, padding: ui.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ui.spacing.sm },
  month: { fontSize: 16, lineHeight: 21, fontWeight: '800', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: ui.spacing.xxs },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 43, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '800' },
  todayDot: { position: 'absolute', bottom: 3, width: 3, height: 3, borderRadius: 2 },
});
