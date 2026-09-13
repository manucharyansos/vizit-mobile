import type { BusinessCategory, BusinessVertical } from './api/categories';
import type { BusinessRegistration } from './api/business';

type CategoryFields = Pick<BusinessRegistration, 'business_category_id' | 'business_category_slug' | 'custom_category_name'>;

/** Resolve from the active list so a previous vertical's selection cannot be submitted. */
export function registrationCategoryFields(categories: BusinessCategory[], vertical: BusinessVertical, slug: string, customName: string): CategoryFields | null {
  const category = categories.find((item) => item.vertical === vertical && item.slug === slug);
  if (!category) return null;
  const custom = customName.trim();
  const other = category.slug.startsWith('other-');
  if (other && (!custom || custom.length > 120)) return null;
  return {
    business_category_id: category.id,
    business_category_slug: category.slug,
    ...(other ? { custom_category_name: custom } : {}),
  };
}
