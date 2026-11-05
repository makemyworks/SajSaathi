import { newTotpSecret, otpauthUrl, verifyTotp } from "@/lib/core/security";
import type { User } from "@/lib/core/types";
import { audit } from "@/lib/core/context";
import { badRequest } from "@/lib/core/util";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
/** POST {step:"start"} → secret + otpauth URL (show as QR); POST {step:"enable", code} → turns MFA on; POST {step:"disable", code}. */
export const POST = api(async ({ req, ctx, actor }) => {
  const a = await admin(ctx, actor, "dashboard.view");
  const b = await body<{ step: string; code?: string }>(req);
  const users = ctx.repo.col<User>("users");
  const u = (await users.findOne({ _id: a.userId }))!;
  if (b.step === "start") {
    const secret = newTotpSecret();
    await users.updateOne({ _id: u._id }, { $set: { mfa: { enabled: false, secret } } });
    return { secret, otpauth: otpauthUrl(secret, u.email ?? u._id) };
  }
  if (!u.mfa?.secret || !b.code || !verifyTotp(u.mfa.secret, b.code, ctx.now().getTime())) throw badRequest("The 6-digit code is not correct");
  if (b.step === "enable") { await users.updateOne({ _id: u._id }, { $set: { "mfa.enabled": true } }); await audit(ctx, a, "mfa.enable", "user", u._id); return { enabled: true }; }
  if (b.step === "disable") { await users.updateOne({ _id: u._id }, { $set: { mfa: { enabled: false } } }); await audit(ctx, a, "mfa.disable", "user", u._id); return { enabled: false }; }
  throw badRequest("Unknown step");
});
