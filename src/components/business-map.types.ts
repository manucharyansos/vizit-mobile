import type { PublicBusiness } from '@/services/api/public';
import type { GeoPoint } from '@/services/geo';
export type BusinessMapProps = {
  businesses: PublicBusiness[];
  onSelect: (business: PublicBusiness, locationId?: number) => void;
  selectedLocationId?: number;
  userPosition?: GeoPoint | null;
  focus?: GeoPoint | null;
  onChooseOrigin?: (point: GeoPoint) => void;
};
