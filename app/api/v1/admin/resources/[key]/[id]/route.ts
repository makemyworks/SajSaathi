import { coerceAdminPayload, getResource } from "@/lib/core/admin-resources";
import { audit } from "@/lib/core/context";
import { recomputeRating } from "@/lib/core/community";
import { AppError, notFound } from "@/lib/core/util";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

export const GET = api(async ({ ctx, actor, params }) => {
  const r = getResource(params.key);
  await admin(ctx, actor, r.view);
  const row = await ctx.repo.col<{ _id: string }>(r.collection).findOne({ _id: params.id, ...(r.baseFilter ?? {}) });
  if (!row) throw notFound();
  const d = { ...(row as Record<string, unknown>) }; for (const h of r.hidden ?? []) delete d[h];
  return { row: d };
});

export const PATCH = api(async ({ req, ctx, actor, params }) => {
  const r = getResource(params.key);
  if (!r.manage) throw new AppError(405, "read_only", "This section is read-only");
  const a = await admin(ctx, actor, r.manage);
  const data = coerceAdminPayload(r, await body(req, 200_000), false);
  if (r.key === "admins" && params.id === a.userId && (data.status === "disabled" || (data.adminRole && data.adminRole !== a.adminRole))) throw new AppError(400, "self", "You can't disable yourself or change your own role");
  const set: Record<string, unknown> = { updatedAt: ctx.now() }; const unset: Record<string, ""> = {};
  for (const [k, v] of Object.entries(data)) { if (v === undefined) unset[k] = ""; else set[k] = v; }
  const row = await ctx.repo.col<{ _id: string; providerId?: string }>(r.collection).updateOne({ _id: params.id, ...(r.baseFilter ?? {}) }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  if (!row) throw notFound();
  if (r.collection === "reviews" && row.providerId) await recomputeRating(ctx, row.providerId);
  if ((r.key === "customers" || r.key === "admins") && data.status === "disabled") await ctx.repo.col("sessions").deleteMany({ userId: params.id });
  await audit(ctx, a, `${r.key}.update`, r.collection, params.id, { fields: Object.keys(data) });
  const d = { ...(row as Record<string, unknown>) }; for (const h of r.hidden ?? []) delete d[h];
  return { row: d };
});

export const DELETE = api(async ({ ctx, actor, params }) => {
  const r = getResource(params.key);
  if (!r.canDelete || !r.manage) throw new AppError(405, "not_allowed", "Items can't be deleted here");
  const a = await admin(ctx, actor, r.manage);
  const ok = await ctx.repo.col<{ _id: string }>(r.collection).deleteOne({ _id: params.id, ...(r.baseFilter ?? {}) });
  await audit(ctx, a, `${r.key}.delete`, r.collection, params.id);
  return { ok };
});
