import type { Repo } from "./repo";
import type { PlatformPricing } from "./pricing";
import type { Actor, AuditEvent, Role } from "./types";
import { newId } from "./util";

export interface PaymentGateway {
  name: "razorpay";
  keyId: string; // public key id (safe to send to the browser)
  createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<{ id: string; amount: number; currency: string }>;
  refund(input: { paymentId: string; amountPaise: number; notes?: Record<string, string> }): Promise<{ id: string; status: string }>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

export type Channel = "email" | "sms" | "whatsapp" | "push";
export interface ChannelSender {
  channel: Channel;
  configured: boolean;
  send(to: { email?: string; phone?: string; pushSubscriptions?: unknown[] }, msg: { subject: string; text: string; templateKey: string; locale: string; vars: Record<string, string> }): Promise<{ ok: boolean; providerMessageId?: string; error?: string }>;
}

export interface Ctx {
  repo: Repo;
  now(): Date;
  authSecret: string;
  platform: PlatformPricing;
  urls: { customer: string; partner: string; admin: string; api: string };
  payments: PaymentGateway | null; // null = online payments inactive (credentials not configured)
  senders: ChannelSender[]; // only configured senders actually send
  /** Optional hook after an in-app notification is stored (used for browser push). */
  afterNotify?: (n: { userId: string; title: string; body: string; link?: string }) => Promise<void>;
}

export async function audit(ctx: Ctx, actor: Actor | "system", action: string, entity: string, entityId?: string, details?: Record<string, unknown>, ip?: string) {
  const ev: AuditEvent = {
    _id: newId(),
    at: ctx.now(),
    actorUserId: actor === "system" ? undefined : actor.userId,
    actorRole: actor === "system" ? "system" : (actor.role as Role),
    action, entity, entityId, details, ip,
  };
  await ctx.repo.col<AuditEvent>("audit_events").insertOne(ev);
}
