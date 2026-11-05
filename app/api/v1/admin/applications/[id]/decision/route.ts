import { reviewApplication } from "@/lib/core/partner";
import { parse, v } from "@/lib/core/validate";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
const schema = v.object({ status: v.enum(["under_review", "documents_required", "approved", "rejected", "suspended"] as const), note: v.optional(v.string({ max: 600 })) });
export const POST = api(async ({ req, ctx, actor, params }) => {
  const a = await admin(ctx, actor, "applications.review");
  const b = parse(schema, await body(req));
  await reviewApplication(ctx, a, params.id, b.status, b.note);
  return { ok: true };
});
