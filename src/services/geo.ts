export type GeoPoint = { latitude: number; longitude: number };

export function validPoint(latitude: unknown, longitude: unknown): GeoPoint | null {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return null;
  const lat = Number(latitude); const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { latitude: lat, longitude: lng } : null;
}

export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export type RouteMode = 'driving' | 'walking' | 'transit';
export function directionsUrl(destination: GeoPoint, origin?: GeoPoint | null, mode: RouteMode = 'driving'): string {
  const params = new URLSearchParams({ api: '1', destination: `${destination.latitude},${destination.longitude}`, travelmode: mode, dir_action: 'navigate' });
  if (origin) params.set('origin', `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function yandexDirectionsUrl(destination: GeoPoint, origin?: GeoPoint | null, mode: RouteMode = 'driving'): string {
  const params = new URLSearchParams({ rtext: `${origin ? `${origin.latitude},${origin.longitude}` : ''}~${destination.latitude},${destination.longitude}`, rtt: mode === 'walking' ? 'pd' : mode === 'transit' ? 'mt' : 'auto' });
  return `https://yandex.com/maps/?${params.toString()}`;
}
