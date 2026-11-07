import type { Ctx } from "./context";
import { audit } from "./context";
import { DuplicateKeyError } from "./repo";
import { hashPassword, passwordProblem, signToken, verifyPassword, verifyToken, verifyTotp } from "./security";
import type { Actor, Consent, Role, Session, User } from "./types";
import { AppError, badRequest, conflict, newId, normalizeIndianPhone } from "./util";

export const SESSION_TTL: Record<Role, number> = {
  customer: 60 * 60 * 24 * 30,
  partner_owner: 60 * 60 * 24 * 30,
  partner_staff: 60 * 60 * 24 * 30,
  admin: 60 * 60 * 8, // admins re-authenticate every 8 hours
};
export const LEGAL_VERSION = "2026-11-draft";

/** Fixed-window rate limiter backed by the database (works on serverless; TTL index cleans up). */
export async function rateLimit(ctx: Ctx, key: string, limit: number, windowSeconds: number): Promise<void> {
  const window = Math.floor(ctx.now().getTime() / 1000 / windowSeconds);
  const col = ctx.repo.col<{ _id: string; key: string; window: number; count: number; expiresAt: Date }>("rate_limits");
  const updated = await col.updateOne({ key, window }, { $inc: { count: 1 } });
  if (!updated) {
    try {
      await col.insertOne({ _id: newId(), key, window, count: 1, expiresAt: new Date((window + 2) * windowSeconds * 1000) });
      return;
    } catch (e) {
      if (!(e instanceof DuplicateKeyError)) throw e;
      const again = await col.updateOne({ key, window }, { $inc: { count: 1 } });
      if (again && again.count > limit) throw new AppError(429, "rate_limited", "Too many attempts. Please wait a little and try again.");
      return;
    }
  }
  if (updated.count > limit) throw new AppError(429, "rate_limited", "Too many attempts. Please wait a little and try again.");
}

function identifierFilter(identifier: string): Record<string, string> {
  const id = identifier.trim();
  if (id.includes("@")) return { email: id.toLowerCase() };
  const phone = normalizeIndianPhone(id);
  if (!phone) throw badRequest("Enter a valid email or 10-digit mobile number");
  return { phone };
}

export async function register(ctx: Ctx, input: { name: string; email?: string; phone?: string; password: string; role: "customer" | "partner_owner"; locale?: string; marketingConsent?: boolean; acceptTerms: boolean }): Promise<User> {
  if (!input.acceptTerms) throw badRequest("Please accept the Terms and Privacy Policy");
  const problem = passwordProblem(input.password);
  if (problem) throw badRequest(problem);
  const phone = input.phone ? normalizeIndianPhone(input.phone) : undefined;
  if (input.phone && !phone) throw badRequest("Enter a valid 10-digit Indian mobile number");
  const email = input.email?.trim().toLowerCase() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("Enter a valid email address");
  if (!email && !phone) throw badRequest("Email or mobile number is required");
  const now = ctx.now();
  const consents: Consent[] = [
    { kind: "terms", version: LEGAL_VERSION, granted: true, at: now },
    { kind: "privacy", version: LEGAL_VERSION, granted: true, at: now },
  ];
  if (input.marketingConsent) for (const k of ["marketing_email", "marketing_sms", "marketing_whatsapp"] as const) consents.push({ kind: k, version: LEGAL_VERSION, granted: true, at: now });
  const user: User = {
    _id: newId(), role: input.role, name: input.name.trim(), email, phone: phone ?? undefined,
    passwordHash: await hashPassword(input.password), status: "active", locale: input.locale === "hi" ? "hi" : "en",
    consents, favourites: [], createdAt: now, updatedAt: now,
  };
  try {
    await ctx.repo.col<User>("users").insertOne(user);
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw new AppError(409, "account_exists", "An account with this email or mobile number already exists. Please log in.");
    throw e;
  }
  await audit(ctx, { userId: user._id, role: user.role }, "user.register", "user", user._id);
  return user;
}

export interface LoginResult { token: string; user: User; mfaRequired: boolean }

