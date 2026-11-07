# START HERE — Saj Saathi Platform (Customer + Admin)

This single Vercel project serves:
- Public customer website: `/`
- Customer installable PWA: same origin, customer manifest/service worker
- Central API for all apps: `/api/v1/*`
- Private founder/admin console: `/admin` (login: `/admin/login`)

The separate Partner Owner PWA is deployed from the second ZIP and talks to this project's API. There is only one MongoDB database and this combined project is the only project that stores the database credentials.

## 1. Create MongoDB Atlas
1. Create a MongoDB Atlas project and cluster in Mumbai (`ap-south-1`) if available.
2. Create a database user with a strong password and read/write permissions for the database.
3. Configure Atlas Network Access for your Vercel deployment. `0.0.0.0/0` is convenient for a first test but broad; use strong credentials and tighten access with a supported static egress/private networking option before production.
4. Copy the Atlas connection string. URL-encode special characters in the password.

## 2. Generate secrets
Run the following twice in Windows CMD / PowerShell with Node.js installed:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
- First result → `AUTH_SECRET` (combined project only).
- Second result → `INTERNAL_API_KEY` (same value in this project and Partner project).
Never paste either into GitHub or a `NEXT_PUBLIC_*` variable.

## 3. Push this repository to GitHub
1. Extract `Saj_Saathi_Customer_Admin_Merged.zip`.
2. Create a new **private** GitHub repository, for example `saj-saathi-platform`.
3. Upload the contents of the extracted project folder to the repository root. Do not upload the ZIP itself or put all files inside an extra nested folder.
4. Confirm `package.json`, `app/`, `components/`, `lib/`, `public/` and `START-HERE.md` are at the repository root.

## 4. Create the combined Vercel project
Import the GitHub repository into Vercel with:
| Setting | Value |
|---|---|
| Project name | `saj-saathi-platform` |
| Framework | Next.js |
| Root directory | `./` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | Default / empty |
| Node.js | 22.x |

Use the Vercel `.vercel.app` domain first. A custom domain is not required for the first test.

## 5. Add Environment Variables in Vercel
Add for Production and Preview:

**Required:**
- `MONGODB_URI` — actual Atlas URI.
- `MONGODB_DB` — `saj_saathi`.
- `AUTH_SECRET` — first generated secret (48 random bytes output).
- `INTERNAL_API_KEY` — second generated secret.
- `NEXT_PUBLIC_CUSTOMER_URL` — `https://YOUR-PROJECT.vercel.app`.
- `NEXT_PUBLIC_ADMIN_URL` — `https://YOUR-PROJECT.vercel.app/admin`.
- `NEXT_PUBLIC_API_URL` — `https://YOUR-PROJECT.vercel.app/api/v1`.
- `NEXT_PUBLIC_PARTNER_URL` — partner `.vercel.app` URL after the partner project exists; until then you may leave it empty.

`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_NAME` are only read by the trusted setup script, not by public website requests. They are not required as runtime Vercel variables. If you keep them in Vercel so you can pull them with `vercel env pull`, store them in **Production only**, never Preview. Changing them does not update MongoDB until you run the explicit `npm run setup -- --sync-admin` command described in Step 6. Before the Partner project is deployed, partner application links on the public site show a connection notice rather than linking to localhost. After deploying Partner, set `NEXT_PUBLIC_PARTNER_URL` here to its real `.vercel.app` URL and redeploy the combined project.

## 6. Initialise the production database and create the Founder account
On your computer, in the extracted merged project folder:
```bash
npm install
```
Copy `.env.example` to `.env.local`, then fill in `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, `INTERNAL_API_KEY`, and your founder email/password:
```env
BOOTSTRAP_ADMIN_EMAIL=your-real-email@example.com
BOOTSTRAP_ADMIN_PASSWORD=Use-A-Unique-Strong-Password-Here
BOOTSTRAP_ADMIN_NAME=Founder
```
Run once against the intended database:
```bash
npm run setup
```
This creates indexes, initial catalog/location/settings data and the first Super Admin. After success, delete `BOOTSTRAP_ADMIN_PASSWORD` from `.env.local` or clear the value. Never commit `.env.local`. Do not seed demo providers into production.

**To permanently change the existing Founder login from Vercel environment variables:** update `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and optionally `BOOTSTRAP_ADMIN_NAME` in the Main Customer + Admin Vercel project (Production). Then, on your trusted computer in this project folder, run `vercel env pull .env.local --environment=production` (the project must already be linked with `vercel link`) and run `npm run setup -- --sync-admin`. This explicit command updates the one existing `super_admin` record in MongoDB, keeps its MFA configuration, and revokes all old Founder sessions. Changing Vercel variables or redeploying alone does **not** change the stored MongoDB login. Keep `.env.local` private and delete/clear the bootstrap password after the sync.

