import type { Ctx } from "./context";
import { audit } from "./context";
import { notify } from "./notifications";
import { DuplicateKeyError } from "./repo";
import type { Actor, Booking, Payment, Refund } from "./types";
import { AppError, badRequest, conflict, forbidden, formatINR, newId, notFound } from "./util";

/**
 * Razorpay flow (Orders API + Standard Checkout):
 * 1. Server creates an order for the server-computed booking total  → createPaymentOrder
 * 2. Browser opens Checkout with the order id and the public key id
 * 3. Browser posts razorpay_order_id / payment_id / signature back  → verifyCheckout (signature checked with key secret)
 *    This marks the payment "authorized" only; it is NOT shown as paid yet.
 * 4. Razorpay webhook payment.captured (signature checked with webhook secret, deduplicated by event id)
 *    is the only thing that marks the payment "captured".
 */
function requireGateway(ctx: Ctx) {
  if (!ctx.payments) throw new AppError(409, "payments_inactive", "Online payments are not configured yet");
  return ctx.payments;
}

export async function createPaymentOrder(ctx: Ctx, actor: Actor, bookingId: string) {
  const gw = requireGateway(ctx);
  const b = await ctx.repo.col<Booking>("bookings").findOne({ _id: bookingId });
  if (!b || b.customerId !== actor.userId) throw notFound("Booking");
  if (b.paymentMethod !== "online") throw badRequest("This booking is pay-at-venue");
  if (["captured", "authorized"].includes(b.paymentStatus)) throw conflict("already_paid", "This booking is already paid");
  if (["cancelled", "refunded", "refund_pending", "no_show"].includes(b.status)) throw conflict("bad_state", "This booking can no longer be paid");
  // Idempotent: reuse an open order for the same booking & amount.
  const existing = await ctx.repo.col<Payment>("payments").findOne({ bookingId: b._id, status: "created", amountPaise: b.price.totalPaise });
  if (existing) return { orderId: existing.gatewayOrderId, amountPaise: existing.amountPaise, currency: existing.currency, keyId: gw.keyId, bookingRef: b.ref };
  const order = await gw.createOrder({ amountPaise: b.price.totalPaise, receipt: b.ref, notes: { bookingId: b._id, bookingRef: b.ref } });
  if (order.amount !== b.price.totalPaise) throw new AppError(502, "gateway_mismatch", "Payment gateway returned a different amount");
  const now = ctx.now();
  const p: Payment = { _id: newId(), bookingId: b._id, customerId: b.customerId, providerId: b.providerId, gateway: gw.name, gatewayOrderId: order.id, amountPaise: order.amount, currency: order.currency, status: "created", refundedPaise: 0, createdAt: now, updatedAt: now };
  await ctx.repo.col<Payment>("payments").insertOne(p);
  await ctx.repo.col<Booking>("bookings").updateOne({ _id: b._id }, { $set: { paymentStatus: "created", updatedAt: now } });
  return { orderId: order.id, amountPaise: order.amount, currency: order.currency, keyId: gw.keyId, bookingRef: b.ref };
}

export async function verifyCheckout(ctx: Ctx, actor: Actor, input: { orderId: string; paymentId: string; signature: string }) {
  const gw = requireGateway(ctx);
  const p = await ctx.repo.col<Payment>("payments").findOne({ gatewayOrderId: input.orderId });
  if (!p || p.customerId !== actor.userId) throw notFound("Payment");
  if (!gw.verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
    await audit(ctx, actor, "payment.signature_invalid", "payment", p._id);
    throw new AppError(400, "invalid_signature", "We could not verify this payment. If money was deducted, it will be confirmed or refunded automatically.");
  }
  if (p.status === "created") {
    await ctx.repo.col<Payment>("payments").updateOne({ _id: p._id, status: "created" }, { $set: { status: "authorized", gatewayPaymentId: input.paymentId, updatedAt: ctx.now() } });
    await ctx.repo.col<Booking>("bookings").updateOne({ _id: p.bookingId, paymentStatus: { $in: ["created", "unpaid", "failed"] } }, { $set: { paymentStatus: "authorized" } });
  }
  return { status: "verifying" as const, message: "Payment received by the gateway. Final confirmation usually takes a few seconds." };
}

