import { addTicketMessage } from "@/lib/core/community";
import type { SupportTicket } from "@/lib/core/types";
import { parse, v } from "@/lib/core/validate";
import { notFound } from "@/lib/core/util";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ ctx, actor, params }) => { await admin(ctx, actor, "support.manage"); const t = await ctx.repo.col<SupportTicket>("tickets").findOne({ _id: params.id }); if (!t) throw notFound(); return { ticket: t }; });
export const POST = api(async ({ req, ctx, actor, params }) => {
  const a = await admin(ctx, actor, "support.manage");
  const b = parse(v.object({ text: v.string({ min: 1, max: 4000 }), status: v.optional(v.enum(["open", "pending", "resolved", "closed"] as const)) }), await body(req));
  return { ticket: await addTicketMessage(ctx, a, params.id, b.text, b.status) };
});
