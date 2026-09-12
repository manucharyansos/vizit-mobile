import type { PublicBusiness } from './api/public';
import type { AppLocale } from './date-time';
export function businessCategory(business: PublicBusiness, locale: AppLocale): string | null {
  return business.category_names?.[locale] || business.category_name || null;
}
