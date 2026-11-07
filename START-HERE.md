# START HERE — Saj Saathi Partner Owner PWA

This is the separate installable app for approved salon, parlour, barber, stylist, makeup, mehndi and other partner professionals. It has its own mobile-first dashboard, manifest, icons and service worker. It never connects directly to MongoDB; all reads and writes go through the central API hosted by the combined Customer + Admin project.

## Deploy to a new GitHub repository
1. Extract `Saj_Saathi_Partner_PWA.zip`.
2. Create a new private repository, for example `saj-saathi-partner`.
3. Upload the extracted folder contents to the repository root (not the ZIP itself).
4. Import the repository into Vercel.

Vercel settings:
| Setting | Value |
|---|---|
| Project name | `saj-saathi-partner` |
| Framework | Next.js |
| Root directory | `./` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | Default / empty |
| Node.js | 22.x |

## Partner Vercel Environment Variables
Add these in **SajSaathiPartner → Settings → Environment Variables** for Production and Preview:

| Variable | Value | Required |
|---|---|---|
| `API_URL` | `https://sajsaathi.vercel.app/api/v1` | Yes |
| `INTERNAL_API_KEY` | Exactly the same secret as `SajSaathi` Customer + Admin | Yes |
| `NEXT_PUBLIC_CUSTOMER_URL` | `https://sajsaathi.vercel.app` | Recommended |
| `NEXT_PUBLIC_PARTNER_URL` | `https://sajsaathipartner.vercel.app` | Recommended |
| `NEXT_PUBLIC_ADMIN_URL` | `https://sajsaathi.vercel.app/admin` | Recommended |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | A real monitored support address | Optional |

The Partner project does **not** need `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, or `RAZORPAY_*`. The Customer + Admin project owns the database and payment credentials. Do not put `INTERNAL_API_KEY` in a `NEXT_PUBLIC_` variable. If you change the internal key, update it in both Vercel projects and redeploy both.

## Vercel-managed Partner owner login (no CMD required)

For one simple Founder-managed Partner owner login, set these **server-only variables on the main `sajsaathi` Customer + Admin Vercel project** (not on this Partner project):

- `PARTNER_OWNER_NAME` — optional display name.
- `PARTNER_OWNER_EMAIL` — the email to enter on the Partner login page.
- `PARTNER_OWNER_PASSWORD` — the password to enter on the Partner login page.
- `PARTNER_OWNER_PHONE` — optional; use the existing Partner account's registered mobile number when linking an application while changing its email.

Select Production, save, then redeploy the main `sajsaathi` project. On the next Partner login, the central API creates or updates this designated Partner owner in MongoDB automatically. No CMD, local setup, or manual database edit is required. Change the email/password later by changing these Main-project variables and redeploying Main again.

**Existing application:** to keep the same application, the first time you enable this, set `PARTNER_OWNER_EMAIL` to the existing Partner owner's email. If changing the email at the same time, also set `PARTNER_OWNER_PHONE` to the mobile number already linked to that Partner account. The central API keeps the same account ID and provider/application link. Do not use a phone or email belonging to a different account.

The `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` variables are for Founder Admin, not Partner login. Do not put Partner owner passwords in this Partner Vercel project or in any `NEXT_PUBLIC_` variable.

## Login and sign-up troubleshooting
1. Open `https://sajsaathipartner.vercel.app/api/health`. Confirm `ok: true`, `apiUrlValid: true`, `internalApiKeyConfigured: true` and `upstream.status: 200`.
2. If health is not OK, confirm `API_URL` is exactly `https://sajsaathi.vercel.app/api/v1` and the Partner `INTERNAL_API_KEY` exactly matches the Customer + Admin project. Save the variables and redeploy.
3. Confirm the Customer + Admin health page `https://sajsaathi.vercel.app/api/v1/health` reports `ok: true`, `database: connected` and `setup: complete`.
4. Partner sign-up requires a valid Indian mobile number, a password of at least 8 characters containing a letter and a number, and acceptance of the Terms and Privacy Policy. Email is optional.
5. If the mobile/email already exists, use Partner login rather than creating another account. Partner login accepts the account's mobile number or email.
6. Login and sign-up create a Partner session through the central API. If a request reports that the account/session was not returned, check both Vercel projects' runtime logs before submitting again; do not repeatedly retry a possibly completed sign-up.

The auth form now reports validation, duplicate-account, wrong-password, rate-limit and API-connection errors separately. A UI patch cannot correct missing or mismatched production secrets or a database that has not been initialised.

## Install on a phone
- **Android / Chrome:** visit the HTTPS Partner Vercel URL. Tap **Install partner app** when Chrome exposes its install prompt, or Chrome menu → **Install app** / **Add to Home screen**.
- **iPhone / Safari:** visit the HTTPS URL → Share → **Add to Home Screen**. iOS does not show the Android install prompt; the install button explains this route.
- The app uses its own manifest and icons. After installation it opens in standalone mode like an app.

This package is a PWA, not an APK or Play Store listing. Service-worker caching is limited to static shell resources; API responses and personal/booking data are network-only. Offline mode never marks a booking as confirmed.

## First use
1. Open `https://YOUR-PARTNER-PROJECT.vercel.app/api/health`. Confirm `ok: true`, `apiUrlValid: true` and `internalApiKeyConfigured: true`. If not, correct the Partner environment variables and redeploy.
2. Partner owner registers or signs in.
3. Complete the partner application, business/contact/address, service category, services, hours, documents, gallery and agreement.
4. Submit for Admin review.
5. Wait for approval before taking platform bookings.
6. After approval, use bookings, calendar, staff, services, schedule, reviews, money/statements, notifications and support.

## Local development
```bash
npm install
cp .env.example .env.local
# Set API_URL=http://localhost:3000/api/v1 and the same INTERNAL_API_KEY used by the local combined project.
npm test
npm run dev
```

## Troubleshooting
| Issue | Check |
|---|---|
| Login says not authorised / internal key invalid | `INTERNAL_API_KEY` must exactly match the combined project. |
| API returns not found | `API_URL` must end with `/api/v1` and point to the deployed combined project. |
| Portal stays on loading / profile cannot load | Open `/api/health`; check `API_URL` and that `INTERNAL_API_KEY` exactly matches the Customer project. |
| Install button not visible | Use HTTPS, a supported browser and the browser's install menu; on iPhone use Safari Share → Add to Home Screen. |
| Offline banner appears | Network is required for all live records; no personal data is stored as an offline booking state. |
