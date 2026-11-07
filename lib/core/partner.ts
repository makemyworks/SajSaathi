import type { Ctx } from "./context";
import { audit } from "./context";
import { notify } from "./notifications";
import { DuplicateKeyError } from "./repo";
import type { Actor, ApplicationStatus, Booking, Category, DocumentRecord, Provider, Service, Staff, User, WeeklyHours } from "./types";
import { AppError, badRequest, conflict, forbidden, newId, normalizeIndianPhone, notFound, PIN_RE, slugify, TIME_RE, DATE_RE } from "./util";

export const DEFAULT_HOURS: WeeklyHours = {
  "0": { open: false, slots: [] },
  "1": { open: true, slots: [{ start: "10:00", end: "20:00" }] },
  "2": { open: true, slots: [{ start: "10:00", end: "20:00" }] },
  "3": { open: true, slots: [{ start: "10:00", end: "20:00" }] },
  "4": { open: true, slots: [{ start: "10:00", end: "20:00" }] },
  "5": { open: true, slots: [{ start: "10:00", end: "20:00" }] },
  "6": { open: true, slots: [{ start: "10:00", end: "20:00" }] },
};

/** Words that may not appear in names/descriptions for a category (e.g. a pet groomer calling themselves a vet). */
export function findDisallowedClaims(text: string, cat: Category): string[] {
  const t = text.toLowerCase();
  return (cat.disallowedClaims ?? []).filter((w) => new RegExp(`\\b${w.toLowerCase()}\\b`).test(t));
}

export function requirePartner(actor: Actor | null, ownerOnly = false): Actor & { providerId: string } {
  if (!actor || !(actor.role === "partner_owner" || (!ownerOnly && actor.role === "partner_staff"))) throw forbidden("Please log in to your partner account");
  if (!actor.providerId) throw new AppError(409, "no_application", "Please start your partner application first");
  return actor as Actor & { providerId: string };
}

async function myProvider(ctx: Ctx, actor: Actor & { providerId: string }) {
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: actor.providerId });
  if (!p) throw notFound("Business");
  return p;
}

const EDITABLE: ApplicationStatus[] = ["draft", "documents_required", "rejected"];

/** Resolve an owner's application and repair a stale/missing user.providerId link. */
export async function getPartnerApplication(ctx: Ctx, actor: Actor | null) {
  if (!actor || !["partner_owner", "partner_staff"].includes(actor.role)) throw forbidden("Please log in to your partner account");
  const providers = ctx.repo.col<Provider>("providers");
  // For owners, only accept the linked provider when it is actually owned by this user.
  // A stale pointer to a different provider must be repaired, not shown as someone else's account.
  let provider = actor.providerId
    ? await providers.findOne(actor.role === "partner_owner" ? { _id: actor.providerId, ownerUserId: actor.userId } : { _id: actor.providerId })
    : null;
  if (!provider && actor.role === "partner_owner") {
    provider = await providers.findOne({ ownerUserId: actor.userId }, { sort: { updatedAt: -1 } });
    if (provider && actor.providerId !== provider._id) {
      await ctx.repo.col<User>("users").updateOne({ _id: actor.userId }, { $set: { providerId: provider._id, updatedAt: ctx.now() } });
    }
  }
  if (!provider) return { application: null, category: null, checklist: undefined, documents: [] as Omit<DocumentRecord, "storageKey">[] };
  if (actor.role === "partner_owner" && provider.ownerUserId !== actor.userId) throw forbidden("This application does not belong to your account");
  const [category, checklist, docs] = await Promise.all([
    ctx.repo.col<Category>("categories").findOne({ _id: provider.primaryCategoryId }),
    applicationChecklist(ctx, provider),
    ctx.repo.col<DocumentRecord>("documents").find({ providerId: provider._id }, { sort: { createdAt: -1 } }),
  ]);
  return { application: provider, category, checklist, documents: docs.map(({ storageKey: _storageKey, ...doc }) => (void _storageKey, doc)) };
}

