import type { Ctx } from "./context";
import { audit } from "./context";
import { hashPassword, passwordProblem, randomToken } from "./security";
import type { Actor, AdminRole, Booking, Category, FieldDef, Payment, Provider, Session, User } from "./types";
import { badRequest, conflict, newId, notFound, slugify } from "./util";
import { DuplicateKeyError } from "./repo";

/** All numbers here are counted from the database at request time. Nothing is estimated or invented. */
export async function adminDashboard(ctx: Ctx, days = 30) {
  const since = new Date(ctx.now().getTime() - days * 86400000);
  const b = ctx.repo.col<Booking>("bookings");
  const pr = ctx.repo.col<Provider>("providers");
  const [customers, partnersApproved, applicationsWaiting, bookings, completed, cancelled, refundsOpen, ticketsOpen, categories, captured] = await Promise.all([
    ctx.repo.col<User>("users").count({ role: "customer", status: "active" }),
    pr.count({ status: "approved" }),
    pr.count({ status: { $in: ["submitted", "under_review", "documents_required"] } }),
    b.count({ createdAt: { $gte: since } }),
    b.find({ status: "completed", completedAt: { $gte: since } }),
    b.count({ status: { $in: ["cancelled", "no_show"] }, updatedAt: { $gte: since } }),
    ctx.repo.col<{ _id: string }>("refunds").count({ status: { $in: ["requested", "processing"] } }),
    ctx.repo.col<{ _id: string }>("tickets").count({ status: { $in: ["open", "pending"] } }),
    ctx.repo.col<Category>("categories").count({ status: "active" }),
    ctx.repo.col<Payment>("payments").find({ status: { $in: ["captured", "partially_refunded", "refunded"] }, createdAt: { $gte: since } }),
  ]);
  const gmvPaise = completed.reduce((s, x) => s + x.price.totalPaise, 0);
  const commissionPaise = completed.reduce((s, x) => s + x.price.commissionPaise, 0);
  const onlinePaise = captured.reduce((s, p) => s + p.amountPaise - p.refundedPaise, 0);
  // Bookings per day for the chart
  const recent = await b.find({ createdAt: { $gte: since } });
  const perDay: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) perDay[new Date(ctx.now().getTime() - i * 86400000 + 330 * 60000).toISOString().slice(0, 10)] = 0;
  for (const x of recent) { const d = new Date(x.createdAt.getTime() + 330 * 60000).toISOString().slice(0, 10); if (d in perDay) perDay[d]++; }
  // Top partners by completed bookings
  const byP = new Map<string, number>();
  for (const x of completed) byP.set(x.providerId, (byP.get(x.providerId) ?? 0) + 1);
  const topIds = [...byP.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5);
  const topProviders = topIds.length ? await pr.find({ _id: { $in: topIds.map((t) => t[0]) } }) : [];
  return {
    windowDays: days,
    counts: { customers, partnersApproved, applicationsWaiting, bookings, completed: completed.length, cancelled, refundsOpen, ticketsOpen, categories },
    money: { gmvPaise, commissionPaise, onlineCollectedPaise: onlinePaise },
    bookingsPerDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
    topPartners: topIds.map(([id, n]) => ({ id, name: topProviders.find((p) => p._id === id)?.businessName ?? "—", completed: n })),
  };
}

// ---------------- Category builder ----------------
function cleanFields(list: unknown, scope: FieldDef["scope"]): FieldDef[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 40).map((raw) => {
    const f = raw as FieldDef;
    const key = slugify(String(f.key || f.label?.en || "")).replace(/-/g, "_");
    if (!key) throw badRequest("Every custom field needs a key or English label");
    const types = ["text", "textarea", "number", "select", "multiselect", "boolean", "date", "file"];
    if (!types.includes(f.type)) throw badRequest(`Field ${key} has an unknown type`);
    if ((f.type === "select" || f.type === "multiselect") && !f.options?.length) throw badRequest(`Field ${key} needs options`);
    return { key, label: { en: String(f.label?.en ?? key), hi: f.label?.hi }, type: f.type, required: !!f.required, options: f.options, help: f.help, min: f.min, max: f.max, scope, private: !!f.private };
  });
}

