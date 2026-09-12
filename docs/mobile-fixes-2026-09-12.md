# Mobile reliability and visual refinement

## What changed

- Authentication resets only the root navigation history at successful sign-in/registration. Launch restores the last authenticated workspace. No global redirect guard was added.
- Client and business sessions invalidate only their own caches. Token writes are serialized; a late 401 cannot erase a newer login. Network errors offer retry, and failed deletion requests keep the session.
- Guest bookings now have a paged SecureStore index, separate from account references. Upcoming/history lists refresh on focus, and a grouped booking shows every appointment. The app migrates the old last saved guest booking. Earlier unindexed references cannot be enumerated from SecureStore; older visits can still be linked through a verified client account.
- Customers continue to see only a four-digit OTP. Internal references stay in SecureStore/service calls, never in labels or input fields. Debug logs no longer dump payloads.
- Rescheduling respects API cancellation/rescheduling flags and shows all available slots. The public form allows dates beyond the original ten-day strip and prevents another submission after success.
- Payment sessions are associated with their exact booking. Only server payment status confirms success; errors, expiry, missing access and delayed confirmation have usable states. iOS browser returns explicitly open the payment result screen.
- Map results use the public map endpoint, including every returned branch (server currently caps businesses at 500). Nearby filtering uses straight-line distance, with 1/5/10/25 km radii, foreground location on request, or a manually chosen starting point. Directions open Yandex/Google Maps externally. The in-app map remains native Yandex MapKit.
- Client lists load all API pages. Client selection and waitlist slots no longer cut off at 30. Owner/manager/staff menus match API roles; task updates use the correct route for each role. Billing availability respects `live_ready`.
- Calendar supports date selection and refresh; dashboard counts come from the server and show upcoming visits. Armenia wall-clock times are stable across device time zones.
- Shared typography is quieter, borders and elevation are more restrained, dark secondary text contrast is stronger, and booking/map cards have a clearer hierarchy. Buttons expose loading/disabled accessibility state and input labels are announced.

## Viewing updates on a phone

The existing **Publish Preview OTA** workflow still publishes the UI and functional fixes to the `preview` channel. It does not replace the installed native binary.

Automatic foreground GPS requires the new `expo-location` native module and permissions. Run **Build Preview APK** from GitHub Actions on `main`, open the EAS build link in its output, and install the completed APK over the existing preview. This uses the existing Expo project, preview environment and signing credentials. No computer is needed.

The optional module is checked before dynamic import, so existing 1.0.0 preview binaries can receive this OTA without crashing. On those binaries, choosing the starting point manually and external directions remain available. Runtime 1.0.0 is intentionally retained for this explicitly guarded compatibility path. Future mandatory native dependencies must use a new runtime/version.

## Validation scope

`npm test` runs the actual service implementations with an in-memory keychain: multi-booking persistence/migration, group display models, session isolation, late-401 race, auth navigation state, payment-to-booking association, pagination, role permissions, timezone conversions, distance/direction URLs, and semantic text contrast. CI and the preview workflows run these tests in addition to TypeScript and ESLint.

Android/iOS Expo exports verify bundling, not installation on a physical device. Native GPS permission dialogs, MapKit rendering, real login credentials, OTP delivery and payment-provider callbacks still require device/backend acceptance testing.

## Follow-up from the device recordings

The recordings exposed truncated time ranges, Armenian titles squeezed between header buttons, a blank cover area, clipped Telegram status text, and an overly sparse dashboard. The business recording also shows the sign-out confirmation followed by a blank screen.

- Explicit sign-out now resets directly to the root login screen. The legacy business login renders the unified form when signed out, instead of redirecting to an ambiguous `/login` path that also matches itself. No global navigation guard was introduced.
- All three logout entry points use the same mutation with `networkMode: always`, so offline mode cannot pause local sign-out indefinitely. Push revocation and server logout each have a two-second request timeout; failed remote revocation still clears the local audience. Buttons indicate progress and prevent repeated submissions.
- A shared time-slot component shows complete start and end times on separate lines, staff details and meaningful selected/busy/recommended states. It is used for customer booking, business booking and rescheduling, with larger cells when system text size increases.
- Shared page headers give titles the full available width. Status labels can wrap. Business rows give names and addresses more room, and a shared avatar falls back to an initial when an image fails.
- A business without a working cover image gets a compact header. Dashboard metrics form a compact divided panel; upcoming visits have an actionable empty state. The Telegram card no longer repeats its title or puts a long connect label beside it.
- Client CRM summaries and note timestamps are normalized as UTC at the API boundary. `ClientController` returns raw database times without a zone, while booking resources already include a zone. This fixes the four-hour discrepancy visible between the client summary and calendar, without changing backend code or wall-clock availability inputs.

The regression suite now has 19 tests, including offline sign-out through the real mutation engine, the legacy login route, root navigation reset, session isolation and matching CRM/calendar times. TypeScript, lint and Android/iOS exports pass. A post-update check on the same phone remains necessary to verify native rendering and the reported logout interaction. These follow-up changes need only a preview OTA; they add no native dependencies.