export async function startApplication(ctx: Ctx, actor: Actor, input: { categoryId: string; kind: "business" | "individual"; businessName: string; phone: string }) {
  if (actor.role !== "partner_owner") throw forbidden();
  const providers = ctx.repo.col<Provider>("providers");
  const users = ctx.repo.col<User>("users");

  // A retry after a timeout must resume the same application, not create another one.
  const existing = await providers.findOne({ ownerUserId: actor.userId }, { sort: { updatedAt: -1 } });
  if (existing) {
    if (actor.providerId !== existing._id) await users.updateOne({ _id: actor.userId }, { $set: { providerId: existing._id, updatedAt: ctx.now() } });
    return existing;
  }

  // Claim a short-lived account-level lock before creating the first provider record.
  // This closes the double-click / two-tabs race without requiring a new unique index
  // that could fail on older databases containing legacy duplicate records.
  const now = ctx.now();
  const lockId = newId();
  const lockUntil = new Date(now.getTime() + 45_000);
  const lock = await users.updateOne({
    _id: actor.userId,
    $or: [
      { partnerApplicationStartLockUntil: { $exists: false } },
      { partnerApplicationStartLockUntil: null },
      { partnerApplicationStartLockUntil: { $lt: now } },
    ],
  }, { $set: { partnerApplicationStartLockId: lockId, partnerApplicationStartLockUntil: lockUntil, updatedAt: now } });

  if (!lock) {
    // The other request may have completed between our first lookup and lock claim.
    const recovered = await providers.findOne({ ownerUserId: actor.userId }, { sort: { updatedAt: -1 } });
    if (recovered) {
      if (actor.providerId !== recovered._id) await users.updateOne({ _id: actor.userId }, { $set: { providerId: recovered._id, updatedAt: ctx.now() } });
      return recovered;
    }
    throw conflict("application_start_in_progress", "Your application is already being saved. Wait a moment and refresh this page; your account and application details have not been deleted.");
  }

  try {
    // Re-check after obtaining the lock for safety against a request that finished
    // immediately before the lock was acquired.
    const raced = await providers.findOne({ ownerUserId: actor.userId }, { sort: { updatedAt: -1 } });
    if (raced) {
      await users.updateOne({ _id: actor.userId, partnerApplicationStartLockId: lockId }, { $set: { providerId: raced._id, updatedAt: ctx.now() }, $unset: { partnerApplicationStartLockId: "", partnerApplicationStartLockUntil: "" } });
      return raced;
    }

    const cat = await ctx.repo.col<Category>("categories").findOne({ _id: input.categoryId, status: "active" });
    if (!cat) throw badRequest("Please choose a valid category");
    const phone = normalizeIndianPhone(input.phone);
    if (!phone) throw badRequest("Enter a valid 10-digit mobile number");
    const bad = findDisallowedClaims(input.businessName, cat);
    if (bad.length) throw badRequest(`Please don't use "${bad.join(", ")}" in your name for this category`);
    const base = slugify(input.businessName) || "partner";
    const p: Provider = {
      _id: newId(), ownerUserId: actor.userId, kind: input.kind, categoryIds: [cat._id], primaryCategoryId: cat._id,
      businessName: input.businessName.trim(), slug: `${base}-${newId().slice(-5)}`, phone,
      address: { line1: "", city: "", state: "", pin: "", country: "IN" }, branches: [],
      atHome: false, inStore: input.kind === "business", hours: DEFAULT_HOURS, holidays: [], timezone: "Asia/Kolkata",
      status: "draft", verified: false, onboardingAnswers: {}, credentials: [], gallery: [], ratingAvg: 0, ratingCount: 0,
      plan: { code: "free", status: "none" }, createdAt: now, updatedAt: now,
    };
    try { await providers.insertOne(p); }
    catch (e) { if (e instanceof DuplicateKeyError) throw conflict("slug", "Please try again"); throw e; }
    await users.updateOne({ _id: actor.userId, partnerApplicationStartLockId: lockId }, {
      $set: { providerId: p._id, updatedAt: now },
      $unset: { partnerApplicationStartLockId: "", partnerApplicationStartLockUntil: "" },
    });
    await audit(ctx, actor, "application.start", "provider", p._id);
    return p;
  } finally {
    // Release only our own lock. If a serverless request terminates unexpectedly,
    // the lock also expires automatically after 45 seconds.
    await users.updateOne({ _id: actor.userId, partnerApplicationStartLockId: lockId }, {
      $unset: { partnerApplicationStartLockId: "", partnerApplicationStartLockUntil: "" },
    }).catch(() => null);
  }
}

