import { decideRefund } from "@/lib/core/payments";
import { parse, v } from "@/lib/core/validate";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const POST = api(async ({ req, ctx, actor, params }) => {
  const a = await admin(ctx, actor, "refunds.manage");
  const b = parse(v.object({ decision: v.enum(["approve", "reject"] as const), amountPaise: v.optional(v.number({ int: true, min: 1 })) }), await body(req));
  await decideRefund(ctx, a, params.id, b.decision, b.amountPaise);
  return { ok: true };
});
