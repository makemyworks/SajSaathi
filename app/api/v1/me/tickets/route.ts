import { openTicket } from "@/lib/core/community";
import type { SupportTicket } from "@/lib/core/types";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";

const schema = v.object({ subject: v.string({ min: 3, max: 140 }), category: v.enum(["booking", "payment", "account", "safety", "partner", "other"] as const), text: v.string({ min: 5, max: 4000 }), bookingId: v.optional(v.id()) });
export const GET = api(async ({ ctx, actor }) => ({ tickets: await ctx.repo.col<SupportTicket>("tickets").find({ userId: needLogin(actor).userId }, { sort: { updatedAt: -1 }, limit: 50 }) }));
export const POST = api(async ({ req, ctx, actor }) => ({ ticket: await openTicket(ctx, needLogin(actor), parse(schema, await body(req))) }));
