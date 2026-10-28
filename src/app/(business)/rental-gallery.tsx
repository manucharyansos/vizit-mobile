import { BusinessTypeScreen } from '@/components/business-type-screen';
import { RentalSettingsScreen } from '@/components/rental-settings-screen';
import ProfileMedia from './profile-media';

export default function RentalGallery() {
  return <BusinessTypeScreen allowIncomplete rental={<RentalSettingsScreen galleryOnly />}><ProfileMedia /></BusinessTypeScreen>;
}
