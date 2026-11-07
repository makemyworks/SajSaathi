# Saj Saathi Partner login — Vercel-only setup (no CMD)

This setup lets the Main Customer + Admin API create or update one designated Partner owner account from private Vercel environment variables. The Partner app continues to use its existing login page and central API connection.

## 1. Update the Main project (not the Partner project)

Open Vercel → `sajsaathi` → Settings → Environment Variables. Add these variables for **Production**:

- `PARTNER_OWNER_NAME` — the name displayed in the Partner account (example: `Saj Saathi Partner`).
- `PARTNER_OWNER_EMAIL` — the email you will enter on the Partner login page.
- `PARTNER_OWNER_PASSWORD` — a strong password you choose. Use at least 8 characters with letters and numbers.
- `PARTNER_OWNER_PHONE` — optional. Use this only when you already have an existing Partner owner/application and need to link it by its currently registered mobile number while changing the email.

Do not add `NEXT_PUBLIC_` to any of these names. Never put these variables in the Partner project.

## 2. Preserve an existing application

If this is a new Partner account, leave `PARTNER_OWNER_PHONE` blank.

If you already submitted a Partner application, first set `PARTNER_OWNER_EMAIL` to the current email on that existing Partner owner account. That lets the API update the same user record. If you are also changing the email, set `PARTNER_OWNER_PHONE` to the mobile number already registered on that same Partner account. Do not use a phone number that belongs to a different person/account.

The sync preserves the existing user ID and provider/application link. The application API also recovers a missing `providerId` link by looking up the application owned by that same account.

## 3. Redeploy Main

After saving the variables, open Deployments in the `sajsaathi` project and redeploy the latest Production deployment so the new server-only values are loaded.

## 4. Update the Partner portal

Partner Vercel (`sajsaathipartner`) should keep these server variables:

- `API_URL=https://sajsaathi.vercel.app/api/v1`
- `INTERNAL_API_KEY` — exactly the same value as the Main `INTERNAL_API_KEY`.

Keep `MONGODB_URI` and `AUTH_SECRET` only in Main. The Partner browser never receives the Partner owner password configured in Main.

## 5. Sign in

Open `https://sajsaathipartner.vercel.app/login` and enter `PARTNER_OWNER_EMAIL` and `PARTNER_OWNER_PASSWORD`. On the first valid Partner login after redeploy, the Main API automatically creates or updates the designated Partner owner in MongoDB, then checks the login normally. No terminal, local database setup, or manual password hash is required.

If the email/phone belongs to a customer/admin account, the API deliberately refuses to change that account's role. Use a separate Partner email/phone or link the correct existing Partner owner account.

## 6. Changing the password later

Change `PARTNER_OWNER_EMAIL` and/or `PARTNER_OWNER_PASSWORD` in the Main Vercel project and redeploy Main. Then sign in to Partner using the new values. The same Partner account is updated in MongoDB; its existing application/provider link is preserved. Existing sessions are invalidated when the password changes.

## Notes

- The env-managed account is a `partner_owner`, not an approved salon. It must still complete its application and be reviewed by Founder Admin before appearing publicly.
- Do not share the password or internal API key.
- If an env variable is incomplete or invalid, Partner login returns a clear configuration error instead of silently creating a customer account.
