import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PremiumButton, StateCard } from './premium-ui';
import { RentalSettingsScreen } from './rental-settings-screen';
import { useBusinessPermissions } from '@/hooks/use-business-permissions';
import { useApp } from '@/providers/app-provider';
import { rentalCopy } from '@/i18n/rentals';
import { isRentalBusiness } from '@/services/rentals';

/** Select a screen after the authenticated business type is known. No redirects. */
export function BusinessTypeScreen({ children, rental, allowIncomplete = false }: { children: ReactNode; rental: ReactNode; allowIncomplete?: boolean }) {
  const permissions = useBusinessPermissions();
  const { theme, locale } = useApp();
  const c = rentalCopy[locale];
  if (permissions.isLoading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.accent} accessibilityLabel={c.loading} /></View>;
  if (permissions.isError) return <View style={{ flex: 1, padding: 20, backgroundColor: theme.background }}><StateCard title={c.failed} action={<PremiumButton title={c.retry} onPress={() => void permissions.refetch()} />} /></View>;
  if (!isRentalBusiness(permissions.user)) return children;
  if (!permissions.canManage) return <StateCard title={c.unavailable} />;
  if (permissions.user?.needs_onboarding && !allowIncomplete) return <RentalSettingsScreen />;
  return rental;
}
