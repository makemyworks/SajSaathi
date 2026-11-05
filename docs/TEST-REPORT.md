> **Merged-release status (5 November 2026):** This file was carried forward from the source package's test report. Its Pass entries describe checks recorded for the separate upstream source projects on 31 October 2026; they are not a claim that the newly merged archive was re-run end-to-end. For this merge, see `MERGE-VERIFICATION.md`: static syntax, local-import, route-parity, manifest/icon, and ZIP checks passed. Dependency installation and a full Next.js build were not possible here because npm registry DNS/network access failed (`EAI_AGAIN`). Re-run `npm install`, `npm run check`, and the live integration/device tests after importing this archive into your environment.

# Test report — 31 October 2026

**Environment where this was built:** a sandbox with Node 22.23 and TypeScript 6.0, but **no access to the npm registry**. That means Next.js, React, MongoDB and Tailwind could not be installed here. Everything that could be checked without them was checked; everything else is marked **Not run** with the exact command to run on your machine or on Vercel. Nothing below is claimed beyond what was actually executed.

## Results

| # | Test | Result | Evidence | Known issue / required action |
|---|---|---|---|---|
| 1 | Core domain logic type-check (strict, `noUnusedLocals`) | **Pass** | `tsc` 0 errors on `lib/core` + tests | — |
| 2 | Customer app type-check against local type stubs for Next/React/MongoDB | **Pass (partial)** | 0 errors; stubs are looser than real types | Run `npm run typecheck` after `npm install` — the real types may surface a few errors the stubs could not |
| 3 | Partner app type-check (stubs) | **Pass (partial)** | 0 errors | same as above |
| 4 | Admin app type-check (stubs) | **Pass (partial)** | 0 errors | same as above |
| 5 | Unit: password hashing (scrypt) | **Pass** | `npm test` | — |
| 6 | Unit: signed tokens reject tampering / expiry / short secrets | **Pass** | `npm test` | — |
| 7 | Unit: TOTP against RFC 6238 vectors (59 s, 1111111109 s, 2000000000 s) | **Pass** | `npm test` | — |
| 8 | Unit: Razorpay payment & webhook signature verification | **Pass** | HMAC computed independently in test | — |
| 9 | Unit: MongoDB filter/update subset + atomic unique-index rollback | **Pass** | `npm test` | — |
| 10 | Unit: Indian phone/PIN formats, IST and DST time-zone conversion | **Pass** | `npm test` | — |
| 11 | Unit: booking state machine, coupons, cancellation fees, lock units, CSV injection, validation | **Pass** | `npm test` | — |
| 12 | Workflow: partner applies → checklist blocks submit → admin review → approved → public; suspension hides | **Pass** | test 13 | — |
| 13 | Workflow: customer slots (lead time, Sunday closed) → server price → **two customers race for the same slot: exactly one wins** → overlapping slot blocked | **Pass** | test 14 | — |
| 14 | Permissions: other customer and other partner get 404 on a booking; customer cannot confirm own booking | **Pass** | test 14 | — |
| 15 | Partner lifecycle: confirm → arrived → start → complete; review once only; rating; dashboard; commission statement; admin dashboard; CSV report | **Pass** | test 14 | — |
| 16 | Reschedule (pending stays pending, confirmed → rescheduled), cancellation frees slot, blocked time hides slots, walk-in | **Pass** | test 15 | — |
| 17 | Category rules: at-home PIN area, travel fee, massage consent required, disallowed claims (massage, pet), required booking fields, two staff → parallel bookings | **Pass** | test 16 | — |
| 18 | Admin creates a new vertical with custom fields; it appears publicly; duplicate slug rejected | **Pass** | test 17 | — |
| 19 | Auth: logout revokes session, customer can't use admin login, lockout after 8 attempts, duplicate account, role permissions, bootstrap only once | **Pass** | test 18 | MFA login path covered by TOTP unit test, not end-to-end |
| 20 | Payments: order (idempotent), forged signature rejected, checkout = authorized only, webhook captured, duplicate event ignored, tampered amount ignored, paid cancellation → refund → admin approve → refund webhook → refunded | **Pass** | test 19 with a Razorpay **test double** | Run against Razorpay **test mode** keys before launch (row 28) |
| 21 | Online payment refused when gateway not configured | **Pass** | test 20 | — |
| 22 | Notifications: unconfigured channel recorded as `skipped_not_configured`; Hindi template for Hindi users | **Pass** | test 21 | — |
| 23 | Partner proxy allow-list (no admin/payments/auth endpoints, no `..`) | **Pass** | partner `npm test` | — |
| 24 | Admin proxy allow-list | **Pass** | admin `npm test` | — |
| 25 | Logo renders legibly at 16/32/48 px; brand guide PDF renders (6 pages); templates render | **Pass** | rendered with rsvg-convert / headless Chrome and inspected | — |
| 26 | `npm install` / `next build` for all three projects | **Not run** | no registry access | Run `npm install && npm run build` in each project; fix anything reported (most likely minor type differences vs. real Next 15 types) |
| 27 | ESLint | **Not run** | — | `npm run lint` |
| 28 | MongoDB integration (real driver, indexes, `findOneAndUpdate`) | **Not run** | — | `npm run setup` against an Atlas test cluster, then the manual checklist below |
| 29 | Razorpay test-mode lifecycle | **Not run** | — | Use test keys + Razorpay test UPI/cards; confirm webhook reaches `/api/v1/webhooks/razorpay` |
| 30 | Email / SMS / WhatsApp / push delivery | **Not run** | no credentials | Configure each, send a test booking, check Admin → Notifications log |
| 31 | PWA install/update (Android Chrome, iPhone Safari) | **Not run** | needs deployed HTTPS site | Lighthouse PWA audit + install on a real phone |
| 32 | Responsive checks at 320/360/375/390/414/430 px, tablet, desktop | **Not run** (designed mobile-first; no rendered screenshots) | — | Chrome DevTools device toolbar on every page in the manual checklist |
| 33 | Accessibility audit | **Not run** | — | Lighthouse / axe on home, search, provider, booking, partner bookings |
| 34 | ZIP integrity | **Pass** | `unzip -t` on all three ZIPs (see packaging log) | — |

## Manual checklist after deploying (30–45 minutes)
1. Customer: sign up → search → provider → book (pay at venue) → see it in My bookings.
2. Partner: sign up on partner site → choose category → fill form → upload ID → add a service → accept agreement → submit.
3. Admin: log in → set up MFA → Applications → open document → approve. Check the provider now appears on the customer site.
4. Partner: accept the customer's booking → start → mark done. Customer: leave a review.
5. Two browsers: try to book the same time at the same moment — one must get "just booked by someone else".
6. With Razorpay test keys: pay online, see "Confirming…" then "Paid"; cancel from partner side; approve refund in admin; see "Refunded" after the webhook.
7. Install both PWAs on an Android phone; turn on airplane mode — the offline page appears and nothing shows as booked.

**This project is not bug-free and is not certified production-ready.** It is a complete, tested foundation that needs the build, integration and device checks above before real customers use it.