export async function saveCategory(ctx: Ctx, actor: Actor, input: Partial<Category> & { _id?: string }) {
  if (!input.name?.en?.trim()) throw badRequest("English name is required");
  const now = ctx.now();
  const r = input.bookingRules ?? ({} as Category["bookingRules"]);
  const c = input.cancellationPolicy ?? ({} as Category["cancellationPolicy"]);
  const doc: Partial<Category> = {
    slug: slugify(input.slug || input.name.en),
    name: { en: input.name.en.trim(), hi: input.name.hi?.trim() || undefined },
    description: input.description, icon: input.icon, image: input.image, parentId: input.parentId,
    vertical: slugify(input.vertical || input.name.en).replace(/-/g, "_"),
    providerTypes: input.providerTypes ?? [],
    requiredCredentials: (input.requiredCredentials ?? []).map((x) => ({ key: slugify(x.key || x.label.en).replace(/-/g, "_"), label: x.label, mandatory: !!x.mandatory })),
    verificationRequirements: input.verificationRequirements ?? [],
    onboardingFields: cleanFields(input.onboardingFields, "provider"),
    bookingFields: cleanFields(input.bookingFields, "customer"),
    serviceFields: cleanFields(input.serviceFields, "service"),
    atHomeAllowed: !!input.atHomeAllowed, inStoreAllowed: input.inStoreAllowed !== false,
    bookingRules: {
      minLeadMinutes: clamp(r.minLeadMinutes, 0, 10080, 60), maxAdvanceDays: clamp(r.maxAdvanceDays, 1, 365, 30),
      slotStepMinutes: clamp(r.slotStepMinutes, 5, 240, 15), bufferMinutes: clamp(r.bufferMinutes, 0, 240, 0),
      requiresConsent: !!r.requiresConsent, consentText: r.consentText,
    },
    cancellationPolicy: { freeUntilHours: clamp(c.freeUntilHours, 0, 168, 4), lateFeePercent: clamp(c.lateFeePercent, 0, 100, 0), noShowFeePercent: clamp(c.noShowFeePercent, 0, 100, 0), description: c.description },
    safetyNotice: input.safetyNotice,
    disallowedClaims: (input.disallowedClaims ?? []).map((w) => String(w).trim().toLowerCase()).filter(Boolean),
    pricing: input.pricing, seo: input.seo, features: input.features ?? {},
    status: input.status === "active" ? "active" : "inactive", visible: input.visible !== false,
    sortOrder: Number(input.sortOrder ?? 100), updatedAt: now,
  };
  try {
    if (input._id) {
      const u = await ctx.repo.col<Category>("categories").updateOne({ _id: input._id }, { $set: doc });
      if (!u) throw notFound("Category");
      await audit(ctx, actor, "category.update", "category", u._id);
      return u;
    }
    const created = { _id: newId(), createdAt: now, ...doc } as Category;
    await ctx.repo.col<Category>("categories").insertOne(created);
    await audit(ctx, actor, "category.create", "category", created._id);
    return created;
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw conflict("slug_taken", "Another category already uses this URL slug");
    throw e;
  }
}
function clamp(v: unknown, min: number, max: number, dflt: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt;
}

// ---------------- Admin users ----------------
export async function inviteAdmin(ctx: Ctx, actor: Actor, input: { name: string; email: string; adminRole: AdminRole }) {
  const tempPassword = randomToken(9) + "7a";
  const u: User = { _id: newId(), role: "admin", adminRole: input.adminRole, name: input.name.trim(), email: input.email.trim().toLowerCase(), passwordHash: await hashPassword(tempPassword), status: "active", locale: "en", consents: [], createdAt: ctx.now(), updatedAt: ctx.now() };
  try { await ctx.repo.col<User>("users").insertOne(u); }
  catch (e) { if (e instanceof DuplicateKeyError) throw conflict("exists", "A user with this email already exists"); throw e; }
  await audit(ctx, actor, "admin.invite", "user", u._id, { adminRole: input.adminRole });
  return { id: u._id, tempPassword }; // shown once to the inviting super admin; ask the new admin to change it and enable MFA
}

/**
 * Founder bootstrap is deliberately one-time by default. To permanently apply changed
 * BOOTSTRAP_ADMIN_* values to the existing single super-admin record, run
 * `npm run setup -- --sync-admin` from a trusted machine with the production env pulled.
 * It never creates/elevates a second administrator and it revokes existing founder sessions.
 */
