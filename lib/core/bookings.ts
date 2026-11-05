import { computeSlots, lockUnits, resourceKey, type BusyInterval } from "./availability";
import type { Ctx } from "./context";
import { audit } from "./context";
import { notify } from "./notifications";
import { actorKind, canTransition, canViewBooking, SLOT_HOLDING } from "./permissions";
import { cancellationFee, evaluateCoupon, quote } from "./pricing";
import { DuplicateKeyError } from "./repo";
import type { Actor, Address, Booking, BookingStatus, Category, Coupon, Provider, Service, Staff } from "./types";
import { AppError, badRequest, conflict, DATE_RE, forbidden, formatINR, humanRef, newId, notFound, PIN_RE, zonedParts } from "./util";

type Lock = { _id: string; resource: string; unit: number; bookingId: string; expiresAt?: Date };

export async function loadBookable(ctx: Ctx, providerId: string, serviceId: string) {
  const provider = await ctx.repo.col<Provider>("providers").findOne({ _id: providerId });
  if (!provider || provider.status !== "approved") throw notFound("Provider");
  const service = await ctx.repo.col<Service>("services").findOne({ _id: serviceId, providerId, active: true });
  if (!service) throw notFound("Service");
  const category = await ctx.repo.col<Category>("categories").findOne({ _id: service.categoryId });
  if (!category || category.status !== "active") throw new AppError(409, "category_inactive", "This service is not available right now");
  const staff = await ctx.repo.col<Staff>("staff").find({ providerId, active: true });
  return { provider, service, category, staff };
}

async function busyFor(ctx: Ctx, providerId: string, from: Date, to: Date, excludeBookingId?: string): Promise<BusyInterval[]> {
  const bookings = await ctx.repo.col<Booking>("bookings").find({ providerId, status: { $in: SLOT_HOLDING }, start: { $lt: to }, end: { $gt: from } });
  return bookings.filter((b) => b._id !== excludeBookingId).map((b) => ({ start: b.start, end: b.end, resource: resourceKey(providerId, b.staffId) }));
}

export async function getSlots(ctx: Ctx, q: { providerId: string; serviceId: string; date: string; addOnIds?: string[]; staffId?: string; mode?: "in_store" | "at_home"; excludeBookingId?: string }) {
  if (!DATE_RE.test(q.date)) throw badRequest("Invalid date");
  const { provider, service, category, staff } = await loadBookable(ctx, q.providerId, q.serviceId);
  const p = quote({ service, addOnIds: q.addOnIds ?? [], mode: q.mode ?? "in_store", provider, category, platform: ctx.platform });
  const dayStart = new Date(q.date + "T00:00:00Z"); dayStart.setUTCDate(dayStart.getUTCDate() - 1);
  const dayEnd = new Date(q.date + "T00:00:00Z"); dayEnd.setUTCDate(dayEnd.getUTCDate() + 2);
  const blocks = await ctx.repo.col<{ _id: string; providerId: string; start: Date; end: Date; staffId?: string }>("blocks").find({ providerId: provider._id, start: { $lt: dayEnd }, end: { $gt: dayStart } });
  const slots = computeSlots({ provider, service, category, staff, date: q.date, durationMin: p.durationMin, busy: await busyFor(ctx, provider._id, dayStart, dayEnd, q.excludeBookingId), blocks, now: ctx.now(), staffId: q.staffId });
  return { date: q.date, timezone: provider.timezone, durationMin: p.durationMin, slots };
}

/** Writes one unique row per 5-minute unit. If any unit is taken the whole lock fails → no double booking. */
async function lockSlot(ctx: Ctx, bookingId: string, resource: string, start: Date, end: Date, bufferMin: number) {
  const units = lockUnits(start, end, bufferMin);
  const rows: Lock[] = units.map((unit) => ({ _id: newId(), resource, unit, bookingId }));
  try {
    await ctx.repo.col<Lock>("slot_locks").insertManyAtomic(rows);
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw conflict("slot_taken", "Sorry, this time was just booked by someone else. Please choose another time.");
    throw e;
  }
}
async function releaseLocks(ctx: Ctx, bookingId: string) {
  await ctx.repo.col<Lock>("slot_locks").deleteMany({ bookingId });
}

