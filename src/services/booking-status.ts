import { AppLocale } from '@/services/date-time';

const labels: Record<AppLocale, Record<string, string>> = {
  hy: {
    pending: 'Սպասում է',
    confirmed: 'Հաստատված',
    in_progress: 'Ընթացքի մեջ',
    done: 'Ավարտված',
    completed: 'Ավարտված',
    cancelled: 'Չեղարկված',
    canceled: 'Չեղարկված',
    no_show: 'Չներկայացավ',
  },
  ru: {
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    in_progress: 'В процессе',
    done: 'Завершено',
    completed: 'Завершено',
    cancelled: 'Отменено',
    canceled: 'Отменено',
    no_show: 'Не пришёл',
  },
  en: {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    done: 'Completed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    no_show: 'No-show',
  },
};

export function bookingStatusLabel(status: string | null | undefined, locale: AppLocale): string {
  if (!status) return '—';
  return labels[locale][status] ?? status.replaceAll('_', ' ');
}

export function isBookingTerminal(status: string | null | undefined): boolean {
  return !!status && ['done', 'completed', 'cancelled', 'canceled', 'no_show'].includes(status);
}