export async function bootstrapSuperAdmin(
  ctx: Ctx,
  email?: string,
  password?: string,
  name = "Founder",
  options: { syncExisting?: boolean } = {},
) {
  if (!email || !password) return { created: false, updated: false, reason: "BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set" };
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim() || "Founder";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw badRequest("Enter a valid BOOTSTRAP_ADMIN_EMAIL");
  const problem = passwordProblem(password);
  if (problem || password.length < 12) throw badRequest("Bootstrap password must be at least 12 characters with letters and numbers");

  const users = ctx.repo.col<User>("users");
  if (options.syncExisting) {
    const founders = await users.find({ role: "admin", adminRole: "super_admin" });
    if (founders.length > 1) throw badRequest("More than one super admin exists. Resolve the duplicate accounts from Admin → Admin users before syncing bootstrap credentials.");
    if (founders.length === 1) {
      const founder = founders[0];
      const emailOwner = await users.findOne({ email: normalizedEmail });
      if (emailOwner && emailOwner._id !== founder._id) throw conflict("email_in_use", "The new bootstrap email is already used by another account. Choose a different email.");
      const now = ctx.now();
      let updated: User | null;
      try {
        updated = await users.updateOne({ _id: founder._id, role: "admin", adminRole: "super_admin" }, { $set: {
          name: normalizedName,
          email: normalizedEmail,
          passwordHash: await hashPassword(password),
          updatedAt: now,
        } });
      } catch (e) {
        if (e instanceof DuplicateKeyError) throw conflict("email_in_use", "The new bootstrap email is already used by another account.");
        throw e;
      }
      if (!updated) throw badRequest("The Founder account changed during sync. Retry after checking Admin → Admin users.");
      await ctx.repo.col<Session>("sessions").deleteMany({ userId: founder._id });
      await audit(ctx, "system", "admin.bootstrap.sync", "user", founder._id, { emailChanged: founder.email !== normalizedEmail, nameChanged: founder.name !== normalizedName, sessionsRevoked: true });
      return { created: false, updated: true, reason: "The existing Founder account was updated in MongoDB and its old sessions were revoked." };
    }

    const adminCount = await users.count({ role: "admin" });
    if (adminCount > 0) throw badRequest("Admin accounts exist, but no super_admin account was found. Sign in with an existing administrator and resolve ownership before syncing.");
  }

  const existing = await users.count({ role: "admin" });
  if (existing > 0) return { created: false, updated: false, reason: "An admin already exists. Use --sync-admin to update the existing Founder account." };
  const now = ctx.now();
  try {
    await users.insertOne({ _id: newId(), role: "admin", adminRole: "super_admin", name: normalizedName, email: normalizedEmail, passwordHash: await hashPassword(password), status: "active", locale: "en", consents: [], createdAt: now, updatedAt: now });
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw conflict("email_in_use", "The bootstrap email is already used by another account.");
    throw e;
  }
  await audit(ctx, "system", "admin.bootstrap", "user");
  return { created: true, updated: false };
}

// ---------------- Reports (CSV) ----------------
export function toCsv(rows: Record<string, unknown>[], cols: string[]): string {
  const esc = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // prevent spreadsheet formula injection
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(c.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], r))).join(","))].join("\n");
}

export async function report(ctx: Ctx, kind: "bookings" | "commissions" | "payments" | "partners", from: Date, to: Date): Promise<{ filename: string; csv: string }> {
  const range = { $gte: from, $lt: to };
  const tag = `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
  if (kind === "bookings") {
    const rows = await ctx.repo.col<Booking>("bookings").find({ start: range }, { sort: { start: 1 } });
    return { filename: `bookings_${tag}.csv`, csv: toCsv(rows as never, ["ref", "start", "status", "serviceName", "customerName", "providerId", "mode", "price.totalPaise", "price.commissionPaise", "paymentMethod", "paymentStatus"]) };
  }
  if (kind === "payments") {
    const rows = await ctx.repo.col<Payment>("payments").find({ createdAt: range }, { sort: { createdAt: 1 } });
    return { filename: `payments_${tag}.csv`, csv: toCsv(rows as never, ["createdAt", "gatewayOrderId", "gatewayPaymentId", "amountPaise", "refundedPaise", "status", "method", "receiptNo", "bookingId"]) };
  }
  if (kind === "commissions") {
    const rows = await ctx.repo.col<Booking>("bookings").find({ status: "completed", completedAt: range });
    const by = new Map<string, { providerId: string; bookings: number; servicePaise: number; commissionPaise: number }>();
    for (const b of rows) {
      const e = by.get(b.providerId) ?? { providerId: b.providerId, bookings: 0, servicePaise: 0, commissionPaise: 0 };
      e.bookings++; e.servicePaise += b.price.basePaise + b.price.addOnsPaise; e.commissionPaise += b.price.commissionPaise;
      by.set(b.providerId, e);
    }
    const ps = await ctx.repo.col<Provider>("providers").find({ _id: { $in: [...by.keys()] } });
    const out = [...by.values()].map((e) => ({ ...e, name: ps.find((p) => p._id === e.providerId)?.businessName }));
    return { filename: `commissions_${tag}.csv`, csv: toCsv(out, ["providerId", "name", "bookings", "servicePaise", "commissionPaise"]) };
  }
  const rows = await ctx.repo.col<Provider>("providers").find({}, { sort: { createdAt: 1 } });
  return { filename: `partners_${tag}.csv`, csv: toCsv(rows as never, ["_id", "businessName", "kind", "status", "address.city", "address.pin", "ratingAvg", "ratingCount", "createdAt"]) };
}
