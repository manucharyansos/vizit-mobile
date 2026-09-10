export type AppLocale = 'hy' | 'ru' | 'en';

const localeTag: Record<AppLocale, string> = {
  hy: 'hy-AM',
  ru: 'ru-RU',
  en: 'en-US',
};

const hasExplicitZone = (value: string) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());

const two = (value: number) => String(value).padStart(2, '0');

export function localDateKey(days = 0): string {
  const date = new Date();
  // Noon avoids DST/midnight edge cases when adding calendar days.
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function parseLocalWallClock(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function apiDateToLocal(value?: string | null): Date | null {
  if (!value) return null;
  if (hasExplicitZone(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return parseLocalWallClock(value);
}

export function formatApiDateTime(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '—';
  const date = apiDateToLocal(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatApiTime(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '';
  if (!hasExplicitZone(value)) {
    const match = value.match(/[T ](\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
  }
  const date = apiDateToLocal(value);
  if (!date) return value.slice(11, 16);
  return new Intl.DateTimeFormat(localeTag[locale], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function localDateKeyFromApi(value?: string | null): string | null {
  if (!value) return null;
  if (!hasExplicitZone(value)) {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? null;
  }
  const date = apiDateToLocal(value);
  if (!date) return null;
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function localDateTimeInputFromApi(value: string): string {
  if (!hasExplicitZone(value)) return value.replace(' ', 'T').slice(0, 16);
  const date = apiDateToLocal(value);
  if (!date) return value.slice(0, 16);
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}
