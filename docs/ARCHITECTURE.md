# Architecture — Saj Saathi two-project deployment

```
Customer browser / PWA                    Founder / Admin browser               Partner browser / PWA
        |                                         |                                      |
        +----------- same Vercel origin ----------+                                      |
        |  / (customer)       /admin (console)     |                                      |
        |  /api/v1 (central backend)               |                                      |
        +--------------------+---------------------+                                      |
                             |                                                            |
                       MongoDB Atlas  <-------------------- Partner BFF/API proxy --------+
                       database: saj_saathi                 API_URL → /api/v1
```

- **Combined Customer + Admin Vercel project:** public customer pages and PWA, central API at `/api/v1`, admin console at `/admin`. It is the only project with `MONGODB_URI` and it runs the domain logic.
- **Partner PWA Vercel project:** separate application and PWA install scope. It does not connect to MongoDB; its server-side allow-listed proxy calls the central API with the partner's bearer token and `INTERNAL_API_KEY`.
- Customer and admin share one origin and one API. Admin login/session/proxy routes are namespaced at `/api/admin-session/*` and `/api/admin-proxy/*`, use a separate `ssa_session` httpOnly cookie and are protected by scoped middleware. Customer routes do not require an admin cookie.
- One database and one user identity model are retained. Customer, partner and admin are roles in the same backend auth model.
- Business rules live in `lib/core/*`; MongoDB access lives in `lib/server/*`. Partner app ships the matching API contract/types/UI helpers but never database credentials.

## Route layout
- `app/(customer)/*` — route group; URL path does not include `(customer)`.
- `app/admin/*` — founder console; all routes begin `/admin`.
- `app/api/v1/*` — central API.
- `app/api/admin-session/*`, `app/api/admin-proxy/*` — admin BFF.
- `public/manifest.webmanifest`, `public/sw.js` — customer PWA only.
- Partner package has its own `/manifest.webmanifest` and `/sw.js` at the partner domain.


The public site and founder console share the same customer Vercel origin. Partner links are enabled when `NEXT_PUBLIC_PARTNER_URL` is set; until the Partner deployment exists, the site displays a connection notice rather than a localhost link.
