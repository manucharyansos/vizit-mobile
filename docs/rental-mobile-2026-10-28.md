# Native space rentals

Rental profiles use a native date/duration → available interval → contact flow. Durations support minutes, hours and days, within the space's configured limits and step. One day is 24 elapsed hours. Availability supplies the complete interval and price; the app preserves the business-local wall times for creation and rescheduling. The Laravel write path remains authoritative for conflicts and money.

Rental reservations never send placeholder service, employee or room IDs. Public customers explicitly accept the current Terms and Privacy version and verify with four digits. Internal booking references and management tokens remain in SecureStore and internal state, outside visible receipt models. Client history shows both arrival and departure, keeping an ongoing multi-day stay in upcoming bookings until its end.

Owner/manager screens provide a rental calendar, manual reservations, permitted status transitions, rental reports, rates/duration/buffer/overnight settings, working hours, public visibility and gallery upload/removal. Staff-based modules remain available for service businesses. Rental reports describe recorded receipts and unpaid balances; they are separate from the platform subscription and do not charge cards.

Registration supports the rental category and plan, requires an actual selected map point, and explicitly records legal acceptance. A coordinate/GPS fallback works when the optional MapKit module is unavailable. Client registration and regular service booking now also send the API's required consent/version fields.

## Paired API deployment

Deploy the paired `-smartbook-api` change before publishing the mobile update. It adds authenticated `GET /api/rental/availability?date=YYYY-MM-DD&duration_minutes=120` for manual reservations, including spaces whose public profile is hidden. It uses the existing owner/manager, tenant, onboarding and subscription guards. Caller-supplied business IDs cannot select a different tenant.

This mobile integration adds no migration, dependency or native configuration change. On an existing rental-capable API installation, pull `master` and clear Laravel's optimized caches. Earlier rental schema migrations must already be installed.

After merging `main`, the existing **Publish Preview OTA** workflow publishes JavaScript/UI changes to the `preview` channel. A Git push alone does not update an installed app. Keep the workflow's dependency check enabled. The installed app must have a compatible app-version runtime. Native SDK, MapKit and permission changes require a new build as documented in the existing update notes.

## Validation and limits

- Regression tests cover rental duration parsing, timezones/DST, server interval selection, midnight breaks, profile normalization, public/private API separation, legal acceptance and private-reference handling.
- TypeScript, ESLint and Android/iOS Hermes exports validate the native source.
- Isolated React Native Web component checks use the real Laravel API and a disposable database for 2-hour, 5-hour and 3-day reservations, four-digit verification, a date change, cancellation, hidden-profile manual booking, registration and localized light/dark screens. Native SDK boundaries use local adapters.
- Physical-device MapKit, gallery-picker/video playback, keyboard/safe-area behavior, real email/Telegram delivery and EAS OTA receipt still require device verification. No live payment, production reservation or message is sent by local checks.