export interface CreateBookingInput {
  providerId: string;
  serviceId: string;
  staffId?: string;
  start: string; // ISO from the slot list
  addOnIds: string[];
  mode: "in_store" | "at_home";
  address?: Address;
  fields?: Record<string, unknown>;
  notes?: string;
  couponCode?: string;
  paymentMethod: "pay_at_venue" | "online";
  consent?: boolean;
  customerName?: string; // walk-in only
  customerPhone?: string; // walk-in only
}

export async function previewPrice(ctx: Ctx, actor: Actor | null, input: Pick<CreateBookingInput, "providerId" | "serviceId" | "addOnIds" | "mode" | "couponCode">) {
  const { provider, service, category } = await loadBookable(ctx, input.providerId, input.serviceId);
  const base = quote({ service, addOnIds: input.addOnIds, mode: input.mode, provider, category, platform: ctx.platform });
  let coupon: { ok: boolean; reason?: string; discountPaise: number } | undefined;
  if (input.couponCode) {
    coupon = await couponDiscount(ctx, input.couponCode, actor?.userId, base.basePaise + base.addOnsPaise, category._id, provider._id);
  }
  return { ...quote({ service, addOnIds: input.addOnIds, mode: input.mode, provider, category, platform: ctx.platform, discountPaise: coupon?.ok ? coupon.discountPaise : 0 }), coupon };
}

async function couponDiscount(ctx: Ctx, code: string, userId: string | undefined, subtotal: number, categoryId: string, providerId: string) {
  const c = await ctx.repo.col<Coupon>("coupons").findOne({ code: code.trim().toUpperCase() });
  const userRedemptions = userId && c ? await ctx.repo.col<{ _id: string }>("coupon_redemptions").count({ couponId: c._id, userId }) : 0;
  return { ...evaluateCoupon(c, { subtotalPaise: subtotal, categoryId, providerId, now: ctx.now(), userRedemptions }), coupon: c };
}

