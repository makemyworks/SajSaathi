import { requirePartner, upsertService } from "@/lib/core/partner";
import type { Service } from "@/lib/core/types";
import { api, body } from "@/lib/server/http";
export const PATCH = api(async ({ req, ctx, actor, params }) => ({ service: await upsertService(ctx, actor, { ...(await body<Partial<Service>>(req)), _id: params.id }) }));
/** Services with bookings are deactivated rather than deleted, so history stays intact. */
export const DELETE = api(async ({ ctx, actor, params }) => {
  const a = requirePartner(actor, true);
  const used = await ctx.repo.col("bookings").count({ serviceId: params.id });
  if (used) { await ctx.repo.col<Service>("services").updateOne({ _id: params.id, providerId: a.providerId }, { $set: { active: false } }); return { deactivated: true }; }
  return { deleted: await ctx.repo.col<Service>("services").deleteOne({ _id: params.id, providerId: a.providerId }) };
});