export async function login(ctx: Ctx, input: { identifier: string; password: string; expectRoles: Role[]; totp?: string; ip?: string; userAgent?: string }): Promise<LoginResult> {
  await rateLimit(ctx, `login:${input.identifier.toLowerCase()}`, 8, 15 * 60);
  if (input.ip) await rateLimit(ctx, `login-ip:${input.ip}`, 40, 15 * 60);
  const user = await ctx.repo.col<User>("users").findOne(identifierFilter(input.identifier));
  const ok = user && (await verifyPassword(input.password, user.passwordHash));
  if (!user || !ok || !input.expectRoles.includes(user.role)) {
    throw new AppError(401, "invalid_credentials", "Wrong email/mobile or password");
  }
  if (user.status !== "active") throw new AppError(403, "account_inactive", "This account is not active. Please contact support.");
  let mfaPassed = true;
  if (user.role === "admin" && user.mfa?.enabled) {
    if (!input.totp) return { token: "", user, mfaRequired: true };
    if (!verifyTotp(user.mfa.secret!, input.totp, ctx.now().getTime())) throw new AppError(401, "invalid_mfa", "The 6-digit code is not correct");
    mfaPassed = true;
  }
  const session: Session = {
    _id: newId(), userId: user._id, role: user.role, createdAt: ctx.now(),
    expiresAt: new Date(ctx.now().getTime() + SESSION_TTL[user.role] * 1000), ip: input.ip, userAgent: input.userAgent?.slice(0, 200), mfaPassed,
  };
  await ctx.repo.col<Session>("sessions").insertOne(session);
  await ctx.repo.col<User>("users").updateOne({ _id: user._id }, { $set: { lastLoginAt: ctx.now() } });
  if (user.role === "admin") await audit(ctx, { userId: user._id, role: "admin", adminRole: user.adminRole }, "admin.login", "session", session._id, undefined, input.ip);
  const token = signToken({ sid: session._id, sub: user._id, role: user.role }, ctx.authSecret, SESSION_TTL[user.role]);
  return { token, user, mfaRequired: false };
}

/** Resolves a bearer token into an Actor; checks the session still exists (so logout and disabling work immediately). */
export async function resolveActor(ctx: Ctx, token: string | undefined): Promise<Actor | null> {
  const p = verifyToken<{ sid: string; sub: string; role: Role }>(token, ctx.authSecret);
  if (!p) return null;
  const session = await ctx.repo.col<Session>("sessions").findOne({ _id: p.sid, userId: p.sub });
  if (!session || session.expiresAt < ctx.now()) return null;
  const user = await ctx.repo.col<User>("users").findOne({ _id: p.sub });
  if (!user || user.status !== "active") return null;
  return { userId: user._id, role: user.role, adminRole: user.adminRole, providerId: user.providerId };
}

export async function logout(ctx: Ctx, token: string | undefined) {
  const p = verifyToken<{ sid: string }>(token, ctx.authSecret);
  if (p) await ctx.repo.col<Session>("sessions").deleteOne({ _id: p.sid });
}
export async function logoutAll(ctx: Ctx, userId: string) {
  await ctx.repo.col<Session>("sessions").deleteMany({ userId });
}

export async function changePassword(ctx: Ctx, actor: Actor, current: string, next: string) {
  const user = await ctx.repo.col<User>("users").findOne({ _id: actor.userId });
  if (!user || !(await verifyPassword(current, user.passwordHash))) throw badRequest("Current password is not correct");
  const problem = passwordProblem(next);
  if (problem) throw badRequest(problem);
  await ctx.repo.col<User>("users").updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(next), updatedAt: ctx.now() } });
  await logoutAll(ctx, user._id);
}


/** Permanently updates the signed-in administrator identity after current-password confirmation. */
export async function updateAdminProfile(
  ctx: Ctx,
  actor: Actor,
  input: { name: string; email: string; currentPassword: string },
): Promise<User> {
  if (actor.role !== "admin") throw new AppError(403, "admin_only", "Only administrators can update this profile");
  const users = ctx.repo.col<User>("users");
  const current = await users.findOne({ _id: actor.userId, role: "admin" });
  if (!current || !(await verifyPassword(input.currentPassword, current.passwordHash))) throw badRequest("Current password is not correct");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 80) throw badRequest("Name must be between 2 and 80 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) throw badRequest("Enter a valid email address");
  const emailOwner = await users.findOne({ email });
  if (emailOwner && emailOwner._id !== current._id) throw conflict("email_in_use", "This email is already linked to another account");
  let updated: User | null;
  try {
    updated = await users.updateOne({ _id: current._id, role: "admin" }, { $set: { name, email, updatedAt: ctx.now() } });
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw conflict("email_in_use", "This email is already linked to another account");
    throw e;
  }
  if (!updated) throw badRequest("Your admin account could not be updated. Please retry.");
  await audit(ctx, actor, "admin.profile.update", "user", current._id, { emailChanged: current.email !== email, nameChanged: current.name !== name });
  return updated;
}

/** Public projection of a user — never return passwordHash or MFA secrets. */
export function publicUser(u: User) {
  return { id: u._id, role: u.role, adminRole: u.adminRole, name: u.name, email: u.email, phone: u.phone, locale: u.locale, providerId: u.providerId, status: u.status, mfaEnabled: !!u.mfa?.enabled, consents: u.consents.map((c) => ({ kind: c.kind, granted: c.granted, at: c.at })) };
}
