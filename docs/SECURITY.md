# Security & privacy controls

| Control | Where |
|---|---|
| Passwords hashed with scrypt (N=16384, per-user salt), timing-safe compare | `lib/core/security.ts` |
| Signed session tokens (HS256) bound to revocable server sessions | `lib/core/auth.ts` |
| httpOnly + Secure + SameSite=Lax cookies; tokens never reach JavaScript | `lib/server/http.ts`, partner/admin `lib/bff.ts` |
| CSRF: cookie writes must have a same-origin `Origin` header | `http.ts`, `bff.ts` |
| Rate limits: login (8 per identifier / 40 per IP per 15 min), sign-up, bookings | `rateLimit()` |
| Role-based access + admin permission matrix, checked on the server for every call | `permissions.ts`, `admin-guard.ts` |
| No public admin sign-up; first super admin only via one-time bootstrap; invites only | `admin.ts` |
| Admin MFA (TOTP), 8-hour admin sessions, force-logout | `security.ts`, `/admin/mfa`, `/admin/users/:id/sessions` |
| Partner/admin proxies allow-list API paths (tested) | `lib/allow.ts` |
| Server-side validation of every request body | `lib/core/validate.ts` |
| Booking/price/payment authority on the server; slot locks with a unique index | `bookings.ts` |
| Razorpay signature + webhook HMAC verification, event-id idempotency, amount match | `payments.ts` |
| Private verification documents (never public URLs), file-type sniffing, 4 MB limit, every view audit-logged | `files.ts`, `/admin/documents/:id` |
| No existence leaks (others' bookings return 404) | `getBooking()` |
| Category rules block misleading claims ("vet", "doctor", "physiotherapist", sexual terms for massage) | `findDisallowedClaims()` |
| Audit log of admin actions, logins, document views, exports | `audit_events` |
| CSP, HSTS, nosniff, frame-ancestors none, no-store on APIs | `next.config.mjs` |
| PWAs never cache API responses or customer data; offline never shows a booking as confirmed | `public/sw.js` |
| CSV exports neutralise spreadsheet formula injection | `toCsv()` |
| Consent records (terms, privacy, marketing per channel, partner agreement, service consent) with version and time | `users.consents`, `bookings.consentAt` |
| Account deletion request: immediate login stop, queued erasure | `/me/delete` |

**Before launch:** rotate all secrets, enable Atlas IP access list (Vercel egress or "allow from anywhere" with strong password), enable Atlas backups, turn on MFA for every admin, consider Vercel Deployment Protection / Trusted IPs for the admin domain, and get a penetration test.