export async function createBooking(ctx: Ctx, actor: Actor, input: CreateBookingInput): Promise<Booking> {
  const walkIn = actor.role === "partner_owner" || actor.role === "partner_staff";
  if (!walkIn && actor.role !== "customer") throw forbidden();
  if (walkIn && actor.providerId !== input.providerId) throw forbidden();

  const { provider, service, category, staff } = await loadBookable(ctx, input.providerId, input.serviceId);
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) throw badRequest("Invalid time");

  // Mode must be offered by provider, category and service.
  if (input.mode === "at_home") {
    if (!provider.atHome || !category.atHomeAllowed || service.mode === "in_store") throw badRequest("At-home service is not offered for this booking");
    if (!walkIn) {
      if (!input.address || !input.address.line1 || !PIN_RE.test(input.address.pin)) throw badRequest("A full address with a valid PIN code is needed for at-home service");
      if (provider.serviceArea?.pins?.length && !provider.serviceArea.pins.includes(input.address.pin)) throw badRequest("This provider does not visit your PIN code");
    }
  } else if (!provider.inStore || !category.inStoreAllowed || service.mode === "at_home") throw badRequest("In-store service is not offered for this booking");

  if (category.bookingRules.requiresConsent && !input.consent && !walkIn) throw badRequest("Please read and accept the service information to continue");
  for (const f of category.bookingFields) {
    if (f.required && !walkIn && (input.fields?.[f.key] === undefined || input.fields?.[f.key] === "")) throw badRequest(`${f.label.en} is required`);
  }
  for (const id of input.addOnIds) if (!service.addOns.some((a) => a.id === id)) throw badRequest("Unknown add-on");
  if (input.paymentMethod === "online" && !ctx.payments) throw new AppError(409, "payments_inactive", "Online payment is not available yet. Please choose Pay at venue.");

  // Authoritative availability re-check (the slot list the browser saw may be stale).
  const date = zonedParts(start, provider.timezone).date;
  const sq = await getSlots(ctx, { providerId: provider._id, serviceId: service._id, date, addOnIds: input.addOnIds, staffId: input.staffId, mode: input.mode });
  const slot = sq.slots.find((s) => s.start === start.toISOString());
  if (!slot && !walkIn) throw conflict("slot_unavailable", "This time is no longer available. Please choose another time.");
  let staffId = input.staffId;
  if (!staffId && slot?.staffIds.length) staffId = slot.staffIds[0];
  if (staffId && !staff.some((s) => s._id === staffId)) throw badRequest("Unknown professional");

  // Price (server-side only) and coupon.
  const base = quote({ service, addOnIds: input.addOnIds, mode: input.mode, provider, category, platform: ctx.platform });
  let discount = 0; let couponId: string | undefined;
  if (input.couponCode && !walkIn) {
    const c = await couponDiscount(ctx, input.couponCode, actor.userId, base.basePaise + base.addOnsPaise, category._id, provider._id);
    if (!c.ok) throw badRequest(c.reason ?? "Coupon not valid");
    discount = c.discountPaise; couponId = c.coupon!._id;
  }
  const price = quote({ service, addOnIds: input.addOnIds, mode: input.mode, provider, category, platform: ctx.platform, discountPaise: discount });
  const end = new Date(start.getTime() + price.durationMin * 60000);
  const { durationMin: _d, ...priceBreakdown } = price;
  void _d;

  const bookingId = newId();
  await lockSlot(ctx, bookingId, resourceKey(provider._id, staffId), start, end, category.bookingRules.bufferMinutes);

  const customer = walkIn ? null : await ctx.repo.col<{ _id: string; name: string; phone?: string }>("users").findOne({ _id: actor.userId });
  const now = ctx.now();
  const status: BookingStatus = walkIn ? "confirmed" : "pending";
  const booking: Booking = {
    _id: bookingId, ref: humanRef("SS"),
    customerId: walkIn ? "walk-in" : actor.userId,
    customerName: walkIn ? (input.customerName?.trim() || "Walk-in customer") : customer!.name,
    customerPhone: walkIn ? input.customerPhone : customer?.phone,
    providerId: provider._id, staffId, serviceId: service._id, serviceName: service.name, categoryId: category._id,
    addOnIds: input.addOnIds, start, end, mode: input.mode,
    address: input.mode === "at_home" ? input.address : undefined,
    fields: input.fields ?? {}, notes: input.notes?.slice(0, 500),
    price: priceBreakdown, couponCode: couponId ? input.couponCode!.toUpperCase() : undefined,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentMethod === "online" ? "unpaid" : "not_required",
    status, walkIn, consentAt: input.consent ? now : undefined,
    history: [{ at: now, to: status, byUserId: actor.userId, byRole: actor.role, note: walkIn ? "Walk-in added by partner" : "Booked by customer" }],
    createdAt: now, updatedAt: now,
  };
  try {
    await ctx.repo.col<Booking>("bookings").insertOne(booking);
  } catch (e) {
    await releaseLocks(ctx, bookingId);
    throw e;
  }
  if (couponId) {
    await ctx.repo.col<{ _id: string }>("coupon_redemptions").insertOne({ _id: newId(), couponId, bookingId, userId: actor.userId, at: now } as never);
    await ctx.repo.col<Coupon>("coupons").updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
  }
  const when = fmtWhen(start, provider.timezone);
  if (!walkIn) {
    await notify(ctx, actor.userId, "booking.created.customer", { ref: booking.ref, service: service.name, when, provider: provider.businessName }, `/account/bookings/${booking._id}`);
    await notify(ctx, provider.ownerUserId, "booking.created.partner", { ref: booking.ref, service: service.name, when }, `/bookings/${booking._id}`);
  }
  await audit(ctx, actor, "booking.create", "booking", booking._id, { ref: booking.ref, walkIn });
  return booking;
}

