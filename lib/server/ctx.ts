import webpush, { type PushSubscription } from "web-push";
import type { ChannelSender, Ctx } from "@/lib/core/context";
import { razorpayFromEnv } from "@/lib/core/payments";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "@/lib/core/security";
import type { PlatformPricing } from "@/lib/core/pricing";
import { MongoRepo } from "./mongo-repo";

/**
 * Builds the server context from environment variables.
 * Every integration is optional: when its credentials are missing it is reported as inactive
 * (Admin → Integrations) and nothing pretends to have been sent or paid.
 */
const env = process.env;
const g = globalThis as unknown as { __ssRepo?: MongoRepo; __ssPricing?: { at: number; v: PlatformPricing } };

// ---------- Email: Resend HTTP API ----------
const email: ChannelSender = {
  channel: "email",
  configured: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
  async send(to, m) {
    if (!to.email) return { ok: false, error: "no email" };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to.email], subject: m.subject, text: `${m.text}\n\n— Saj Saathi` }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { ok: true, providerMessageId: j.id } : { ok: false, error: j.message ?? `HTTP ${res.status}` };
  },
};

// ---------- SMS: MSG91 Flow API (DLT-registered templates are mandatory in India) ----------
const sms: ChannelSender = {
  channel: "sms",
  configured: !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID),
  async send(to, m) {
    if (!to.phone) return { ok: false, error: "no phone" };
    const res = await fetch("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: { authkey: env.MSG91_AUTH_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: env.MSG91_TEMPLATE_ID, short_url: "0", recipients: [{ mobiles: to.phone.replace("+", ""), message: m.text.slice(0, 300) }] }),
    });
    const j = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    return res.ok && j.type !== "error" ? { ok: true, providerMessageId: j.message } : { ok: false, error: j.message ?? `HTTP ${res.status}` };
  },
};

// ---------- WhatsApp: Meta Cloud API with pre-approved templates ----------
const whatsapp: ChannelSender = {
  channel: "whatsapp",
  configured: !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID),
  async send(to, m) {
    if (!to.phone) return { ok: false, error: "no phone" };
    const repo = getRepo();
    const tpl = await repo.col<{ _id: string; name: string; language: string; eventKey: string; variables?: string[]; status: string }>("whatsapp_templates").findOne({ eventKey: m.templateKey, language: m.locale === "hi" ? "hi" : "en", status: "approved" });
    if (!tpl) return { ok: false, error: `No approved WhatsApp template for ${m.templateKey}` };
    const params = (tpl.variables ?? []).map((k) => ({ type: "text", text: m.vars[k] ?? "" }));
    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.phone.replace("+", ""), type: "template", template: { name: tpl.name, language: { code: tpl.language }, components: params.length ? [{ type: "body", parameters: params }] : [] } }),
    });
    const j = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
    return res.ok ? { ok: true, providerMessageId: j.messages?.[0]?.id } : { ok: false, error: j.error?.message ?? `HTTP ${res.status}` };
  },
};

// ---------- Browser push: Web Push with VAPID ----------
const pushConfigured = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
if (pushConfigured) webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
export async function sendPushToUser(userId: string, payload: { title: string; body: string; link?: string }) {
  if (!pushConfigured) return;
  const subs = await getRepo().col<{ _id: string; userId: string; subscription: PushSubscription }>("push_subscriptions").find({ userId });
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 3600 }); }
    catch (e) { if ((e as { statusCode?: number }).statusCode === 410 || (e as { statusCode?: number }).statusCode === 404) await getRepo().col("push_subscriptions").deleteOne({ _id: s._id }); }
  }));
}

export function getRepo(): MongoRepo {
  if (!g.__ssRepo) {
    const repo = new MongoRepo();
    g.__ssRepo = repo;
    // A rejected connection must not remain cached for the lifetime of a warm
    // serverless instance. A later request can retry after Atlas is corrected.
    void repo.raw().catch((error) => {
      if (g.__ssRepo === repo) g.__ssRepo = undefined;
      console.error("[Saj Saathi] MongoDB repository connection failed:", error);
    });
  }
  return g.__ssRepo!;
}

async function platformPricing(): Promise<PlatformPricing> {
  if (g.__ssPricing && Date.now() - g.__ssPricing.at < 60_000) return g.__ssPricing.v;
  const s = await getRepo().col<{ _id: string; bookingFeePaise?: number; bookingFeeTaxPercent?: number; defaultCommissionPercent?: number }>("settings").findOne({ _id: "platform" });
  const v = { bookingFeePaise: s?.bookingFeePaise ?? 0, bookingFeeTaxPercent: s?.bookingFeeTaxPercent ?? 18, defaultCommissionPercent: s?.defaultCommissionPercent ?? 10 };
  g.__ssPricing = { at: Date.now(), v };
  return v;
}

export const payments = razorpayFromEnv(env, { payment: verifyRazorpayPaymentSignature, webhook: verifyRazorpayWebhookSignature });

export function integrationStatus() {
  return [
    { key: "mongodb", name: "MongoDB Atlas", active: !!env.MONGODB_URI, needs: ["MONGODB_URI", "MONGODB_DB"] },
    { key: "razorpay", name: "Razorpay payments", active: !!payments, needs: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] },
    { key: "email", name: "Email (Resend)", active: email.configured, needs: ["RESEND_API_KEY", "EMAIL_FROM"] },
    { key: "sms", name: "SMS (MSG91, DLT template)", active: sms.configured, needs: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"] },
    { key: "whatsapp", name: "WhatsApp Business (Meta Cloud API)", active: whatsapp.configured, needs: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"] },
    { key: "push", name: "Browser push (Web Push / VAPID)", active: pushConfigured, needs: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "NEXT_PUBLIC_VAPID_PUBLIC_KEY"] },
    { key: "auth", name: "Session signing secret", active: (env.AUTH_SECRET ?? "").length >= 32, needs: ["AUTH_SECRET"] },
  ];
}

export async function getCtx(): Promise<Ctx> {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) throw new Error("AUTH_SECRET must be set (32+ random characters). See START-HERE.md.");
  const customerUrl = env.NEXT_PUBLIC_CUSTOMER_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000");
  return {
    repo: getRepo(),
    now: () => new Date(),
    authSecret: env.AUTH_SECRET,
    platform: await platformPricing(),
    urls: {
      customer: customerUrl,
      partner: env.NEXT_PUBLIC_PARTNER_URL || (env.NODE_ENV === "development" ? "http://localhost:3001" : ""),
      admin: env.NEXT_PUBLIC_ADMIN_URL || `${customerUrl}/admin`,
      api: env.NEXT_PUBLIC_API_URL || `${customerUrl}/api/v1`,
    },
    payments,
    senders: [email, sms, whatsapp],
    afterNotify: pushConfigured ? (n) => sendPushToUser(n.userId, n) : undefined,
  };
}
