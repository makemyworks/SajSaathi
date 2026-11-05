import type { Provider } from "@/lib/core/types";
import { api, query } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ req, ctx, actor }) => {
  await admin(ctx, actor, "applications.review");
  const status = query(req).get("status");
  const filter = status ? { status } : { status: { $in: ["submitted", "under_review", "documents_required"] } };
  const rows = await ctx.repo.col<Provider>("providers").find(filter, { sort: { updatedAt: 1 }, limit: 200 });
  return { applications: rows.map((p) => ({ id: p._id, name: p.businessName, kind: p.kind, city: p.address.city, status: p.status, categoryIds: p.categoryIds, updatedAt: p.updatedAt })) };
});
