/**
 * One-time (and safe to repeat) database setup:
 *   npm run setup            → creates indexes, base categories, India + 36 states/UTs, feature flags, settings,
 *                              and the first super admin from BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD.
 *   npm run setup -- --sync-admin → permanently updates the existing single Founder account from those env values.
 *   npm run setup -- --demo  → ALSO adds one clearly-labelled DEMO provider for testing. Never use --demo on production.
 * Reads MONGODB_URI etc. from .env.local (or the environment).
 */
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
else if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const { getCtx } = await import("../lib/server/ctx");
  const { seedBase } = await import("../lib/core/seed");
  const { bootstrapSuperAdmin } = await import("../lib/core/admin");
  const ctx = await getCtx();
  console.log("Seeding base configuration…");
  console.log(await seedBase(ctx));
  const syncAdmin = process.argv.includes("--sync-admin");
  const adminResult = await bootstrapSuperAdmin(ctx, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD, process.env.BOOTSTRAP_ADMIN_NAME || "Founder", { syncExisting: syncAdmin });
  console.log(syncAdmin ? "Founder account sync:" : "Super admin:", adminResult);
  if (syncAdmin && !adminResult.created && !adminResult.updated) {
    throw new Error(adminResult.reason || "Founder account sync did not complete");
  }
  if (process.argv.includes("--demo")) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") throw new Error("Refusing to add demo data to production");
    const { createDemo } = await import("./demo");
    console.log("Demo:", await createDemo(ctx));
  }
  console.log(syncAdmin ? "Founder credentials are saved in MongoDB. Remove BOOTSTRAP_ADMIN_PASSWORD from local files when finished." : "Done. You can remove BOOTSTRAP_ADMIN_PASSWORD from your environment now.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
