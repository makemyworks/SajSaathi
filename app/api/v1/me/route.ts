import type { User } from "@/lib/core/types";
import { parse, v } from "@/lib/core/validate";
import { LEGAL_VERSION, publicUser } from "@/lib/core/auth";
import { badRequest } from "@/lib/core/util";
import { api, body, needLogin } from "@/lib/server/http";

const schema = v.object({ name: v.optional(v.string({ min: 2, max: 80 })), email: v.optional(v.string({ max: 120, lower: true })), locale: v.optional(v.enum(["en", "hi"] as const)), marketing: v.optional(v.boolean()) });
export const PATCH = api(async ({ req, ctx, actor }) => {
  const a = needLogin(actor);
  const b = parse(schema, await body(req));
  const set: Record<string, unknown> = { updatedAt: ctx.now() };
  if (b.name) set.name = b.name;
  if (b.locale) set.locale = b.locale;
  if (b.email) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw badRequest("Enter a valid email"); set.email = b.email; }
  const users = ctx.repo.col<User>("users");
  let u = await users.updateOne({ _id: a.userId }, { $set: set });
  if (b.marketing !== undefined && u) {
    const others = u.consents.filter((c) => !c.kind.startsWith("marketing_"));
    const now = ctx.now();
    const marketing = (["marketing_email", "marketing_sms", "marketing_whatsapp"] as const).map((kind) => ({ kind, version: LEGAL_VERSION, granted: b.marketing!, at: now }));
    u = await users.updateOne({ _id: a.userId }, { $set: { consents: [...others, ...marketing] } });
  }
  return { user: u ? publicUser(u) : null };
});