export async function updateApplication(ctx: Ctx, actorIn: Actor | null, input: Partial<Pick<Provider, "businessName" | "about" | "email" | "address" | "serviceArea" | "atHome" | "inStore" | "travelFeePaise" | "hours" | "onboardingAnswers" | "credentials" | "categoryIds" | "branches">>) {
  const actor = requirePartner(actorIn, true);
  const p = await myProvider(ctx, actor);
  const cat = await ctx.repo.col<Category>("categories").findOne({ _id: p.primaryCategoryId });
  if (!cat) throw notFound("Category");
  const onlyProfile = !EDITABLE.includes(p.status);
  const set: Record<string, unknown> = { updatedAt: ctx.now() };
  if (input.businessName !== undefined) {
    if (onlyProfile) throw conflict("locked", "Business name can be changed by Saj Saathi support after approval");
    if (findDisallowedClaims(input.businessName, cat).length) throw badRequest("This name uses a title not allowed for this category");
    set.businessName = input.businessName.trim();
  }
  if (input.about !== undefined) {
    const bad = findDisallowedClaims(input.about, cat);
    if (bad.length) throw badRequest(`Please don't describe yourself as "${bad.join(", ")}" in this category`);
    set.about = input.about.slice(0, 1500);
  }
  if (input.email !== undefined) set.email = input.email.trim().toLowerCase();
  if (input.address) {
    if (input.address.pin && !PIN_RE.test(input.address.pin)) throw badRequest("PIN code must be 6 digits");
    set.address = { ...input.address, country: input.address.country || "IN" };
  }
  if (input.serviceArea) set.serviceArea = { pins: (input.serviceArea.pins ?? []).filter((x) => PIN_RE.test(x)).slice(0, 200), radiusKm: input.serviceArea.radiusKm };
  if (input.atHome !== undefined) { if (input.atHome && !cat.atHomeAllowed) throw badRequest("At-home service is not allowed for this category"); set.atHome = input.atHome; }
  if (input.inStore !== undefined) set.inStore = input.inStore;
  if (input.travelFeePaise !== undefined) set.travelFeePaise = Math.max(0, Math.round(input.travelFeePaise));
  if (input.hours) set.hours = validateHours(input.hours);
  if (input.branches) {
    set.branches = input.branches.slice(0, 20).map((b) => {
      if (!b.name?.trim() || !b.address?.line1 || !PIN_RE.test(b.address?.pin ?? "")) throw badRequest("Each branch needs a name, address and 6-digit PIN code");
      return { id: b.id || newId(), name: b.name.trim().slice(0, 80), address: { ...b.address, country: b.address.country || "IN" }, hours: b.hours ? validateHours(b.hours) : undefined, active: b.active !== false };
    });
  }
  if (input.onboardingAnswers) {
    if (onlyProfile) throw conflict("locked", "Application answers are locked while under review or after approval");
    const allowed = new Set(cat.onboardingFields.map((f) => f.key));
    set.onboardingAnswers = Object.fromEntries(Object.entries(input.onboardingAnswers).filter(([k]) => allowed.has(k)));
  }
  if (input.credentials) {
    if (onlyProfile) throw conflict("locked", "Credentials are locked while under review");
    set.credentials = input.credentials.slice(0, 20).map((c) => ({ key: String(c.key), value: String(c.value).slice(0, 200), documentId: c.documentId }));
  }
  const updated = await ctx.repo.col<Provider>("providers").updateOne({ _id: p._id }, { $set: set });
  return updated!;
}

export function validateHours(h: WeeklyHours): WeeklyHours {
  const out = {} as WeeklyHours;
  for (const d of ["0", "1", "2", "3", "4", "5", "6"] as const) {
    const day = h[d] ?? { open: false, slots: [] };
    const slots = (day.slots ?? []).slice(0, 4).map((s) => {
      if (!TIME_RE.test(s.start) || !TIME_RE.test(s.end) || s.end <= s.start) throw badRequest("Opening hours must be like 09:30 – 19:00");
      return { start: s.start, end: s.end };
    });
    out[d] = { open: !!day.open && slots.length > 0, slots };
  }
  return out;
}