type WebhookEvent = { event: string; payload: { payment?: { entity: { id: string; order_id: string; amount: number; status: string; method?: string; error_description?: string } }; refund?: { entity: { id: string; payment_id: string; amount: number; status: string } } } };

export async function handleRazorpayWebhook(ctx: Ctx, rawBody: string, signature: string | null, eventId: string | null): Promise<{ handled: boolean; duplicate?: boolean }> {
  const gw = requireGateway(ctx);
  if (!signature || !gw.verifyWebhookSignature(rawBody, signature)) throw new AppError(401, "invalid_signature", "Invalid webhook signature");
  const ev = JSON.parse(rawBody) as WebhookEvent;
  const id = eventId || `${ev.event}:${ev.payload.payment?.entity.id ?? ev.payload.refund?.entity.id}`;
  try {
    await ctx.repo.col<{ _id: string; eventId: string; event: string; at: Date }>("webhook_events").insertOne({ _id: newId(), eventId: id, event: ev.event, at: ctx.now() });
  } catch (e) {
    if (e instanceof DuplicateKeyError) return { handled: true, duplicate: true };
    throw e;
  }
  const now = ctx.now();
  const payments = ctx.repo.col<Payment>("payments");
  const bookings = ctx.repo.col<Booking>("bookings");

  if (ev.event === "payment.captured" || ev.event === "payment.failed" || ev.event === "payment.authorized") {
    const pe = ev.payload.payment!.entity;
    const p = await payments.findOne({ gatewayOrderId: pe.order_id });
    if (!p) return { handled: false };
    if (pe.amount !== p.amountPaise) {
      await audit(ctx, "system", "payment.amount_mismatch", "payment", p._id, { expected: p.amountPaise, got: pe.amount });
      return { handled: false };
    }
    if (ev.event === "payment.captured") {
      const receiptNo = `RCPT-${now.getUTCFullYear()}-${p._id.slice(-8).toUpperCase()}`;
      await payments.updateOne({ _id: p._id }, { $set: { status: "captured", gatewayPaymentId: pe.id, method: pe.method, receiptNo, updatedAt: now } });
      const b = await bookings.updateOne({ _id: p.bookingId }, { $set: { paymentStatus: "captured", updatedAt: now } });
      if (b) await notify(ctx, b.customerId, "payment.captured.customer", { amount: formatINR(p.amountPaise), ref: b.ref }, `/account/payments`);
    } else if (ev.event === "payment.failed") {
      if (p.status !== "captured") {
        await payments.updateOne({ _id: p._id }, { $set: { status: "failed", gatewayPaymentId: pe.id, failureReason: pe.error_description?.slice(0, 200), updatedAt: now } });
        await bookings.updateOne({ _id: p.bookingId, paymentStatus: { $ne: "captured" } }, { $set: { paymentStatus: "failed" } });
      }
    } else if (p.status === "created") {
      await payments.updateOne({ _id: p._id }, { $set: { status: "authorized", gatewayPaymentId: pe.id, updatedAt: now } });
    }
    await audit(ctx, "system", `webhook.${ev.event}`, "payment", p._id);
    return { handled: true };
  }
  if (ev.event === "refund.processed" || ev.event === "refund.failed") {
    const re = ev.payload.refund!.entity;
    const r = await ctx.repo.col<Refund>("refunds").findOne({ gatewayRefundId: re.id });
    if (!r) return { handled: false };
    if (ev.event === "refund.processed") {
      await ctx.repo.col<Refund>("refunds").updateOne({ _id: r._id }, { $set: { status: "processed", updatedAt: now } });
      const p = await payments.updateOne({ _id: r.paymentId }, { $inc: { refundedPaise: r.amountPaise }, $set: { updatedAt: now } });
      if (p) await payments.updateOne({ _id: p._id }, { $set: { status: p.refundedPaise >= p.amountPaise ? "refunded" : "partially_refunded" } });
      const b = await bookings.updateOne({ _id: r.bookingId }, { $set: { status: "refunded", paymentStatus: "refunded", updatedAt: now }, $push: { history: { at: now, from: "refund_pending", to: "refunded", byRole: "system", note: "Refund processed by gateway" } } });
      if (b) await notify(ctx, b.customerId, "refund.processed.customer", { amount: formatINR(r.amountPaise), ref: b.ref }, `/account/payments`);
    } else {
      await ctx.repo.col<Refund>("refunds").updateOne({ _id: r._id }, { $set: { status: "failed", updatedAt: now } });
    }
    return { handled: true };
  }
  return { handled: false };
}

