# Saj Saathi Founder Admin Credentials

The Founder account is stored in MongoDB. `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_NAME` are setup inputs only; changing Vercel variables or redeploying does not automatically overwrite the database account.

## Apply changed Vercel Production variables to the existing Founder account

1. In the **main** Vercel project (`sajsaathi`), update `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and optionally `BOOTSTRAP_ADMIN_NAME`. Use **Production only**. These are not runtime variables for customer pages.
2. On your trusted Windows computer, open CMD in the SajSaathi Customer + Admin repository root.
3. Ensure the repository is linked to the main Vercel project (`vercel link`).
4. Pull the Production environment, including the MongoDB connection and auth secret:

   ```cmd
   vercel env pull .env.local --environment=production
   ```

5. Install dependencies if needed, then explicitly sync the database account:

   ```cmd
   npm install
   npm run setup -- --sync-admin
   ```

6. Wait for the command to report `updated: true` or `created: true`. The database account is now updated permanently. The command keeps the existing MFA configuration and revokes all existing Founder sessions. Sign in again at `https://sajsaathi.vercel.app/admin/login` with the new email and password, plus the existing authenticator code if MFA is enabled.
7. Delete the local `.env.local` file when finished, or remove the bootstrap password from it. Once the sync is complete, you may also remove the bootstrap variables from Vercel; they are not needed at runtime.

**Safety:** `--sync-admin` updates only when exactly one `super_admin` record exists. It does not promote another admin, does not create a second Founder account, and stops if the new email belongs to another account. Do not share `.env.local`, database credentials, or passwords.

## Change the account from the Admin panel

After signing in, open **Admin → Security** (`https://sajsaathi.vercel.app/admin/security`).

- **Admin login identity:** update name/email, confirm with the current password, and save. Changes are written to MongoDB and are used on the next login.
- **Change admin password:** enter the current and new passwords. The change is written to MongoDB and all active admin sessions are revoked; sign in again.
- **MFA:** use the authenticator setup panel. The bootstrap sync preserves MFA, but password changes revoke sessions.

The Admin panel changes are permanent database changes and are not reset by normal Vercel deployments.
