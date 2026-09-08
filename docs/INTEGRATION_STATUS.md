# Mobile ↔ Laravel integration status

Status reflects the deployed API observed while building the mobile client. The mobile repository does not contain or modify the Laravel source.

| Flow | Laravel API | Mobile status | Backend update needed |
| --- | --- | --- | --- |
| Public business discovery | `/v1/public/businesses`, fallback `/public/businesses` | Connected | No |
| Business details | `/v1/public/businesses/{slug}` | Connected | No |
| Services and staff | `/public/businesses/{slug}/services`, `/staff` | Connected | No |
| Availability | `/public/businesses/{slug}/availability` | Connected | No |
| Create booking | `/public/businesses/{slug}/bookings` | Connected | No |
| Guest booking access | code + 4-digit OTP → manage token | Connected | No |
| Cancel/reschedule | guest-token protected endpoints | Connected | No |
| Telegram connection | `/public/bookings/{code}/telegram-link` | Connected | No |
| Client register/login/profile | `/client/auth/*` | Connected | No |
| Client cabinet | `/client/cabinet/bookings` | Connected | No |
| Business login/profile | `/auth/login`, `/auth/me` | Connected | No |
| Business calendar/status | `/calendar`, booking status actions | Connected | No |
| Business clients/services | `/clients`, `/services` | Connected | No |
| Push token registration | `POST /mobile/devices`, `DELETE /mobile/devices/current` | Connected; activates after EAS project id is configured | No |
| Booking deposit checkout | Proposed guest IDBank session/status endpoints | Mobile return flow ready | **Yes** |
| Authoritative payment confirmation | IDBank webhook + status query | UI ready, no endpoint | **Yes** |

## Backend modification state

No Laravel files, database migrations, routes, controllers, jobs or deployment have been changed from the `vizit-mobile` repository. Backend work begins only after the Laravel repository is available in the workspace or connected through its Git remote.

Required backend additions are specified in `MOBILE_BACKEND_CONTRACT.md`:

1. audience-aware device registration/revocation;
2. queued push delivery and Expo receipt cleanup;
3. guest-manage-token protected IDBank booking-deposit session;
4. verified IDBank webhook and authoritative payment-status endpoint.
