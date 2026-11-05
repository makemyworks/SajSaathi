import { requirePartner, upsertStaff } from "@/lib/core/partner";
import type { Staff } from "@/lib/core/types";
import { api, body } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => ({ staff: await ctx.repo.col<Staff>("staff").find({ providerId: requirePartner(actor).providerId }, { sort: { name: 1 } }) }));
export const POST = api(async ({ req, ctx, actor }) => { const b = await body<Partial<Staff>>(req); delete b._id; return { staff: await upsertStaff(ctx, actor, b) }; });