/** What is still missing before an application can be submitted (drives the onboarding checklist). */
export async function applicationChecklist(ctx: Ctx, p: Provider) {
  const cat = await ctx.repo.col<Category>("categories").findOne({ _id: p.primaryCategoryId });
  const docs = await ctx.repo.col<DocumentRecord>("documents").find({ providerId: p._id });
  const services = await ctx.repo.col<Service>("services").count({ providerId: p._id });
  const missing: string[] = [];
  if (!p.address.line1 || !p.address.city || !PIN_RE.test(p.address.pin)) missing.push("address");
  if (!p.inStore && !p.atHome) missing.push("service_mode");
  if (p.atHome && !(p.serviceArea?.pins?.length)) missing.push("service_area");
  for (const f of cat?.onboardingFields ?? []) if (f.required && (p.onboardingAnswers[f.key] === undefined || p.onboardingAnswers[f.key] === "")) missing.push(`field:${f.key}`);
  for (const c of cat?.requiredCredentials ?? []) if (c.mandatory && !p.credentials.some((x) => x.key === c.key && x.value)) missing.push(`credential:${c.key}`);
  if (!docs.some((d) => d.kind === "id_proof")) missing.push("doc:id_proof");
  if (services === 0) missing.push("services");
  if (!p.agreementAcceptedAt) missing.push("agreement");
  return { missing, complete: missing.length === 0 };
}

export async function acceptAgreement(ctx: Ctx, actorIn: Actor | null, version: string) {
  const actor = requirePartner(actorIn, true);
  const now = ctx.now();
  await ctx.repo.col<Provider>("providers").updateOne({ _id: actor.providerId }, { $set: { agreementAcceptedAt: now } });
  await ctx.repo.col<User>("users").updateOne({ _id: actor.userId }, { $push: { consents: { kind: "partner_agreement", version, granted: true, at: now } } });
}

export async function submitApplication(ctx: Ctx, actorIn: Actor | null) {
  const actor = requirePartner(actorIn, true);
  const p = await myProvider(ctx, actor);
  if (!EDITABLE.includes(p.status)) throw conflict("bad_state", "Application already submitted");
  const chk = await applicationChecklist(ctx, p);
  if (!chk.complete) throw new AppError(400, "incomplete", "Please complete all steps before submitting", chk.missing);
  const now = ctx.now();
  await ctx.repo.col<Provider>("providers").updateOne({ _id: p._id }, { $set: { status: "submitted", statusNote: undefined, updatedAt: now } });
  await audit(ctx, actor, "application.submit", "provider", p._id);
  return { status: "submitted" as const };
}

/** Admin decision on an application. Only "approved" providers ever appear publicly. */
export async function reviewApplication(ctx: Ctx, actor: Actor, providerId: string, to: ApplicationStatus, note?: string) {
  if (actor.role !== "admin") throw forbidden();
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: providerId });
  if (!p) throw notFound("Application");
  const allowed: Record<ApplicationStatus, ApplicationStatus[]> = {
    draft: [], submitted: ["under_review", "documents_required", "approved", "rejected"],
    under_review: ["documents_required", "approved", "rejected"], documents_required: ["under_review", "rejected"],
    approved: ["suspended"], rejected: ["under_review"], suspended: ["approved", "rejected"],
  };
  if (!allowed[p.status].includes(to)) throw conflict("bad_transition", `Cannot move an application from ${p.status} to ${to}`);
  if ((to === "rejected" || to === "documents_required" || to === "suspended") && !note) throw badRequest("Please add a note explaining the decision to the partner");
  const now = ctx.now();
  const set: Record<string, unknown> = { status: to, statusNote: note, updatedAt: now };
  if (to === "approved") { set.verified = true; set.verifiedAt = now; }
  if (to === "suspended" || to === "rejected") set.verified = false;
  await ctx.repo.col<Provider>("providers").updateOne({ _id: p._id }, { $set: set });
  const label = { approved: "Approved", rejected: "Not approved", documents_required: "More documents needed", under_review: "Under review", suspended: "Suspended", submitted: "Submitted", draft: "Draft" }[to];
  await notify(ctx, p.ownerUserId, "application.status.partner", { status: label, note: note ?? "" }, "/application");
  await audit(ctx, actor, `application.${to}`, "provider", p._id, { note });
}

