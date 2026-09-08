# Mobile ↔ Laravel integration status

This status reflects the current `vizit-mobile/main`, Laravel `-smartbook-api/master`, and web `smartbook-we/master` integration audited for the native mobile release.

| Flow | Laravel API | Mobile status | Remaining external requirement |
| --- | --- | --- | --- |
| Public discovery/search | `/v1/public/businesses`, fallback `/public/businesses` | Connected | None |
| Public Yandex map/business profile | public business/location endpoints | Native, connected | `EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY` in development/production build environment |
| Services/staff by branch | `/public/businesses/{slug}/services`, `/staff` | Connected, location-aware | None |
| Availability | `/public/businesses/{slug}/availability` | Connected | None |
| Weekly business/staff schedules | `/schedule`, staff schedule endpoints | Connected; Laravel availability and booking writes enforce structured schedules and breaks | None |
| Blocked calendar time | `/calendar/blocks` | Native create/list/delete | Feature entitlement must include `blocks` |
| Create booking | `/public/businesses/{slug}/bookings` | Connected, location-aware | None |
| Guest booking access | internal reference in SecureStore + customer-entered 4-digit OTP → manage token | Connected | None |
| 4-digit OTP contract | public/v1 booking verify routes | Mobile input and backend middleware enforce exactly four digits | None |
| Cancel/reschedule | guest-token protected endpoints | Connected | None |
| Client cabinet | `/client/cabinet/bookings` | Connected; internal references are moved to SecureStore before query/UI cache | Verified client email for historical linking |
| Client booking management | cabinet reference → existing guest recovery/token flow | Connected; booking cards open secure management without showing the reference | None |
| Telegram connection | booking and business Telegram endpoints | Connected | Production bot/webhook configuration |
| Business onboarding | onboarding status/services + `/schedule` + completion | Connected; supports services → schedule → settings/completion | None |
| Business services/staff/locations | protected CRUD endpoints | Connected, multi-location aware | None |
| Business growth tools | waitlist + marketing campaign endpoints | Native waitlist offers, campaigns, send/cancel/edit and delivery history | Feature entitlement where applicable |
| Push token registration | `POST /mobile/devices`, `DELETE /mobile/devices/current` | Connected for client/business audiences | EAS project ID and APNs/FCM push credentials; development/production build required |
| Booking deposit checkout | guest IDBank capabilities/session/status endpoints | Connected | Live IDBank merchant contract mapping/credentials are still intentionally disabled by Laravel until official production values are configured |
| Account deletion | `POST /mobile/account-deletion-request` | Connected | Store-console privacy disclosures must match policy |

## Release gates

Automated mobile CI runs `npm ci`, high/critical dependency audit, TypeScript, ESLint, Android Expo export, iOS Expo export, and publishes a source ZIP artifact. Laravel CI covers the API test suite including onboarding schedule recovery, structured schedule enforcement, and the four-digit OTP contract.

The following cannot be completed from GitHub CI alone and must be done with the release accounts/devices:

1. Configure the Yandex MapKit Mobile SDK key for EAS production builds.
2. Ensure the EAS project is linked and APNs/FCM credentials are configured for push delivery.
3. Perform a physical-device development/production smoke test for Yandex MapKit, push notifications, keyboard/safe-area behavior, and deep links.
4. Configure official live IDBank merchant values before enabling real deposit checkout.
5. Complete App Store Connect / Google Play listing, privacy/data-safety forms, screenshots, age rating, and reviewer credentials where required.