export function fmtWhen(d: Date, tz = "Asia/Kolkata", locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

export async function getBooking(ctx: Ctx, actor: Actor, id: string): Promise<Booking> {
  const b = await ctx.repo.col<Booking>("bookings").findOne({ _id: id });
  if (!b || !canViewBooking(actor, b)) throw notFound("Booking"); // 404, not 403: don't reveal existence
  return b;
}

export async function listBookings(ctx: Ctx, actor: Actor, q: { scope?: "upcoming" | "completed" | "cancelled" | "pending" | "today" | "all"; from?: Date; to?: Date; providerId?: string; limit?: number; skip?: number }) {
  const filter: Record<string, unknown> = {};
  if (actor.role === "customer") filter.customerId = actor.userId;
  else if (actor.role === "partner_owner" || actor.role === "partner_staff") filter.providerId = actor.providerId;
  else if (actor.role === "admin") { if (q.providerId) filter.providerId = q.providerId; }
  else throw forbidden();
  const now = ctx.now();
  switch (q.scope) {
    case "upcoming": filter.status = { $in: ["pending", "confirmed", "rescheduled", "in_progress"] }; filter.end = { $gte: now }; break;
    case "pending": filter.status = "pending"; break;
    case "completed": filter.status = "completed"; break;
    case "cancelled": filter.status = { $in: ["cancelled", "no_show", "refund_pending", "refunded"] }; break;
    case "today": {
      const tz = "Asia/Kolkata"; const d = zonedParts(now, tz).date;
      const s = new Date(d + "T00:00:00+05:30"), e = new Date(s.getTime() + 86400000);
      filter.start = { $gte: s, $lt: e }; break;
    }
  }
  if (q.from || q.to) filter.start = { ...(filter.start as object), ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  const sort = q.scope === "upcoming" || q.scope === "today" || q.scope === "pending" ? { start: 1 as const } : { start: -1 as const };
  return ctx.repo.col<Booking>("bookings").find(filter, { sort, limit: Math.min(q.limit ?? 50, 200), skip: q.skip });
}

export type BookingAction = "confirm" | "reject" | "cancel" | "arrived" | "start" | "complete" | "no_show";

export async function actOnBooking(ctx: Ctx, actor: Actor, id: string, action: BookingAction, note?: string): Promise<Booking> {
  const b = await getBooking(ctx, actor, id);
  if (actor.role === "partner_staff" && (action === "reject")) throw forbidden("Only the owner can reject bookings");
  const who = actorKind(actor);
  const now = ctx.now();
  const target: Record<BookingAction, BookingStatus | null> = { confirm: "confirmed", reject: "cancelled", cancel: "cancelled", arrived: null, start: "in_progress", complete: "completed", no_show: "no_show" };
  const to = target[action];

  if (action === "arrived") {
    if (who !== "partner" && who !== "admin") throw forbidden();
    if (!["confirmed", "rescheduled"].includes(b.status)) throw conflict("bad_state", "Only confirmed bookings can be marked as arrived");
    return (await ctx.repo.col<Booking>("bookings").updateOne({ _id: b._id }, { $set: { arrivedAt: now, updatedAt: now } }))!;
  }
  if (action === "reject" && b.status !== "pending") throw conflict("bad_state", "Only new (pending) bookings can be rejected");
  if (action === "no_show" && now < b.start) throw conflict("too_early", "You can mark no-show only after the appointment time");
  if (action === "complete" && b.status !== "in_progress") throw conflict("bad_state", "Start the service before completing it");
  if (!to || !canTransition(b.status, to, who)) throw conflict("bad_transition", `A ${b.status.replace("_", " ")} booking cannot be changed this way`);

  const set: Record<string, unknown> = { status: to, updatedAt: now };
  if (to === "in_progress") set.startedAt = now;
  if (to === "completed") set.completedAt = now;
  if (to === "cancelled") {
    set.cancelledAt = now;
    set.cancellationReason = note?.slice(0, 300) || (action === "reject" ? "Declined by provider" : undefined);
    const category = await ctx.repo.col<Category>("categories").findOne({ _id: b.categoryId });
    set.cancellationFeePaise = category ? cancellationFee(category.cancellationPolicy, b.price.basePaise + b.price.addOnsPaise, b.start, now, who !== "customer") : 0;
    // Symmetry (Consumer Protection (E-Commerce) Rules 2020): a provider cancelling a confirmed booking late bears an equivalent charge, shown on their statement.
    if (who === "partner" && action === "cancel" && category && b.status !== "pending") set.providerPenaltyPaise = cancellationFee(category.cancellationPolicy, b.price.basePaise + b.price.addOnsPaise, b.start, now, false);
  }
  // Optimistic concurrency: only update if status is still what we read.
  const updated = await ctx.repo.col<Booking>("bookings").updateOne({ _id: b._id, status: b.status }, { $set: set, $push: { history: { at: now, from: b.status, to, byUserId: actor.userId, byRole: actor.role, note } } });
  if (!updated) throw conflict("stale", "This booking was just changed. Please refresh.");
  if (to === "cancelled" || to === "no_show" || to === "completed") await releaseLocks(ctx, b._id);
  if (to === "cancelled" && b.paymentStatus === "captured") {
    await ctx.repo.col<Booking>("bookings").updateOne({ _id: b._id }, { $set: { status: "refund_pending" }, $push: { history: { at: now, from: "cancelled", to: "refund_pending", byRole: "system", note: "Paid booking cancelled — refund queued for review" } } });
    await ctx.repo.col<{ _id: string }>("refunds").insertOne({ _id: newId(), bookingId: b._id, paymentId: "", amountPaise: Math.max(0, b.price.totalPaise - (set.cancellationFeePaise as number)), status: "requested", reason: "Booking cancelled", requestedBy: actor.userId, createdAt: now, updatedAt: now } as never);
  }

  const provider = await ctx.repo.col<Provider>("providers").findOne({ _id: b.providerId });
  const when = fmtWhen(b.start, provider?.timezone);
  if (b.customerId !== "walk-in") {
    if (to === "confirmed") await notify(ctx, b.customerId, "booking.confirmed.customer", { ref: b.ref, when, provider: provider?.businessName ?? "" }, `/account/bookings/${b._id}`);
    if (to === "cancelled" && who !== "customer") await notify(ctx, b.customerId, "booking.cancelled.customer", { ref: b.ref, when, reason: note ?? "" }, `/account/bookings/${b._id}`);
    if (to === "completed") await notify(ctx, b.customerId, "booking.completed.customer", { service: b.serviceName, provider: provider?.businessName ?? "" }, `/account/bookings/${b._id}`);
  }
  if (to === "cancelled" && who === "customer" && provider) await notify(ctx, provider.ownerUserId, "booking.cancelled.partner", { ref: b.ref, service: b.serviceName, when }, `/bookings/${b._id}`);
  await audit(ctx, actor, `booking.${action}`, "booking", b._id, { from: b.status, to });
  return (await ctx.repo.col<Booking>("bookings").findOne({ _id: b._id }))!;
}

export async function reschedule(ctx: Ctx, actor: Actor, id: string, newStartIso: string, staffId?: string): Promise<Booking> {
  const b = await getBooking(ctx, actor, id);
  const who = actorKind(actor);
  // A pending booking stays pending (the partner still has to accept the new time).
  const nextStatus: BookingStatus = b.status === "pending" ? "pending" : "rescheduled";
  if (b.status === "pending" ? who === "system" : !canTransition(b.status, "rescheduled", who)) throw conflict("bad_transition", "This booking cannot be rescheduled");
  const { provider, service, category } = await loadBookable(ctx, b.providerId, b.serviceId);
  if (who === "customer" && (b.start.getTime() - ctx.now().getTime()) / 3_600_000 < category.cancellationPolicy.freeUntilHours) {
    throw conflict("too_late", `Changes are allowed up to ${category.cancellationPolicy.freeUntilHours} hours before the appointment. Please contact the provider.`);
  }
  const start = new Date(newStartIso);
  if (Number.isNaN(start.getTime())) throw badRequest("Invalid time");
  const date = zonedParts(start, provider.timezone).date;
  const sq = await getSlots(ctx, { providerId: provider._id, serviceId: service._id, date, addOnIds: b.addOnIds, staffId: staffId ?? b.staffId, mode: b.mode, excludeBookingId: b._id });
  const slot = sq.slots.find((s) => s.start === start.toISOString());
  if (!slot) throw conflict("slot_unavailable", "This time is not available. Please choose another time.");
  const newStaff = staffId ?? (b.staffId && slot.staffIds.includes(b.staffId) ? b.staffId : slot.staffIds[0]);
  const end = new Date(start.getTime() + (b.end.getTime() - b.start.getTime()));
  const resource = resourceKey(provider._id, newStaff);

  // Swap locks safely: add only the units we don't already hold, then drop the old ones.
  const locks = ctx.repo.col<Lock>("slot_locks");
  const own = await locks.find({ bookingId: b._id });
  const ownKeys = new Set(own.map((l) => `${l.resource}|${l.unit}`));
  const wanted = lockUnits(start, end, category.bookingRules.bufferMinutes);
  const wantedKeys = new Set(wanted.map((u) => `${resource}|${u}`));
  const tmp = newId();
  try {
    await locks.insertManyAtomic(wanted.filter((u) => !ownKeys.has(`${resource}|${u}`)).map((unit) => ({ _id: newId(), resource, unit, bookingId: tmp })));
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw conflict("slot_taken", "Sorry, this time was just booked by someone else. Please choose another time.");
    throw e;
  }
  for (const l of own) if (!wantedKeys.has(`${l.resource}|${l.unit}`)) await locks.deleteOne({ _id: l._id });
  await locks.updateMany({ bookingId: tmp }, { $set: { bookingId: b._id } });

  const now = ctx.now();
  const updated = await ctx.repo.col<Booking>("bookings").updateOne({ _id: b._id }, {
    $set: { start, end, staffId: newStaff, status: nextStatus, updatedAt: now },
    $push: { history: { at: now, from: b.status, to: nextStatus, byUserId: actor.userId, byRole: actor.role, note: `Moved from ${b.start.toISOString()}` } },
  });
  const when = fmtWhen(start, provider.timezone);
  if (who !== "customer" && b.customerId !== "walk-in") await notify(ctx, b.customerId, "booking.rescheduled.customer", { ref: b.ref, when }, `/account/bookings/${b._id}`);
  if (who === "customer") await notify(ctx, provider.ownerUserId, "booking.rescheduled.partner", { ref: b.ref, service: b.serviceName, when }, `/bookings/${b._id}`);
  await audit(ctx, actor, "booking.reschedule", "booking", b._id, { from: b.start, to: start });
  return updated!;
}

/** Strips private fields for list views where the full address isn't needed. */
export function bookingSummary(b: Booking) {
  const { address, history: _h, ...rest } = b;
  void _h;
  return { ...rest, area: address ? `${address.locality ?? ""} ${address.pin}`.trim() : undefined, total: formatINR(b.price.totalPaise) };
}