// ---------------- Services ----------------
export async function upsertService(ctx: Ctx, actorIn: Actor | null, input: Partial<Service> & { _id?: string }) {
  const actor = requirePartner(actorIn, true);
  const p = await myProvider(ctx, actor);
  const categoryId = input.categoryId ?? p.primaryCategoryId;
  if (!p.categoryIds.includes(categoryId)) throw badRequest("You are not registered for this category");
  const cat = await ctx.repo.col<Category>("categories").findOne({ _id: categoryId });
  if (!cat) throw notFound("Category");
  const name = (input.name ?? "").trim();
  if (!name) throw badRequest("Service name is required");
  const bad = findDisallowedClaims(`${name} ${input.description ?? ""}`, cat);
  if (bad.length) throw badRequest(`Please don't use "${bad.join(", ")}" in this category`);
  const durationMin = Math.round(Number(input.durationMin));
  const pricePaise = Math.round(Number(input.pricePaise));
  if (!(durationMin >= 5 && durationMin <= 720)) throw badRequest("Duration must be between 5 minutes and 12 hours");
  if (!(pricePaise >= 0 && pricePaise <= 50_000_000)) throw badRequest("Enter a valid price");
  const mode = input.mode ?? "in_store";
  if (mode !== "in_store" && !cat.atHomeAllowed) throw badRequest("At-home service is not allowed in this category");
  const addOns = (input.addOns ?? []).slice(0, 20).map((a) => ({ id: a.id || newId().slice(-8), name: String(a.name).slice(0, 80), pricePaise: Math.max(0, Math.round(a.pricePaise)), durationMin: Math.max(0, Math.round(a.durationMin)) }));
  const allowedFields = new Set(cat.serviceFields.map((f) => f.key));
  const now = ctx.now();
  const doc: Partial<Service> = {
    name, description: input.description?.slice(0, 1000), durationMin, pricePaise, mode, addOns, categoryId,
    isPackage: !!input.isPackage, packageItems: input.packageItems?.slice(0, 20),
    eligibility: input.eligibility?.slice(0, 200), staffIds: input.staffIds ?? [], active: input.active ?? true,
    fieldValues: Object.fromEntries(Object.entries(input.fieldValues ?? {}).filter(([k]) => allowedFields.has(k))), updatedAt: now,
  };
  if (input._id) {
    const u = await ctx.repo.col<Service>("services").updateOne({ _id: input._id, providerId: p._id }, { $set: doc });
    if (!u) throw notFound("Service");
    return u;
  }
  const s = { _id: newId(), providerId: p._id, createdAt: now, ...doc } as Service;
  await ctx.repo.col<Service>("services").insertOne(s);
  return s;
}

export async function upsertStaff(ctx: Ctx, actorIn: Actor | null, input: Partial<Staff> & { _id?: string }) {
  const actor = requirePartner(actorIn, true);
  if (!input.name?.trim()) throw badRequest("Name is required");
  const doc = { name: input.name.trim().slice(0, 80), role: (input.role ?? "Professional").slice(0, 60), serviceIds: input.serviceIds ?? [], hours: input.hours ? validateHours(input.hours) : undefined, branchId: input.branchId, active: input.active ?? true };
  if (input._id) {
    const u = await ctx.repo.col<Staff>("staff").updateOne({ _id: input._id, providerId: actor.providerId }, { $set: doc });
    if (!u) throw notFound("Staff member");
    return u;
  }
  const s: Staff = { _id: newId(), providerId: actor.providerId, createdAt: ctx.now(), ...doc };
  await ctx.repo.col<Staff>("staff").insertOne(s);
  return s;
}

export async function setHolidays(ctx: Ctx, actorIn: Actor | null, dates: string[]) {
  const actor = requirePartner(actorIn, true);
  const clean = [...new Set(dates.filter((d) => DATE_RE.test(d)))].sort().slice(0, 366);
  await ctx.repo.col<Provider>("providers").updateOne({ _id: actor.providerId }, { $set: { holidays: clean, updatedAt: ctx.now() } });
  return clean;
}

