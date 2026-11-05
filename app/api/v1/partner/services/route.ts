import { requirePartner, upsertService } from "@/lib/core/partner";
import type { Service } from "@/lib/core/types";
import { api, body } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => ({ services: await ctx.repo.col<Service>("services").find({ providerId: requirePartner(actor).providerId }, { sort: { createdAt: 1 } }) }));
export const POST = api(async ({ req, ctx, actor }) => { const b = await body<Partial<Service>>(req); delete b._id; return { service: await upsertService(ctx, actor, b) }; });
