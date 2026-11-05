# Saj Saathi — Customer Website, Central API & Admin Console

Next.js 15 App Router · TypeScript · Tailwind CSS 4 · MongoDB Atlas · Vercel · Customer PWA.

This repository is the single source for the public customer website, the central `/api/v1` backend, and the private founder console at `/admin`. The Partner Owner PWA is a separate repository/package and calls this central API; it does not connect to MongoDB.

- `app/(customer)/` — public customer pages (route group; URLs do not include `(customer)`).
- `app/admin/` — private founder/admin console at `/admin`.
- `app/api/v1/` — the central REST API used by customer, partner and admin experiences.
- `app/api/admin-session/` and `app/api/admin-proxy/` — same-origin, httpOnly-cookie admin BFF.
- `lib/core/` — shared business logic and permissions.
- `lib/server/` — MongoDB, auth context, integrations and API request handling.
- `public/manifest.webmanifest`, `public/sw.js` — customer PWA. Admin is not a separately installable PWA.

Read `START-HERE.md` before deploying. `npm run check` runs type-checking, tests, linting and a production build.