export async function addBlock(ctx: Ctx, actorIn: Actor | null, input: { start: string; end: string; staffId?: string; reason?: string }) {
  const actor = requirePartner(actorIn);
  const start = new Date(input.start), end = new Date(input.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw badRequest("Choose a valid start and end time");
  const b = { _id: newId(), providerId: actor.providerId, start, end, staffId: input.staffId, reason: input.reason?.slice(0, 120), createdAt: ctx.now() };
  await ctx.repo.col<typeof b>("blocks").insertOne(b);
  return b;
}

// ---------------- Dashboard & statements ----------------
export async function partnerDashboard(ctx: Ctx, actorIn: Actor | null) {
  const actor = requirePartner(actorIn);
  const p = await myProvider(ctx, actor);
  const col = ctx.repo.col<Booking>("bookings");
  const now = ctx.now();
  const todayIst = new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
  const dayStart = new Date(todayIst + "T00:00:00+05:30"), dayEnd = new Date(dayStart.getTime() + 86400000);
  const monthStart = new Date(todayIst.slice(0, 7) + "-01T00:00:00+05:30");
  const [today, pending, upcoming, completedMonth, cancelledMonth] = await Promise.all([
    col.find({ providerId: p._id, start: { $gte: dayStart, $lt: dayEnd }, status: { $nin: ["cancelled"] } }, { sort: { start: 1 } }),
    col.count({ providerId: p._id, status: "pending" }),
    col.count({ providerId: p._id, status: { $in: ["confirmed", "rescheduled"] }, start: { $gte: now } }),
    col.find({ providerId: p._id, status: "completed", completedAt: { $gte: monthStart } }),
    col.count({ providerId: p._id, status: { $in: ["cancelled", "no_show"] }, updatedAt: { $gte: monthStart } }),
  ]);
  const revenueMonthPaise = completedMonth.reduce((s, b) => s + b.price.basePaise + b.price.addOnsPaise + b.price.travelPaise - (b.price.discountPaise ?? 0), 0);
  const commissionMonthPaise = completedMonth.reduce((s, b) => s + b.price.commissionPaise, 0);
  const unread = await ctx.repo.col<{ _id: string }>("notifications").count({ userId: actor.userId, read: false });
  return {
    provider: { id: p._id, name: p.businessName, status: p.status, statusNote: p.statusNote, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, slug: p.slug },
    today, counts: { today: today.length, pending, upcoming, completedMonth: completedMonth.length, cancelledMonth },
    revenueMonthPaise, commissionMonthPaise, unreadNotifications: unread,
  };
}

export async function commissionStatement(ctx: Ctx, actorIn: Actor | null, month: string) {
  const actor = requirePartner(actorIn, true);
  if (!/^\d{4}-\d{2}$/.test(month)) throw badRequest("Month must be YYYY-MM");
  const from = new Date(`${month}-01T00:00:00+05:30`);
  const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
  const rows = await ctx.repo.col<Booking>("bookings").find({ providerId: actor.providerId, status: "completed", completedAt: { $gte: from, $lt: to } }, { sort: { completedAt: 1 } });
  const lines = rows.map((b) => ({ ref: b.ref, date: b.completedAt, service: b.serviceName, servicePaise: b.price.basePaise + b.price.addOnsPaise, commissionPaise: b.price.commissionPaise, paidOnline: b.paymentStatus === "captured" }));
  const gross = lines.reduce((s, l) => s + l.servicePaise, 0);
  const commission = lines.reduce((s, l) => s + l.commissionPaise, 0);
  const penalties = (await ctx.repo.col<Booking>("bookings").find({ providerId: actor.providerId, providerPenaltyPaise: { $gt: 0 }, cancelledAt: { $gte: from, $lt: to } }))
    .map((b) => ({ ref: b.ref, date: b.cancelledAt, service: b.serviceName, penaltyPaise: b.providerPenaltyPaise ?? 0 }));
  const penaltyTotal = penalties.reduce((s, x) => s + x.penaltyPaise, 0);
  return { month, lines, penalties, grossPaise: gross, commissionPaise: commission, penaltyPaise: penaltyTotal, netPaise: gross - commission - penaltyTotal };
}