You can also change your name/email permanently inside Admin → Security after confirming your current password, and change your password there. These changes are saved directly to MongoDB and are not overwritten by normal deployments.

## 7. Test the deployment
Open:
- Customer homepage: `https://YOUR-PROJECT.vercel.app/`
- API health: `https://YOUR-PROJECT.vercel.app/api/v1/health`
- Admin console: `https://YOUR-PROJECT.vercel.app/admin`

The health endpoint should report `ok: true` and `database: connected`. Then sign in at `/admin/login` with the Founder account, immediately enable MFA under **My security**, and check that the dashboard and admin sections load.

The homepage can display service-category preview when the database is temporarily unavailable, but search, authentication, bookings and admin data require a working MongoDB connection and completed setup. Do not accept real bookings until those workflows are tested end-to-end.

## 8. Deploy the Partner PWA from the second ZIP
Create a second private GitHub repository, e.g. `saj-saathi-partner`, upload the extracted second ZIP contents at the root, then import it into Vercel.

Partner Vercel settings: Next.js, root `./`, install `npm install`, build `npm run build`, output default, Node 22.x.

Partner Environment Variables (Production + Preview):
- `API_URL=https://YOUR-CUSTOMER-PROJECT.vercel.app/api/v1`
- `INTERNAL_API_KEY` — exactly the same value as the combined project.
- `NEXT_PUBLIC_CUSTOMER_URL=https://YOUR-CUSTOMER-PROJECT.vercel.app`
- `NEXT_PUBLIC_PARTNER_URL=https://YOUR-PARTNER-PROJECT.vercel.app`
- `NEXT_PUBLIC_ADMIN_URL=https://YOUR-CUSTOMER-PROJECT.vercel.app/admin`
- `NEXT_PUBLIC_SUPPORT_EMAIL` — your monitored support inbox.

Partner does **not** need `MONGODB_URI` or `AUTH_SECRET`.

## 9. Install Partner PWA on phones
- Android: open the Partner Vercel URL in Chrome, sign in, choose **Install app** when the install button appears, or Chrome menu → **Install app / Add to Home screen**.
- iPhone: open the Partner URL in Safari → Share → **Add to Home Screen**. iOS does not use the Android install prompt.
- PWA installation requires HTTPS. The Vercel deployment already provides HTTPS.

This is an installable PWA, not a Play Store APK. The partner service worker caches only safe static shell assets; API responses, customer records and booking details are never cached for offline confirmation.

## 10. Optional integrations (add only when accounts are ready)
Razorpay (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`), Resend (`RESEND_API_KEY`, `EMAIL_FROM`), MSG91 (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`), WhatsApp Cloud (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) and VAPID push keys can be added later. Keep each integration inactive until you have tested real provider delivery/payment in test mode.

## 11. Before production launch
- Fill legal entity, privacy, terms, cancellation/refund and grievance officer details with a qualified Indian lawyer/CA review.
- Run through customer signup/login, partner application, admin approval, service/slot setup, booking, cancellation, refund, partner status changes and role permissions.
- Test payment webhooks in Razorpay test mode before live mode.
- Configure real email/SMS/WhatsApp credentials only after sender/domain/template approvals.
- Enable MFA for every admin and least-privilege roles for staff.
- Configure backups, Atlas access restrictions, Vercel deployment protection for `/admin` if possible, monitoring and incident response.

## Troubleshooting
| Symptom | Check |
|---|---|
| Build fails during `npm run build` | Read the first TypeScript/Next error above the final Vercel failure line; update code before changing environment variables. |
| `/api/v1/health` says `AUTH_SECRET_MISSING_OR_TOO_SHORT` | Add a random `AUTH_SECRET` of at least 32 characters and redeploy. |
| Health says `MONGODB_URI_MISSING` or connection error | Check Atlas URI, URL-encoded password, database user permissions and Atlas Network Access. |
| Admin login succeeds but the console does not load | Confirm `INTERNAL_API_KEY` and `/api/v1` reachability; inspect Vercel Runtime Logs. |
| Partner login returns 401/403 | Check Partner `API_URL` ends in `/api/v1` and the internal key matches exactly. |
| PWA install option missing | Use HTTPS, supported browser, valid manifest/icons and service worker; iOS requires Share → Add to Home Screen. |

See `docs/` for architecture, API, data model, status flows, security, localisation, legal notes and handover.
