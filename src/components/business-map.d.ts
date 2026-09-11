import { PublicBusiness } from '@/services/api/public';
export function BusinessMap(props: { businesses: PublicBusiness[]; onSelect: (business: PublicBusiness, locationId?: number) => void }): React.JSX.Element;
