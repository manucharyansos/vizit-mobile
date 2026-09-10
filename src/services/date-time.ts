export type AppLocale = 'hy' | 'ru' | 'en';

export const APP_TIME_ZONE = 'Asia/Yerevan';

const localeTag: Record<AppLocale, string> = {
  hy: 'hy-AM',
  ru: 'ru-RU',
  en: 'en-US',
};

const hasExplicitZone = (value: string) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
const two = (value: number) => String(value).padStart(2, '0');

function normalizeZonedIso(value: string): string {
  return value
    .trim()
    .replace(' ', 'T')
    .replace(/\.(\d{3})\d+(?=Z|[+-]\d{2}:?\d{2}$)/i, '.$1');
}

function datePartsInAppZone(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read('year'), month: read('month'), day: read('day') };
}

function dateTimePartsInAppZone(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute') };
}

export function localDateKey(days = 0): string {
  const today = datePartsInAppZone(new Date());
  const shifted = new Date(Date.UTC(today.year, today.month - 1, today.day + days, 12, 0, 0));
  return `${shifted.getUTCFullYear()}-${two(shifted.getUTCMonth() + 1)}-${two(shifted.getUTCDate())}`;
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
    const parsed = new Date(normalizeZonedIso(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return parseLocalWallClock(value);
}

export function formatApiDateTime(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '—';
  const date = apiDateToLocal(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(localeTag[locale], {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
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
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
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
  const parts = datePartsInAppZone(date);
  return `${parts.year}-${two(parts.month)}-${two(parts.day)}`;
}

export function localDateTimeInputFromApi(value: string): string {
  if (!hasExplicitZone(value)) return value.replace(' ', 'T').slice(0, 16);
  const date = apiDateToLocal(value);
  if (!date) return value.slice(0, 16);
  const parts = dateTimePartsInAppZone(date);
  return `${parts.year}-${two(parts.month)}-${two(parts.day)}T${two(parts.hour)}:${two(parts.minute)}`;
}
