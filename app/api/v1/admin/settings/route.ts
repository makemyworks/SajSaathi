import { audit } from "@/lib/core/context";
import { parse, v } from "@/lib/core/validate";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

const schema = v.object({
  bookingFeePaise: v.optional(v.number({ int: true, min: 0, max: 100000 })), bookingFeeTaxPercent: v.optional(v.number({ min: 0, max: 40 })), defaultCommissionPercent: v.optional(v.number({ min: 0, max: 60 })),
  supportEmail: v.optional(v.string({ max: 120 })), supportPhone: v.optional(v.string({ max: 20 })), maintenanceMessage: v.optional(v.string({ max: 300 })),
  brandName: v.optional(v.string({ max: 40 })), tagline: v.optional(v.string({ max: 80 })),
});
export const GET = api(async ({ ctx, actor }) => { await admin(ctx, actor, "settings.manage"); return { settings: await ctx.repo.col("settings").findOne({ _id: "platform" }) }; });
export const PATCH = api(async ({ req, ctx, actor }) => {
  const a = await admin(ctx, actor, "settings.manage");
  const b = parse(schema, await body(req));
  const s = await ctx.repo.col("settings").updateOne({ _id: "platform" }, { $set: { ...b, updatedAt: ctx.now() } });
  await audit(ctx, a, "settings.update", "settings", "platform", b);
  return { settings: s };
});
