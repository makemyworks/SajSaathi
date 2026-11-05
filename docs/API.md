# Saj Saathi — Central API (v1)

Base URL: `https://api.sajsaathi.in/api/v1` (the customer project; `api.` is a second domain on the same Vercel project).
Every response is JSON. Errors always look like:

```json
{ "error": { "code": "slot_taken", "message": "Sorry, this time was just booked by someone else…", "details": null } }
```

| HTTP | Meaning |
|---|---|
| 400 `bad_request` | Validation failed (message says which field) |
| 401 `unauthenticated` / `invalid_credentials` / `invalid_mfa` | Not logged in / wrong details |
| 403 `forbidden` / `bad_origin` | Logged in but not allowed / cross-site request blocked |
| 404 `not_found` | Missing — also returned for records you are not allowed to see (no existence leaks) |
| 409 `slot_taken`, `slot_unavailable`, `bad_transition`, `stale`, `payments_inactive`, … | Business rule conflict |
| 413 / 415 | Upload too large / wrong file type |
| 429 `rate_limited` | Too many attempts |
| 503 `maintenance` | Bookings paused by the founder |

## Authentication
* **Customer website** — `POST /auth/login` sets an httpOnly, `SameSite=Lax`, `Secure` cookie `ss_session`. Cookie-authenticated writes must carry an `Origin` header matching the host (CSRF protection).
* **Partner and admin apps** — their own servers call the API with `x-ss-internal-key: <INTERNAL_API_KEY>` and receive the token in the body, then keep it in *their* httpOnly cookie and send `Authorization: Bearer <token>` on every call. Browsers never see tokens.
* Tokens are HS256-signed (AUTH_SECRET) and tied to a `sessions` row, so logout, password change, account disable and "log out everywhere" take effect immediately. Sessions: customers/partners 30 days, admins 8 hours.
* Admin MFA: TOTP (RFC 6238). When enabled, login returns `{ "mfaRequired": true }` until the 6-digit `totp` is supplied.
* Every admin endpoint re-checks the permission on the server (`lib/server/admin-guard.ts`), using role overrides saved on the Role Permissions page.

