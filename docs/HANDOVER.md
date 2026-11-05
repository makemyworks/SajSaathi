# Saj Saathi — Technical handover

Prepared 31 October 2026. Three projects, one API, one MongoDB database.

| ZIP | Deploy to | What it is |
|---|---|---|
| `Saj_Saathi_Customer_Website_PWA.zip` | `www.sajsaathi.in` **and** `api.sajsaathi.in` (same Vercel project) | Customer website + installable PWA + **the central API** (`/api/v1`) + database setup + brand sources |
| `Saj_Saathi_Partner_Owner_PWA.zip` | `partner.sajsaathi.in` | Partner/owner dashboard, installable PWA, Hindi & English |
| `Saj_Saathi_Admin_Console.zip` | `admin.sajsaathi.in` | Private founder console, **not** a PWA |

Domains are examples until you confirm yours.

## 1. Existing code reused
No earlier project files (the `nivara_*.zip` archives) were provided in this conversation, so nothing could be inspected or reused. All three projects were **built new from the specification**. There is no Nivara branding anywhere.

## 2. Brand
* The uploaded artwork used a woman's face, a leaf and scissors. As instructed, it was redesigned into a gender-neutral abstract mark that keeps its direction: a teal-and-gold ribbon **S** made of two crescent strokes ("two companions forming one letter"). No face, no scissors.
* Editable vector masters + all required files (`logo.svg`, `logo-symbol.svg`, `logo-wordmark.svg`, `logo.png`, `logo-transparent.png`, `logo-dark-background.svg`, `logo-light-background.svg`, `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-icon-512.png`, `monochrome-logo.svg`, plus stacked, tile and on-dark variants). The wordmark is Lora (SIL OFL) converted to outlines.
* A heavier optical variant is used for the 16–48 px favicon so it stays readable.
* Palette refined for contrast (teal #183F3A, gold #B98A45 for the mark, light gold #D9B77C on teal, gold ink #8A6528 for small text, ivory #F7F5EF, charcoal #202725) — see the brand guide's contrast table.
* Brand guide PDF, and 15 editable SVG templates (square/portrait/story posts, WhatsApp, A4 & A3 posters, QR poster, partner poster, price menu, shop banner, website & email banners, business card front/back, social share image).

## 3. What was implemented

### Customer website + PWA (38 required pages)
Home (sentence-style search, categories, verified providers, at-home, genuine offers, trust, how it works, partner CTA, install) · Find services · Category pages · Find providers / search results (category-aware filters: city, PIN, locality, mode, rating, max price, sort) · Browse by city · Browse by locality · Provider profile · Service details · Gallery · Service pricing · Free times (availability) · Booking (service, add-ons, in-store/at-home, professional, date, live slots, category questions, address, server price, coupon, payment method, consent) · Confirmation with live payment status · My bookings (Upcoming / Completed / Cancelled tabs) · Booking detail (cancel, change time, review, get help, timeline, receipt) · Payment history · Favourites · Reviews · Profile · Saved addresses · Notifications (+ browser push opt-in) · Memberships · Offers · Referral programme · How it works · About · Become a partner · Become a professional · Contact · Help centre · FAQs · Privacy · Terms · Cancellation & refunds · Accessibility · Support tickets · Settings & privacy (consents, deletion request) · Login / Sign up · sitemap.xml · robots.txt · 404/error/loading.
SEO: titles, descriptions, canonicals, Open Graph, breadcrumbs with BreadcrumbList, HealthAndBeautyBusiness and FAQPage structured data, sitemap of real pages only (cities without providers return 404 — no empty SEO pages), noindex on filtered results/account/booking pages.

### Partner / owner PWA
Sign up · category-specific application (different questions, credentials and checks per category; disallowed claims blocked) · document upload (private) · checklist · agreement · submit · status with admin notes · Dashboard (today, pending, upcoming, month completed/cancelled, earnings, commission, rating, quick actions) · Bookings with big state-aware buttons (accept, decline with reason, customer arrived, start, done, no-show, cancel, call) · Booking detail with category answers and reschedule · Walk-in bookings · Week calendar · Services & prices (add-ons, packages, eligibility, category service fields, staff assignment, hide/remove) · Staff · Opening hours · Holidays · Blocked times · Branches · Home-visit area & travel charge · Business profile & photos · Reviews with replies · Notifications · QR code & posters (A4 print, square, story, WhatsApp, service menu, QR only, per-branch QR) · Money (monthly statement, commission, late-cancellation charges, plan, payouts, online payments) · Support · Settings (language, password, logout). Only category-relevant sections are shown.

### Admin console (all 54 sections)
Dashboard and Analytics (live counts only), Reports (CSV), Customers, Partners, Independent professionals, Applications, Verification, Documents (audit-logged viewing), Approvals, Rejections, Suspensions, Categories (full builder: names in EN/HI, rules, cancellation, consent & safety text, disallowed words, pricing, credentials, three sets of custom questions, features, SEO), Services, Pricing rules, Pricing exceptions, Countries, States (36 seeded), Cities, PIN codes, Territories, Bookings (+ detail and actions), Cancellations, Refund requests (approve/partial/reject → Razorpay), Payments, Commissions, Payouts, Subscriptions, Memberships, Coupons, Referrals, Promotions, Featured providers (always labelled Sponsored), Campaigns, Reviews (moderation recomputes ratings), Complaints & safety, Support tickets (+ reply), Email templates, WhatsApp templates, Notifications log (per-channel delivery status), Content pages, FAQs, SEO, Languages, Recruitment, Academy, Marketplace (catalogue only), Admin users (invite), Role permissions (editable matrix), Audit log, Integrations, Feature flags, System settings, Brand settings, Maintenance, My security (MFA). Most simple sections are driven by one registry (`lib/core/admin-resources.ts`) — adding a section is a few lines, no new UI code.

### Backend (central API, 76 route files)
See `docs/API.md`, `docs/DATABASE.md`, `docs/STATUS-FLOWS.md`, `docs/SECURITY.md`.

## 4. Integration status
| Integration | Status | Needs |
|---|---|---|
| MongoDB Atlas | Code complete, **not run against a real cluster here** | `MONGODB_URI`, `MONGODB_DB` |
| Razorpay (Orders, Checkout, signature, webhooks, refunds) | Code complete, tested with a test double; **inactive until keys are set** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, webhook URL in dashboard |
| Email (Resend HTTP API) | Inactive until configured | `RESEND_API_KEY`, `EMAIL_FROM` (verified domain) |
| SMS (MSG91 Flow) | Inactive until configured | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, DLT registration |
| WhatsApp (Meta Cloud API) | Inactive until configured | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, approved templates entered in Admin → WhatsApp templates |
| Browser push (Web Push/VAPID) | Inactive until configured | `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| In-app notifications | Active | — |

Unconfigured channels are recorded as `skipped_not_configured`; nothing claims a message was sent or a payment made.

## 5. Deployment sequence
1. MongoDB Atlas cluster + database user → connection string.
2. Generate secrets: `AUTH_SECRET` (customer only) and `INTERNAL_API_KEY` (same value in all three).
3. Push each project to its own GitHub repo; import each into Vercel as its own project.
4. Deploy **customer** first with its env vars → add domains `www.` and `api.` → run `npm run setup` once (locally with `.env.local`, or Vercel CLI) to create indexes, seed categories/states/flags and the first super admin.
5. Deploy **partner** and **admin** with `API_URL=https://api.<domain>/api/v1` and the same `INTERNAL_API_KEY`.
6. Log into admin → turn on MFA → review categories, fees, and legal page placeholders.
7. Add Razorpay keys + webhook; add messaging providers when ready.
Detailed, click-by-click steps: `START-HERE.md` in the customer project.

## 6. Environment variables (which project needs what)
| Variable | Customer/API | Partner | Admin | Secret? |
|---|---|---|---|---|
| `MONGODB_URI`, `MONGODB_DB` | ✔ | | | yes |
| `AUTH_SECRET` | ✔ | | | yes |
| `INTERNAL_API_KEY` | ✔ | ✔ | ✔ | yes (same value) |
| `API_URL` | | ✔ | ✔ | no |
| `BOOTSTRAP_ADMIN_EMAIL/PASSWORD/NAME` | ✔ (setup only) | | | yes |
| `RAZORPAY_*`, `RESEND_*`, `EMAIL_FROM`, `MSG91_*`, `WHATSAPP_*`, `VAPID_*` | ✔ optional | | | yes |
| `NEXT_PUBLIC_CUSTOMER_URL / PARTNER_URL / ADMIN_URL` | ✔ | ✔ | ✔ | no |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_SUPPORT_*`, `NEXT_PUBLIC_GRIEVANCE_OFFICER`, `NEXT_PUBLIC_COMPANY_DETAILS`, `NEXT_PUBLIC_JURISDICTION_CITY`, `NEXT_PUBLIC_SOCIAL_*` | ✔ | (support email) | | no |

## 7. Test results
See `docs/TEST-REPORT.md`. Summary: 23 automated tests pass (core logic, booking race, permissions, payments lifecycle with a gateway test double, proxies); all three apps type-check with zero errors against local stubs. **Not run here:** `npm install`, `next build`, ESLint, real MongoDB, Razorpay test mode, messaging delivery, PWA install, device/responsive checks — the sandbox had no npm registry access.

## 8. Not built yet / limitations (honest list)
* **Production build not verified** — run `npm install && npm run build` for each project first; expect possibly a few small type fixes against real Next.js 15 types.
* **OTP login** — password login is built; mobile OTP via MSG91 is not wired into the login flow yet.
* **Staff logins** — staff exist as schedule/assignment records; separate staff accounts (`partner_staff` role is supported by the API) have no invite screen yet.
* **Branch-specific availability** — branches, branch QR codes and posters exist; booking slots use the business's main hours, not per-branch hours.
* **Distance search** — search is by city, locality and PIN, not GPS distance.
* **Memberships, referrals, partner subscriptions** — configurable and displayed; purchase, billing and referral tracking are not built.
* **Payouts** — recorded by admins after paying partners; no automatic bank transfers.
* **Campaign sending** — campaigns can be planned and recorded; bulk sending is not built.
* **GST invoices** — receipts carry a receipt number; tax invoices are not generated (needs your GSTIN and CA input).
* **Data export (DPDP access requests)** — handled via support ticket; no self-service download.
* **Photography** — no stock photography was added (none licensed); listings use partners' own photos.
* **App screenshots** template — not produced because the apps could not be run here.
* **Hindi** — complete for customer and partner apps but a draft needing native review; the admin console is English-only.
* **Legal** — Privacy, Terms and Refund policy drafts are in the site and need lawyer review; Partner Agreement, Verification Policy, Code of Conduct, Home Service, Massage, Pet Grooming and Senior Fitness requirement documents still need to be written by your lawyer (category consent texts are drafts).

## 9. Remaining manual requirements
Domain & DNS · Atlas cluster, IP access and backups · Vercel projects and env vars · Razorpay KYC, keys, webhook · Resend domain verification · DLT registration for SMS · Meta WhatsApp Business verification and templates · VAPID keys · Grievance Officer appointment and company details · Lawyer review of legal texts · CA review of GST/TCS · Native-speaker review of Hindi · Real partner onboarding before launch in each city · Penetration test before public launch.
