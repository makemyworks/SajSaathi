import { createHmac } from "node:crypto";
import type { Ctx, PaymentGateway } from "../lib/core/context";
import { MemoryRepo } from "../lib/core/repo";
import { seedBase } from "../lib/core/seed";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "../lib/core/security";

export const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";

/** Test double that behaves like Razorpay's API contract (order ids, refunds) without network access. */
export function fakeGateway(keySecret = "rzp_test_secret", webhookSecret = "whsec_test"): PaymentGateway & { orders: { id: string; amount: number }[]; refunds: { id: string; paymentId: string; amount: number }[]; sign(o: string, p: string): string; signWebhook(b: string): string } {
  const orders: { id: string; amount: number }[] = [];
  const refunds: { id: string; paymentId: string; amount: number }[] = [];
  return {
    name: "razorpay", keyId: "rzp_test_key", orders, refunds,
    async createOrder(i) { const o = { id: `order_${orders.length + 1}`, amount: i.amountPaise }; orders.push(o); return { ...o, currency: "INR" }; },
    async refund(i) { const r = { id: `rfnd_${refunds.length + 1}`, paymentId: i.paymentId, amount: i.amountPaise }; refunds.push(r); return { id: r.id, status: "pending" }; },
    verifyPaymentSignature: (o, p, s) => verifyRazorpayPaymentSignature(o, p, s, keySecret),
    verifyWebhookSignature: (b, s) => verifyRazorpayWebhookSignature(b, s, webhookSecret),
    sign: (o, p) => createHmac("sha256", keySecret).update(`${o}|${p}`).digest("hex"),
    signWebhook: (b) => createHmac("sha256", webhookSecret).update(b).digest("hex"),
  };
}

export async function makeCtx(now = new Date("2026-11-02T03:30:00Z") /* Mon 09:00 IST */, withPayments = false) {
  let clock = now;
  const gw = withPayments ? fakeGateway() : null;
  const sent: { channel: string; to: unknown; subject: string }[] = [];
  const ctx: Ctx = {
    repo: new MemoryRepo(),
    now: () => clock,
    authSecret: TEST_SECRET,
    platform: { bookingFeePaise: 1000, bookingFeeTaxPercent: 18, defaultCommissionPercent: 10 },
    urls: { customer: "http://c", partner: "http://p", admin: "http://a", api: "http://c/api/v1" },
    payments: gw,
    senders: [
      { channel: "email", configured: true, send: async (to, m) => { sent.push({ channel: "email", to, subject: m.subject }); return { ok: true, providerMessageId: `m${sent.length}` }; } },
      { channel: "sms", configured: false, send: async () => ({ ok: false }) },
    ],
  };
  await seedBase(ctx);
  return { ctx, gw, sent, setNow: (d: Date) => { clock = d; } };
}
