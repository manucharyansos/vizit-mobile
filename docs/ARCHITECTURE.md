# Vizit Mobile architecture

Native Expo SDK 57 / React Native 0.86 app with Expo Router. The app does not embed Vizit in a WebView.

## Boundaries

- `src/app/(customer)`: discovery, public booking, verified booking cabinet.
- `src/app/(business)`: authenticated business/employee calendar and operations.
- `src/services/api`: Laravel API clients and DTO normalization.
- Client and business bearer tokens have distinct SecureStore keys and Axios clients.
- Guest management exchanges `booking_code + 4-digit OTP` for a guest token. Protected calls use `X-Guest-Token`.
- Public links use `https://vizit.am`; calls use `https://api.vizit.am/api`.

## Yandex MapKit

MapKit requires an Expo development build and config plugin/prebuild. Expo Go is not a valid map test target. A native `BusinessMap` adapter isolates the SDK so another provider cannot be introduced accidentally. The local config plugin initializes the iOS SDK and `react-native-yamap` initializes Android/iOS from the JS adapter. No alternative map provider is approved.

The deployed website currently loads Yandex Maps JavaScript API v3. Its public key is configured locally as a candidate, but Yandex requires the **MapKit Mobile SDK** interface to be enabled for native apps. A successful website map does not prove that the same key is authorized for MapKit. Final validation therefore requires enabling MapKit Mobile SDK for the key in Yandex Developer Dashboard and running a development build on a real device.

## Push notifications

`expo-notifications` is configured to request device permission, create the Android `bookings` channel, and obtain an Expo push token in a development/production build. The token is intentionally not sent to a guessed route. Laravel needs a documented audience-aware device endpoint for client vs business/employee tokens before registration is activated.

## Confirmed deployed API surface

- public categories/businesses/map and business details
- services, staff, availability, single/multi-service booking and waitlist
- booking OTP verification, resend, guest-token read/cancel/reschedule/Telegram link
- business auth/me, calendar, bookings, clients, services and staff
- client auth/me and cabinet
- billing checkout session and invoice payment status

Client registration/login/password-reset payloads have been confirmed and are implemented. Push-token registration and production IDBank booking-deposit endpoints still require Laravel implementation; see `MOBILE_BACKEND_CONTRACT.md`.
