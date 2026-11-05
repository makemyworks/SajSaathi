import { NextResponse } from "next/server";
import { login, SESSION_TTL, publicUser } from "@/lib/core/auth";
import { parse, v } from "@/lib/core/validate";
import { api, body, sessionCookie } from "@/lib/server/http";

const schema = v.object({
  identifier: v.string({ min: 3, max: 120, msg: "Enter your mobile number or email" }),
  password: v.string({ min: 1, max: 128, trim: false }),
  app: v.optional(v.enum(["customer", "partner", "admin"] as const)),
  totp: v.optional(v.string({ pattern: /^\d{6}$/, msg: "Enter the 6-digit code" })),
});

/** Customer site: sets an httpOnly cookie. Partner/admin servers (x-ss-internal-key) get the token in the body and keep it in their own httpOnly cookie. */
export const POST = api(async ({ req, ctx, ip }) => {
  const b = parse(schema, await body(req));
  const app = b.app ?? "customer";
  const roles = app === "admin" ? ["admin" as const] : app === "partner" ? ["partner_owner" as const, "partner_staff" as const] : ["customer" as const];
  const internal = !!process.env.INTERNAL_API_KEY && req.headers.get("x-ss-internal-key") === process.env.INTERNAL_API_KEY;
  if (app !== "customer" && !internal) return NextResponse.json({ error: { code: "forbidden", message: "Use the partner or admin website to log in" } }, { status: 403 });
  const r = await login(ctx, { identifier: b.identifier, password: b.password, expectRoles: roles, totp: b.totp, ip, userAgent: req.headers.get("user-agent") ?? undefined });
  if (r.mfaRequired) return { mfaRequired: true };
  const res = NextResponse.json({ user: publicUser(r.user), token: internal ? r.token : undefined, ttl: SESSION_TTL[r.user.role] });
  if (!internal) res.cookies.set(sessionCookie(r.token, SESSION_TTL[r.user.role]));
  return res;
});
