# Vizit mobile backend contract

The mobile client uses `https://api.vizit.am/api`. These additions belong in the Laravel API and must preserve the existing client and business authentication audiences.

## Authentication and password reset

Already consumed by mobile:

- `POST /client/auth/register`
- `POST /client/auth/login`
- `POST /client/auth/forgot-password`
- `POST /client/auth/reset-password`
- `GET /client/auth/me`
- `POST /client/auth/logout`

Password-reset email links intended for mobile should use:

`vizit://client/reset-password?token={urlEncodedToken}&email={urlEncodedEmail}`

The HTTPS website reset URL should remain available as a fallback.

## Device and push-token registration

### Register or refresh a device

`POST /mobile/devices`

Authentication: normal Bearer token for the active audience. The server derives `client` or `business` from the authenticated guard; the request cannot choose its own audience.

```json
{
  "expo_push_token": "ExponentPushToken[...]",
  "platform": "ios",
  "device_id": "optional-installation-id",
  "app_version": "1.0.0",
  "locale": "hy",
  "timezone": "Asia/Yerevan"
}
```

Response: `200` with the upserted device. Uniqueness must prevent one Expo token from being attached to two users/audiences. Re-login must safely reassign or rotate the token.

### Revoke a device

`DELETE /mobile/devices/current`

Payload: `{ "expo_push_token": "ExponentPushToken[...]" }`. Call on logout before deleting the local audience token. Invalid/expired Expo tokens must also be disabled when Expo receipts report `DeviceNotRegistered`.

### Notification payload

All push data must be non-sensitive. Never put OTP, guest manage token, access token, full phone, or email in the notification.

```json
{
  "type": "booking.created",
  "audience": "business",
  "booking_id": 123,
  "booking_code": "VZ-123"
}
```

Supported initial events:

| Audience | Events | Mobile destination |
| --- | --- | --- |
| Client | `booking.confirmed`, `booking.rescheduled`, `booking.cancelled`, `booking.reminder` | Bookings |
| Business | `booking.created`, `booking.rescheduled`, `booking.cancelled` | Today calendar |

The app fetches authoritative booking data after opening; notification text is never treated as booking state.

## IDBank booking deposit

The current business billing checkout is not a booking-deposit API. Mobile needs separate guest-booking endpoints.

### Create checkout session

`POST /public/bookings/{booking_code}/payments/idbank/session`

Header: `X-Guest-Token: {manage_token}`. The manage token is issued only after booking code + 4-digit OTP verification.

```json
{
  "return_url": "vizit://payment-return",
  "cancel_url": "vizit://payment-return?status=cancelled"
}
```

Response:

```json
{
  "checkout_url": "https://<approved-idbank-host>/...",
  "reference": "unique-server-reference",
  "invoice_id": "123",
  "amount": 5000,
  "currency": "AMD"
}
```

Requirements:

- calculate amount and currency only on the server;
- allow only the configured IDBank HTTPS checkout host;
- make session creation idempotent for a pending booking/invoice;
- never expose merchant credentials to mobile;
- use the IDBank server-to-server callback/webhook as authoritative payment confirmation;
- validate signature, amount, currency, reference and invoice before marking the deposit paid.

### Fetch authoritative payment state

`GET /public/bookings/{booking_code}/payments/{invoice_id}/status`

Header: `X-Guest-Token: {manage_token}`.

Response:

```json
{
  "status": "pending",
  "reference": "unique-server-reference",
  "invoice_id": "123",
  "paid_at": null
}
```

Allowed states: `pending`, `paid`, `failed`, `cancelled`, `expired`, `refunded`. A deep-link query such as `status=success` is display context only; mobile must query this endpoint before showing a confirmed payment.

## Security and delivery rules

- Rate-limit login, registration, password reset, OTP verify/resend and checkout creation.
- Keep client, business/employee and guest-manage tokens in separate guards/scopes.
- Guest booking mutation always requires both the prior booking-code + OTP verification and its issued manage token.
- Return Laravel validation errors as `422` and unauthenticated/expired token as `401`.
- Email and Telegram delivery must be queued; booking API responses should not wait for external providers.
