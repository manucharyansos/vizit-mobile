# Vizit Mobile

Native appointment-booking application for iOS and Android, built with React Native, Expo SDK 57, TypeScript, and Expo Router. It is not a WebView wrapper.

## Product scope

- Customer discovery, Yandex MapKit, business profiles, availability, booking, 4-digit verification, client cabinet, Telegram connection, and payment-return flow.
- Business and employee authentication, today calendar, bookings, clients, services, staff schedules, tasks, locations, analytics, growth, loyalty, gift cards, billing, Telegram, and business profile media.
- Armenian, Russian, and English localization.
- Light and dark Vizit navy/blue themes.
- Separate `client` and `business` bearer-token audiences stored with Expo SecureStore.

The application calls `https://api.vizit.am/api`. Public links open on `https://vizit.am`.

## Requirements

- Node.js 22.13 or newer
- npm
- Android Studio and an Android SDK for local Android builds
- macOS with Xcode for local iOS builds

## Run the project

```bash
npm install
cp .env.example .env.local
npx expo start -c
```

Set the MapKit Mobile SDK key in `.env.local`:

```dotenv
EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY=your_mobile_mapkit_key
```

Expo Go can be used to inspect screens that only rely on Expo Go modules. Yandex MapKit and Android remote push notifications require a development build.

## Development build

Android:

```bash
npx expo prebuild --clean
npx expo run:android
```

iOS (macOS only):

```bash
npx expo prebuild --clean
npx expo run:ios
```

The Yandex key must have **MapKit Mobile SDK** enabled in Yandex Developer Dashboard. A website JavaScript Maps key alone is not enough.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run doctor
```

## Important security boundaries

- Never commit `.env.local`, signing keys, service-account files, or store credentials.
- Customer and business tokens use separate SecureStore keys and Axios clients.
- The customer enters only a 4-digit verification code. The app keeps Laravel's internal booking reference in SecureStore and uses the issued guest manage token for protected mutations.
- IDBank merchant secrets and authoritative payment confirmation belong only in Laravel.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/INTEGRATION_STATUS.md](docs/INTEGRATION_STATUS.md), and [docs/MOBILE_BACKEND_CONTRACT.md](docs/MOBILE_BACKEND_CONTRACT.md).
