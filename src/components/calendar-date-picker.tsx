import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VizitIcon } from '@/components/vizit-icon';
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

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + delta, 1));
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => shiftMonth(-1)} style={[styles.arrow, { borderColor: theme.border }]}>
          <VizitIcon ios="chevron.left" android="chevron_left" color={theme.text} size={21} />
        </Pressable>
        <Text style={[styles.month, { color: theme.text }]}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" onPress={() => shiftMonth(1)} style={[styles.arrow, { borderColor: theme.border }]}>
          <VizitIcon ios="chevron.right" android="chevron_right" color={theme.text} size={21} />
        </Pressable>
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
                disabled={disabled}
                onPress={() => onChange(key)}
                style={[
                  styles.day,
                  { borderColor: today ? theme.plum : 'transparent', opacity: disabled ? 0.28 : 1 },
                  selected && { backgroundColor: theme.plum, borderColor: theme.plum },
                ]}
              >
                <Text style={[styles.dayText, { color: selected ? '#FFFFFF' : theme.text }]}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  arrow: { width: 38, height: 38, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  month: { fontSize: 17, fontWeight: '900', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: 5 },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 43, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '800' },
});