/** Admin approves (and starts) or rejects a refund request. The gateway webhook confirms completion. */
export async function decideRefund(ctx: Ctx, actor: Actor, refundId: string, decision: "approve" | "reject", amountPaise?: number) {
  if (actor.role !== "admin") throw forbidden();
  const r = await ctx.repo.col<Refund>("refunds").findOne({ _id: refundId });
  if (!r) throw notFound("Refund");
  if (r.status !== "requested") throw conflict("bad_state", "This refund was already decided");
  const now = ctx.now();
  if (decision === "reject") {
    await ctx.repo.col<Refund>("refunds").updateOne({ _id: r._id }, { $set: { status: "rejected", decidedBy: actor.userId, updatedAt: now } });
    await audit(ctx, actor, "refund.reject", "refund", r._id);
    return;
  }
  const p = await ctx.repo.col<Payment>("payments").findOne({ bookingId: r.bookingId, status: { $in: ["captured", "partially_refunded"] } });
  if (!p || !p.gatewayPaymentId) throw conflict("not_paid", "No captured payment to refund");
  const amount = Math.min(amountPaise ?? r.amountPaise, p.amountPaise - p.refundedPaise);
  if (amount <= 0) throw badRequest("Nothing left to refund");
  const gw = requireGateway(ctx);
  const res = await gw.refund({ paymentId: p.gatewayPaymentId, amountPaise: amount, notes: { refundId: r._id } });
  await ctx.repo.col<Refund>("refunds").updateOne({ _id: r._id }, { $set: { status: "processing", gatewayRefundId: res.id, paymentId: p._id, amountPaise: amount, decidedBy: actor.userId, updatedAt: now } });
  await ctx.repo.col<Payment>("payments").updateOne({ _id: p._id }, { $set: { status: "refund_pending", updatedAt: now } });
  await audit(ctx, actor, "refund.approve", "refund", r._id, { amount });
}

/** Builds a Razorpay gateway from env. Returns null (inactive) when credentials are missing. */
export function razorpayFromEnv(env: Record<string, string | undefined>, verify: { payment: (o: string, p: string, s: string, secret: string) => boolean; webhook: (b: string, s: string, secret: string) => boolean }) {
  const keyId = env.RAZORPAY_KEY_ID, keySecret = env.RAZORPAY_KEY_SECRET, webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!keyId || !keySecret || !webhookSecret) return null;
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const call = async (path: string, body: unknown) => {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new AppError(502, "gateway_error", String((json.error as { description?: string })?.description ?? "Payment gateway error"));
    return json;
  };
  return {
    name: "razorpay" as const,
    keyId,
    async createOrder(i: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
      const o = await call("/orders", { amount: i.amountPaise, currency: "INR", receipt: i.receipt, notes: i.notes });
      return { id: String(o.id), amount: Number(o.amount), currency: String(o.currency) };
    },
    async refund(i: { paymentId: string; amountPaise: number; notes?: Record<string, string> }) {
      const r = await call(`/payments/${encodeURIComponent(i.paymentId)}/refund`, { amount: i.amountPaise, speed: "normal", notes: i.notes });
      return { id: String(r.id), status: String(r.status) };
    },
    verifyPaymentSignature: (o: string, p: string, s: string) => verify.payment(o, p, s, keySecret),
    verifyWebhookSignature: (b: string, s: string) => verify.webhook(b, s, webhookSecret),
  };
}