## Endpoints
`[C]` customer · `[P]` partner owner (staff where noted) · `[A]` admin with the named permission · `[–]` public

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/admin/admins` | [A] || Invite an admin (temp password shown once) |
| POST | `/admin/applications/[id]/decision` | [A] || Approve / reject / ask for documents / suspend |
| GET | `/admin/applications/[id]` | [A] || Full application incl. private document list |
| GET | `/admin/applications` | [A] || Applications waiting for review |
| GET PUT | `/admin/categories/[id]` | [A] || Read / save a category |
| GET POST | `/admin/categories` | [A] || List / create categories |
| GET | `/admin/dashboard` | [A] || Live counts and money for N days |
| GET | `/admin/documents/[id]` | [A] || Stream a private document (audit-logged) |
| GET | `/admin/integrations` | [A] || Which integrations have credentials |
| GET | `/admin/meta` | [A] || Sections & permissions for this admin |
| POST | `/admin/mfa` | [A] || Start / enable / disable TOTP |
| POST | `/admin/refunds/[id]` | [A] || Approve (sends to Razorpay) or reject |
| GET | `/admin/refunds` | [A] || Refund requests |
| GET | `/admin/reports` | [A] || CSV export (bookings, payments, commissions, partners) |
| GET PATCH DELETE | `/admin/resources/[key]/[id]` | [A] || Registry record read / edit / delete |
| GET POST | `/admin/resources/[key]` | [A] || Registry list (search, filters, pages) / create |
| GET PUT | `/admin/roles` | [A] || Role → permission matrix |
| GET PATCH | `/admin/settings` | [A] || Platform pricing, support contacts, maintenance text |
| GET POST | `/admin/tickets/[id]` | [A] || Read / reply to a ticket |
| DELETE | `/admin/users/[id]/sessions` | [A] || Force logout everywhere |
| POST | `/auth/login` | [–] || Log in |
| POST | `/auth/logout` | [any] || Log out (revokes session) |
| GET | `/auth/me` | [any] || Current user |
| POST | `/auth/password` | [any] || Change password (logs out other devices) |
| POST | `/auth/register` | [–] || Create account |
| POST | `/bookings/[id]/action` | [C/P/A] || Confirm, reject, cancel, arrived, start, complete, no-show |
| POST | `/bookings/[id]/reschedule` | [C/P/A] || Move to a new free time |
| GET | `/bookings/[id]` | [C/P/A] || Booking detail (only owner, its provider, admins) |
| POST GET | `/bookings` | [C/P/A] || Create booking or walk-in / list my bookings |
| GET | `/categories/[slug]` | [–] || Public category |
| GET | `/categories` | [–] || Active categories |
| GET | `/cities` | [–] || Cities that have approved providers |
| GET | `/content/[slug]` | [–] || Published content page |
| GET | `/faqs` | [–] || FAQs |
| GET | `/files/[id]` | [–] || Public gallery file |
| GET | `/health` | [–] || Health check + integration on/off |
| DELETE PATCH | `/me/addresses/[id]` | [C] || Delete / make default |
| GET POST | `/me/addresses` | [C] || Saved addresses |
| POST | `/me/delete` | [C] || Request account deletion |
| GET POST | `/me/favourites` | [C] || Favourite providers |
| GET PATCH | `/me/notifications` | [C] || In-app notifications / mark read |
| GET | `/me/payments` | [C] || Payment history |
| POST | `/me/push` | [C] || Save browser push subscription |
| GET | `/me/reviews` | [C] || My reviews |
| PATCH | `/me` | [C] || Update profile, language, marketing consent |
| POST | `/me/tickets/[id]` | [C] || Reply to my ticket |
| GET POST | `/me/tickets` | [C] || My tickets / open ticket |
| POST | `/partner/agreement` | [P] || Accept partner agreement |
| GET POST PATCH | `/partner/application` | [P] || Read / start / update application & profile |
| POST | `/partner/application/submit` | [P] || Submit for review |
| DELETE | `/partner/blocks/[id]` | [P] || Remove a blocked time |
| GET POST | `/partner/blocks` | [P] || Blocked times |
| GET | `/partner/bookings` | [P] || Partner's bookings by tab / date range |
| GET | `/partner/categories` | [P] || Category forms for onboarding |
| GET | `/partner/dashboard` | [P] || Today, counts, earnings |
| POST | `/partner/documents` | [P] || Upload private verification document |
| POST DELETE | `/partner/gallery` | [P] || Add / remove public photos |
| PUT | `/partner/holidays` | [P] || Set holidays |
| PUT | `/partner/hours` | [P] || Set weekly hours |
| GET | `/partner/profile` | [P] || Plan, payouts, online payments |
| POST | `/partner/reviews/[id]` | [P] || Reply to a review |
| GET | `/partner/reviews` | [P] || Reviews |
| PATCH DELETE | `/partner/services/[id]` | [P] || Edit / remove (deactivates if used) |
| GET POST | `/partner/services` | [P] || Services & prices |
| PATCH | `/partner/staff/[id]` | [P] || Edit staff |
| GET POST | `/partner/staff` | [P] || Staff |
| GET | `/partner/statements` | [P] || Monthly commission statement |
| POST | `/payments/order` | [C] || Create Razorpay order |
| POST | `/payments/verify` | [C] || Verify checkout signature |
| GET | `/providers/[slug]` | [–] || Public provider profile |
| GET | `/providers/[slug]/slots` | [–] || Free times |
| GET | `/providers` | [–] || Search providers |
| GET | `/public-config` | [–] || Flags, payment key id (never secrets) |
| POST | `/quote` | [–] || Server-side price quote |
| POST | `/reviews` | [C] || Review a completed booking |
| POST | `/webhooks/razorpay` | [–] || Razorpay webhook |

### Key request bodies
* `POST /auth/register` `{ name, phone?, email?, password, acceptTerms: true, marketingConsent?, locale? }` — role is always `customer` unless called by the partner server.
* `POST /auth/login` `{ identifier (mobile or email), password, app?: "customer"|"partner"|"admin", totp? }`
* `POST /quote` `{ providerId, serviceId, addOnIds[], mode: "in_store"|"at_home", couponCode? }` → full price breakdown in paise.
* `GET /providers/:slug/slots?serviceId&date=YYYY-MM-DD&mode&addOns=a,b&staffId` → `{ slots: [{ time, start, end, staffIds }] }` (advisory).
* `POST /bookings` `{ providerId, serviceId, staffId?, start (ISO from slots), addOnIds[], mode, address?, fields?, notes?, couponCode?, paymentMethod: "pay_at_venue"|"online", consent? }` — the server re-checks the slot, recomputes the price and **locks the time with unique 5-minute lock rows**, so two simultaneous requests cannot both succeed. Partners call the same endpoint for walk-ins (`customerName`, `customerPhone`).
* `POST /bookings/:id/action` `{ action: confirm|reject|cancel|arrived|start|complete|no_show, note? }`
* `POST /bookings/:id/reschedule` `{ start, staffId? }`
* `POST /payments/order` `{ bookingId }` → `{ orderId, amountPaise, currency, keyId }` (Razorpay Orders API; idempotent per booking).
* `POST /payments/verify` `{ orderId, paymentId, signature }` → marks **authorized** only.
* `POST /webhooks/razorpay` — raw body, `X-Razorpay-Signature`, `X-Razorpay-Event-Id` (deduplicated). Events: `payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`.
* `POST /partner/documents` multipart: `file`, `kind` (id_proof|address_proof|certificate|registration|other), `credentialKey?` — stored privately; only admins with `documents.view` can open via `GET /admin/documents/:id` (audit-logged).
* `GET|POST /admin/resources/:key`, `GET|PATCH|DELETE /admin/resources/:key/:id` — registry-driven sections (see `lib/core/admin-resources.ts`). Only allow-listed collections and fields are reachable; secrets (`passwordHash`, `mfa`, `storageKey`) are never returned.

Versioning: all routes live under `/api/v1`; responses carry `x-api-version: v1`. Breaking changes go to `/api/v2` while v1 keeps working.
