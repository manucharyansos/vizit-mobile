import { Linking } from 'react-native';
import { directionsUrl, yandexDirectionsUrl, type GeoPoint, type RouteMode } from './geo';

export async function openDirections(destination: GeoPoint, origin?: GeoPoint | null, mode: RouteMode = 'driving', provider: 'yandex' | 'google' = 'yandex') {
  const fallback = directionsUrl(destination, origin, mode);
  if (provider === 'google') return Linking.openURL(fallback);
  try { await Linking.openURL(yandexDirectionsUrl(destination, origin, mode)); }
  catch { await Linking.openURL(fallback); }
}
