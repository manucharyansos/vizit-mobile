import type { ServiceDiscountTiers } from './api/business';

/** Keeps only well-formed levels; null when a business offers no service discounts. */
export function parseServiceDiscounts(value: unknown): ServiceDiscountTiers | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ServiceDiscountTiers>;
  const visit_tiers = Array.isArray(raw.visit_tiers) ? raw.visit_tiers.filter((tier) => Number(tier?.min_visits) > 0 && Number(tier?.percent) > 0) : [];
  const bundle_tiers = Array.isArray(raw.bundle_tiers) ? raw.bundle_tiers.filter((tier) => Number(tier?.min_services) > 1 && Number(tier?.percent) > 0) : [];
  return visit_tiers.length || bundle_tiers.length ? { visit_tiers, bundle_tiers } : null;
}
