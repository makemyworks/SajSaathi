import { requirePartner } from "@/lib/core/partner";
import { api } from "@/lib/server/http";
export const DELETE = api(async ({ ctx, actor, params }) => ({ ok: await ctx.repo.col("blocks").deleteOne({ _id: params.id, providerId: requirePartner(actor).providerId }) }));
