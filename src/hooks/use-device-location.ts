import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { validPoint, type GeoPoint } from '@/services/geo';

export type LocationProblem = 'permission' | 'disabled' | 'unavailable' | 'upgrade';
export function useDeviceLocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationProblem | null>(null);
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const locate = useCallback(async (): Promise<GeoPoint | null> => {
    if (pending.current) return null;
    pending.current = true; setLoading(true); setError(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Older preview APKs can receive the other fixes safely through OTA.
      // Loading ExpoLocation before checking for the optional module would crash them.
      if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoLocation')) throw new Error('upgrade');
      const Location = await import('expo-location');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('permission');
      if (!await Location.hasServicesEnabledAsync()) throw new Error('disabled');
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('unavailable')), 15_000); }),
      ]);
      const next = validPoint(result.coords.latitude, result.coords.longitude);
      if (!next) throw new Error('unavailable');
      if (active.current) setPoint(next);
      return next;
    } catch (problem) {
      const kind = problem instanceof Error ? problem.message : '';
      if (active.current) setError(['permission', 'disabled', 'upgrade'].includes(kind) ? kind as LocationProblem : 'unavailable');
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
      pending.current = false;
      if (active.current) setLoading(false);
    }
  }, []);
  return { point, loading, error, locate };
}
