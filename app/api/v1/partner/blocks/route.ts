import { addBlock, requirePartner } from "@/lib/core/partner";
import { parse, v } from "@/lib/core/validate";
import { api, body } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => ({ blocks: await ctx.repo.col<{ _id: string }>("blocks").find({ providerId: requirePartner(actor).providerId, end: { $gte: ctx.now() } }, { sort: { start: 1 } }) }));
export const POST = api(async ({ req, ctx, actor }) => ({ block: await addBlock(ctx, actor, parse(v.object({ start: v.string(), end: v.string(), staffId: v.optional(v.id()), reason: v.optional(v.string({ max: 120 })) }), await body(req))) }));
