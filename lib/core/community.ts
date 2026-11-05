import type { Ctx } from "./context";
import { audit } from "./context";
import { DuplicateKeyError } from "./repo";
import type { Actor, Booking, Provider, Review, Role, SupportTicket, User } from "./types";
import { badRequest, conflict, forbidden, humanRef, newId, notFound } from "./util";

// ---------------- Reviews: only from a real, completed booking, one per booking ----------------
export async function createReview(ctx: Ctx, actor: Actor, input: { bookingId: string; rating: number; text?: string }) {
  if (actor.role !== "customer") throw forbidden();
  const b = await ctx.repo.col<Booking>("bookings").findOne({ _id: input.bookingId, customerId: actor.userId });
  if (!b) throw notFound("Booking");
  if (b.status !== "completed") throw conflict("not_completed", "You can review a booking after the service is completed");
  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) throw badRequest("Rating must be 1 to 5");
  const r: Review = { _id: newId(), bookingId: b._id, customerId: actor.userId, customerName: b.customerName, providerId: b.providerId, serviceId: b.serviceId, rating: rating as Review["rating"], text: input.text?.trim().slice(0, 1000) || undefined, status: "published", createdAt: ctx.now() };
  try { await ctx.repo.col<Review>("reviews").insertOne(r); }
  catch (e) { if (e instanceof DuplicateKeyError) throw conflict("already_reviewed", "You have already reviewed this booking"); throw e; }
  await ctx.repo.col<Booking>("bookings").updateOne({ _id: b._id }, { $set: { reviewId: r._id } });
  await recomputeRating(ctx, b.providerId);
  return r;
}

export async function recomputeRating(ctx: Ctx, providerId: string) {
  const rs = await ctx.repo.col<Review>("reviews").find({ providerId, status: "published" });
  const avg = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
  await ctx.repo.col<Provider>("providers").updateOne({ _id: providerId }, { $set: { ratingAvg: avg, ratingCount: rs.length } });
}

export async function replyToReview(ctx: Ctx, actor: Actor, reviewId: string, text: string) {
  if (actor.role !== "partner_owner") throw forbidden();
  const r = await ctx.repo.col<Review>("reviews").findOne({ _id: reviewId, providerId: actor.providerId });
  if (!r) throw notFound("Review");
  return ctx.repo.col<Review>("reviews").updateOne({ _id: r._id }, { $set: { reply: { text: text.trim().slice(0, 600), at: ctx.now() } } });
}

export async function moderateReview(ctx: Ctx, actor: Actor, reviewId: string, status: Review["status"]) {
  if (actor.role !== "admin") throw forbidden();
  const r = await ctx.repo.col<Review>("reviews").updateOne({ _id: reviewId }, { $set: { status } });
  if (!r) throw notFound("Review");
  await recomputeRating(ctx, r.providerId);
  await audit(ctx, actor, `review.${status}`, "review", reviewId);
  return r;
}

// ---------------- Support tickets ----------------
export async function openTicket(ctx: Ctx, actor: Actor, input: { subject: string; category: SupportTicket["category"]; text: string; bookingId?: string; priority?: SupportTicket["priority"] }) {
  if (!input.subject.trim() || !input.text.trim()) throw badRequest("Please describe the problem");
  if (input.bookingId) {
    const b = await ctx.repo.col<Booking>("bookings").findOne({ _id: input.bookingId });
    const mine = b && (b.customerId === actor.userId || b.providerId === actor.providerId);
    if (!mine) throw notFound("Booking");
  }
  const now = ctx.now();
  const t: SupportTicket = {
    _id: newId(), ref: humanRef("TK"), userId: actor.userId, role: actor.role, subject: input.subject.trim().slice(0, 140), category: input.category, bookingId: input.bookingId,
    status: "open", priority: input.category === "safety" ? "urgent" : input.priority ?? "normal",
    messages: [{ at: now, byUserId: actor.userId, byRole: actor.role, text: input.text.trim().slice(0, 4000) }], createdAt: now, updatedAt: now,
  };
  await ctx.repo.col<SupportTicket>("tickets").insertOne(t);
  return t;
}
export async function addTicketMessage(ctx: Ctx, actor: Actor, ticketId: string, text: string, status?: SupportTicket["status"]) {
  const t = await ctx.repo.col<SupportTicket>("tickets").findOne({ _id: ticketId });
  if (!t || (actor.role !== "admin" && t.userId !== actor.userId)) throw notFound("Ticket");
  const now = ctx.now();
  const set: Record<string, unknown> = { updatedAt: now, status: actor.role === "admin" ? status ?? "pending" : "open" };
  return ctx.repo.col<SupportTicket>("tickets").updateOne({ _id: t._id }, { $set: set, $push: { messages: { at: now, byUserId: actor.userId, byRole: actor.role as Role, text: text.trim().slice(0, 4000) } } });
}

// ---------------- Favourites & account ----------------
export async function toggleFavourite(ctx: Ctx, actor: Actor, providerId: string, on: boolean) {
  if (actor.role !== "customer") throw forbidden();
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: providerId, status: "approved" });
  if (!p) throw notFound("Provider");
  await ctx.repo.col<User>("users").updateOne({ _id: actor.userId }, on ? { $addToSet: { favourites: providerId } } : { $pull: { favourites: providerId } });
}

/** Account deletion: we disable login immediately, keep records the law requires (e.g. invoices) and anonymise the rest after review. */
export async function requestAccountDeletion(ctx: Ctx, actor: Actor, reason?: string) {
  const now = ctx.now();
  await ctx.repo.col<User>("users").updateOne({ _id: actor.userId }, { $set: { status: "deletion_requested", updatedAt: now } });
  await ctx.repo.col<{ _id: string }>("deletion_requests").insertOne({ _id: newId(), userId: actor.userId, reason: reason?.slice(0, 500), status: "pending", createdAt: now } as never);
  await ctx.repo.col<{ _id: string }>("sessions").deleteMany({ userId: actor.userId });
  await audit(ctx, actor, "account.deletion_requested", "user", actor.userId);
}
