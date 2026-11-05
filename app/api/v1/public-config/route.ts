import { api } from "@/lib/server/http";
import { payments } from "@/lib/server/ctx";

/** Feature flags and integration on/off switches the browser needs (never secrets). */
export const GET = api(async ({ ctx }) => {
  const flags = await ctx.repo.col<{ _id: string; key: string; enabled: boolean }>("feature_flags").find({});
  const f = Object.fromEntries(flags.map((x) => [x.key, x.enabled]));
  const promotions = await ctx.repo.col<{ _id: string; active: boolean; validTo?: Date }>("promotions").find({ active: true }, { sort: { updatedAt: -1 }, limit: 10 });
  return { flags: f, onlinePayments: !!payments && f.online_payments !== false, razorpayKeyId: payments?.keyId ?? null, vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null, promotions: promotions.filter((p) => !p.validTo || p.validTo > new Date()) };
});
