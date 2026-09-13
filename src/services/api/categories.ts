import { publicClient } from './client';
import { normalizeList } from './normalize';
import type { AppLocale } from '../date-time';

export type BusinessVertical = 'services' | 'healthcare';
export type BusinessCategory = {
  id: number;
  slug: string;
  vertical: BusinessVertical;
  name?: string | null;
  name_hy?: string | null;
  name_ru?: string | null;
  name_en?: string | null;
};

export async function fetchBusinessCategories(locale: AppLocale): Promise<BusinessCategory[]> {
  const params = { locale };
  let response;
  try {
    response = await publicClient.get('/v1/public/categories', { params });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 404) throw error;
    response = await publicClient.get('/public/categories', { params });
  }
  return normalizeList<BusinessCategory>(response.data, ['categories']).filter((category) =>
    category && Number.isInteger(category.id) && category.id > 0 && typeof category.slug === 'string' && category.slug.trim() &&
    (category.vertical === 'services' || category.vertical === 'healthcare'),
  );
}

export function categoryName(category: BusinessCategory, locale: AppLocale): string {
  return category[`name_${locale}`]?.trim() || category.name?.trim() || category.name_hy?.trim() || category.name_en?.trim() || category.slug;
}
