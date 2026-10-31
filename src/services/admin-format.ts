/** Numeric dates: some devices lack Armenian month names. */
export function adminDate(value: string | null | undefined, locale: 'hy' | 'ru' | 'en') {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}${locale === 'en' ? '/' : '.'}${two(d.getMonth() + 1)}${locale === 'en' ? '/' : '.'}${d.getFullYear()}`;
}

export const adminMoney = (value: number | null | undefined, locale: 'hy' | 'ru' | 'en') =>
  `${Math.round(Number(value ?? 0)).toLocaleString(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US')} ֏`;
