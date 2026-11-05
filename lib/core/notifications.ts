import type { Ctx } from "./context";
import type { NotificationDoc, User } from "./types";
import { newId } from "./util";

/**
 * Bilingual notification templates. Admins can override any template from the admin console
 * (stored in `templates` collection with the same key); these are the defaults.
 * {{var}} placeholders are filled from the vars object.
 */
export const DEFAULT_TEMPLATES: Record<string, { en: { title: string; body: string }; hi: { title: string; body: string }; link?: string }> = {
  "booking.created.customer": {
    en: { title: "Booking request received", body: "Your booking {{ref}} for {{service}} on {{when}} has been sent to {{provider}}. We will tell you when it is confirmed." },
    hi: { title: "बुकिंग अनुरोध मिल गया", body: "{{when}} को {{service}} के लिए आपकी बुकिंग {{ref}} {{provider}} को भेज दी गई है। पुष्टि होते ही हम आपको बताएंगे।" },
  },
  "booking.created.partner": {
    en: { title: "New booking", body: "New booking received. Tap to see the customer, service and time. ({{service}}, {{when}})" },
    hi: { title: "नई बुकिंग", body: "नया बुकिंग मिला है। ग्राहक, सर्विस और समय देखने के लिए यहां क्लिक करें। ({{service}}, {{when}})" },
  },
  "booking.confirmed.customer": {
    en: { title: "Booking confirmed", body: "{{provider}} confirmed your booking {{ref}} for {{when}}." },
    hi: { title: "बुकिंग पक्की हो गई", body: "{{provider}} ने {{when}} के लिए आपकी बुकिंग {{ref}} पक्की कर दी है।" },
  },
  "booking.cancelled.customer": {
    en: { title: "Booking cancelled", body: "Booking {{ref}} for {{when}} was cancelled. {{reason}}" },
    hi: { title: "बुकिंग रद्द", body: "{{when}} की बुकिंग {{ref}} रद्द कर दी गई है। {{reason}}" },
  },
  "booking.cancelled.partner": {
    en: { title: "Booking cancelled", body: "Booking {{ref}} ({{service}}, {{when}}) was cancelled by the customer." },
    hi: { title: "बुकिंग रद्द", body: "ग्राहक ने बुकिंग {{ref}} ({{service}}, {{when}}) रद्द कर दी है।" },
  },
  "booking.rescheduled.customer": {
    en: { title: "Booking time changed", body: "Booking {{ref}} is now on {{when}}." },
    hi: { title: "बुकिंग का समय बदला", body: "बुकिंग {{ref}} अब {{when}} को है।" },
  },
  "booking.rescheduled.partner": {
    en: { title: "Booking time changed", body: "Booking {{ref}} ({{service}}) moved to {{when}}." },
    hi: { title: "बुकिंग का समय बदला", body: "बुकिंग {{ref}} ({{service}}) अब {{when}} को है।" },
  },
  "booking.completed.customer": {
    en: { title: "How was your visit?", body: "Your {{service}} with {{provider}} is complete. You can rate your experience in My Bookings." },
    hi: { title: "आपका अनुभव कैसा रहा?", body: "{{provider}} के साथ आपकी {{service}} पूरी हो गई। आप 'मेरी बुकिंग' में रेटिंग दे सकते हैं।" },
  },
  "application.status.partner": {
    en: { title: "Application update", body: "Your Saj Saathi partner application is now: {{status}}. {{note}}" },
    hi: { title: "आवेदन की स्थिति", body: "आपके साझेदार आवेदन की नई स्थिति: {{status}}। {{note}}" },
  },
  "payment.captured.customer": {
    en: { title: "Payment received", body: "We received {{amount}} for booking {{ref}}." },
    hi: { title: "भुगतान मिल गया", body: "बुकिंग {{ref}} के लिए {{amount}} का भुगतान मिल गया है।" },
  },
  "refund.processed.customer": {
    en: { title: "Refund started", body: "A refund of {{amount}} for booking {{ref}} has been started. Banks usually take 5–7 working days." },
    hi: { title: "रिफंड शुरू", body: "बुकिंग {{ref}} के लिए {{amount}} का रिफंड शुरू कर दिया गया है। बैंक में आमतौर पर 5–7 कार्य दिवस लगते हैं।" },
  },
};

export function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "").replace(/\s+/g, " ").trim();
}

/** Marketing consent is required for promotional sends; transactional booking messages are sent where the channel is configured. */
export async function notify(ctx: Ctx, userId: string, key: string, vars: Record<string, string>, link?: string, opts: { marketing?: boolean } = {}): Promise<NotificationDoc | null> {
  const user = await ctx.repo.col<User>("users").findOne({ _id: userId });
  if (!user) return null;
  const override = await ctx.repo.col<{ _id: string; key: string; en: { title: string; body: string }; hi?: { title: string; body: string }; active: boolean }>("templates").findOne({ key, active: true });
  const base = override ?? DEFAULT_TEMPLATES[key];
  if (!base) throw new Error(`Unknown notification template ${key}`);
  const lang = user.locale === "hi" && base.hi ? base.hi : base.en;
  const title = render(lang.title, vars), body = render(lang.body, vars);

  const channels: NotificationDoc["channels"] = [{ channel: "in_app", status: "delivered" }];
  for (const s of ctx.senders) {
    const consentKind = s.channel === "email" ? "marketing_email" : s.channel === "sms" ? "marketing_sms" : s.channel === "whatsapp" ? "marketing_whatsapp" : null;
    if (!s.configured) { channels.push({ channel: s.channel, status: "skipped_not_configured" }); continue; }
    if (opts.marketing && consentKind && !user.consents.some((c) => c.kind === consentKind && c.granted)) { channels.push({ channel: s.channel, status: "skipped_no_consent" }); continue; }
    if ((s.channel === "email" && !user.email) || ((s.channel === "sms" || s.channel === "whatsapp") && !user.phone)) continue;
    try {
      const r = await s.send({ email: user.email, phone: user.phone }, { subject: title, text: body, templateKey: key, locale: user.locale, vars });
      channels.push({ channel: s.channel, status: r.ok ? "sent" : "failed", providerMessageId: r.providerMessageId, error: r.error });
    } catch (e) {
      channels.push({ channel: s.channel, status: "failed", error: (e as Error).message.slice(0, 200) });
    }
  }
  const doc: NotificationDoc = { _id: newId(), userId, kind: key, title, body, link, read: false, channels, createdAt: ctx.now() };
  await ctx.repo.col<NotificationDoc>("notifications").insertOne(doc);
  if (ctx.afterNotify) await ctx.afterNotify({ userId, title, body, link }).catch(() => undefined);
  return doc;
}
