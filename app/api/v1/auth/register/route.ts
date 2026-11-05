import { NextResponse } from "next/server";
import { register, login, rateLimit, SESSION_TTL, publicUser } from "@/lib/core/auth";
import { parse, v } from "@/lib/core/validate";
import { api, body, sessionCookie } from "@/lib/server/http";

const schema = v.object({
  name: v.string({ min: 2, max: 80, msg: "Please enter your name" }),
  phone: v.optional(v.string({ max: 20 })),
  email: v.optional(v.string({ max: 120 })),
  password: v.string({ min: 8, max: 128, trim: false, msg: "Password must be at least 8 characters" }),
  role: v.optional(v.enum(["customer", "partner_owner"] as const)),
  locale: v.optional(v.enum(["en", "hi"] as const)),
  acceptTerms: v.boolean(),
  marketingConsent: v.optional(v.boolean()),
});

export const POST = api(async ({ req, ctx, ip }) => {
  await rateLimit(ctx, `register:${ip}`, 10, 3600);
  const b = parse(schema, await body(req));
  const internalCall = !!process.env.INTERNAL_API_KEY && req.headers.get("x-ss-internal-key") === process.env.INTERNAL_API_KEY;
  if (b.role === "partner_owner" && !internalCall) b.role = "customer";
  const user = await register(ctx, { ...b, role: b.role ?? "customer" });
  const r = await login(ctx, { identifier: user.email ?? user.phone!, password: b.password, expectRoles: [user.role], ip, userAgent: req.headers.get("user-agent") ?? undefined });
  const internal = !!process.env.INTERNAL_API_KEY && req.headers.get("x-ss-internal-key") === process.env.INTERNAL_API_KEY;
  const res = NextResponse.json({ user: publicUser(user), token: internal ? r.token : undefined, ttl: SESSION_TTL[user.role] });
  if (!internal) res.cookies.set(sessionCookie(r.token, SESSION_TTL[user.role]));
  return res;
});
